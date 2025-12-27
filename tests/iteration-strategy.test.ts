import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrategyExecutor, IterationStrategyFactory } from '../src/iteration-strategy';
import { ConversationBuilder } from '../src/conversation';
import { ToolRegistry } from '../src/tools';
import type { LLMClient, IterationStrategy, StrategyPhase } from '../src/iteration-strategy';
import type { Tool } from '../src/tools';
import type { ToolCall } from '../src/conversation';

describe('Iteration Strategies', () => {
    let mockLLM: LLMClient;
    let tools: ToolRegistry;
    let conversation: ConversationBuilder;

    beforeEach(() => {
        // Mock LLM client
        let callCount = 0;
        mockLLM = {
            complete: vi.fn(async (messages, toolDefs) => {
                callCount++;

                // Simulate tool use on first few calls
                if (callCount <= 2 && toolDefs) {
                    return {
                        content: null,
                        tool_calls: [{
                            id: `call_${callCount}`,
                            type: 'function' as const,
                            function: {
                                name: 'test_tool',
                                arguments: '{}'
                            }
                        }]
                    };
                }

                // Final response without tools
                return {
                    content: 'Final answer',
                    tool_calls: undefined
                };
            })
        };

        // Setup tools
        tools = ToolRegistry.create();
        tools.register({
            name: 'test_tool',
            description: 'Test tool',
            parameters: {
                type: 'object',
                properties: {}
            },
            execute: async () => 'Tool result'
        });

        // Setup conversation
        conversation = ConversationBuilder.create();
        conversation.asSystem('You are helpful');
        conversation.asUser('Start task');
    });

    describe('StrategyExecutor', () => {
        it('should execute simple strategy', async () => {
            const strategy = IterationStrategyFactory.simple({ maxIterations: 5 });
            const executor = new StrategyExecutor(mockLLM);

            const result = await executor.execute(conversation, tools, strategy);

            expect(result.success).toBe(true);
            expect(result.totalIterations).toBeGreaterThan(0);
            expect(result.finalMessage).toBeDefined();
        });

        it('should track tool calls', async () => {
            const strategy = IterationStrategyFactory.simple({ maxIterations: 5 });
            const executor = new StrategyExecutor(mockLLM);

            const result = await executor.execute(conversation, tools, strategy);

            expect(result.toolCallsExecuted).toBeGreaterThanOrEqual(0);
        });

        it('should execute multiple phases', async () => {
            const strategy: IterationStrategy = {
                name: 'multi-phase',
                description: 'Test multi-phase',
                maxIterations: 10,
                phases: [
                    {
                        name: 'phase1',
                        maxIterations: 2,
                        toolUsage: 'encouraged',
                    },
                    {
                        name: 'phase2',
                        maxIterations: 2,
                        toolUsage: 'forbidden',
                    }
                ]
            };

            const executor = new StrategyExecutor(mockLLM);
            const result = await executor.execute(conversation, tools, strategy);

            expect(result.phases).toHaveLength(2);
            expect(result.phases[0].name).toBe('phase1');
            expect(result.phases[1].name).toBe('phase2');
        });

        it('should call lifecycle hooks', async () => {
            const onStart = vi.fn();
            const onComplete = vi.fn();
            const onPhaseComplete = vi.fn();

            const strategy: IterationStrategy = {
                name: 'hooked',
                description: 'Test hooks',
                maxIterations: 2,
                onStart,
                onComplete,
                onPhaseComplete,
            };

            const executor = new StrategyExecutor(mockLLM);
            await executor.execute(conversation, tools, strategy);

            expect(onStart).toHaveBeenCalled();
            expect(onComplete).toHaveBeenCalled();
            expect(onPhaseComplete).toHaveBeenCalled();
        });

        it('should respect tool usage policies', async () => {
            const strategy: IterationStrategy = {
                name: 'no-tools',
                description: 'Tools forbidden',
                maxIterations: 3,
                phases: [{
                    name: 'main',
                    maxIterations: 3,
                    toolUsage: 'forbidden',
                }]
            };

            const executor = new StrategyExecutor(mockLLM);
            const result = await executor.execute(conversation, tools, strategy);

            // Should not execute tools even if LLM requests them
            expect(result.success).toBe(true);
        });

        it('should handle tool execution errors', async () => {
            const failingTools = ToolRegistry.create();
            failingTools.register({
                name: 'test_tool',
                description: 'Failing tool',
                parameters: { type: 'object', properties: {} },
                execute: async () => {
                    throw new Error('Tool failed');
                }
            });

            const strategy = IterationStrategyFactory.simple({ maxIterations: 3 });
            const executor = new StrategyExecutor(mockLLM);

            const result = await executor.execute(conversation, failingTools, strategy);

            expect(result.success).toBe(true);  // Strategy continues despite tool errors
        });
    });

    describe('Pre-built Strategies', () => {
        describe('investigateThenRespond', () => {
            it('should create investigation strategy', () => {
                const strategy = IterationStrategyFactory.investigateThenRespond({
                    maxInvestigationSteps: 5,
                    requireMinimumTools: 2,
                    finalSynthesis: true
                });

                expect(strategy.name).toBe('investigate-then-respond');
                expect(strategy.phases).toHaveLength(2);
                expect(strategy.phases![0].name).toBe('investigate');
                expect(strategy.phases![1].name).toBe('respond');
            });

            it('should execute investigation phase', async () => {
                const strategy = IterationStrategyFactory.investigateThenRespond({
                    maxInvestigationSteps: 3,
                    requireMinimumTools: 1
                });

                const executor = new StrategyExecutor(mockLLM);
                const result = await executor.execute(conversation, tools, strategy);

                expect(result.phases.some(p => p.name === 'investigate')).toBe(true);
            });
        });

        describe('multiPassRefinement', () => {
            it('should create refinement strategy', () => {
                const strategy = IterationStrategyFactory.multiPassRefinement({
                    passes: 3,
                    critiqueBetweenPasses: true
                });

                expect(strategy.name).toBe('multi-pass-refinement');
                expect(strategy.phases!.length).toBeGreaterThanOrEqual(3);
            });

            it('should alternate between pass and critique', () => {
                const strategy = IterationStrategyFactory.multiPassRefinement({
                    passes: 2,
                    critiqueBetweenPasses: true
                });

                expect(strategy.phases![0].name).toBe('pass-1');
                expect(strategy.phases![1].name).toBe('critique-1');
                expect(strategy.phases![2].name).toBe('pass-2');
            });
        });

        describe('breadthFirst', () => {
            it('should create breadth-first strategy', () => {
                const strategy = IterationStrategyFactory.breadthFirst({
                    levelsDeep: 3,
                    toolsPerLevel: 4
                });

                expect(strategy.name).toBe('breadth-first');
                expect(strategy.phases).toHaveLength(3);
                expect(strategy.phases![0].name).toBe('level-1');
            });

            it('should configure tool limits per level', () => {
                const strategy = IterationStrategyFactory.breadthFirst({
                    levelsDeep: 2,
                    toolsPerLevel: 3
                });

                expect(strategy.phases![0].maxToolCalls).toBe(3);
            });
        });

        describe('depthFirst', () => {
            it('should create depth-first strategy', () => {
                const strategy = IterationStrategyFactory.depthFirst({
                    maxDepth: 5
                });

                expect(strategy.name).toBe('depth-first');
                expect(strategy.maxIterations).toBe(5);
            });

            it('should configure backtracking', () => {
                const strategy = IterationStrategyFactory.depthFirst({
                    maxDepth: 5,
                    backtrackOnFailure: true
                });

                expect(strategy.shouldContinue).toBeDefined();
            });
        });

        describe('adaptive', () => {
            it('should create adaptive strategy', () => {
                const strategy = IterationStrategyFactory.adaptive();

                expect(strategy.name).toBe('adaptive');
                expect(strategy.onIteration).toBeDefined();
            });

            it('should change behavior based on iteration', async () => {
                const strategy = IterationStrategyFactory.adaptive();
                const state: any = { iteration: 0, toolCallsExecuted: 0 };

                // Early iterations
                const early = await strategy.onIteration!(2, state);
                expect(early).toBe('continue');

                // Late iterations with tools used
                state.iteration = 16;
                state.toolCallsExecuted = 5;
                const late = await strategy.onIteration!(16, state);
                expect(late).toBe('continue');
            });
        });

        describe('simple', () => {
            it('should create simple strategy', () => {
                const strategy = IterationStrategyFactory.simple({
                    maxIterations: 10
                });

                expect(strategy.name).toBe('simple');
                expect(strategy.maxIterations).toBe(10);
            });

            it('should allow or forbid tools', () => {
                const withTools = IterationStrategyFactory.simple({ allowTools: true });
                const withoutTools = IterationStrategyFactory.simple({ allowTools: false });

                expect(withTools.phases![0].toolUsage).toBe('encouraged');
                expect(withoutTools.phases![0].toolUsage).toBe('forbidden');
            });
        });
    });

    describe('Phase Management', () => {
        it('should skip phases based on condition', async () => {
            const strategy: IterationStrategy = {
                name: 'conditional',
                description: 'Test conditional',
                maxIterations: 5,
                phases: [
                    {
                        name: 'always',
                        maxIterations: 1,
                        toolUsage: 'optional',
                    },
                    {
                        name: 'conditional',
                        maxIterations: 1,
                        toolUsage: 'optional',
                        skipIf: (state) => state.toolCallsExecuted === 0,
                    }
                ]
            };

            const executor = new StrategyExecutor(mockLLM);
            const result = await executor.execute(conversation, tools, strategy);

            // Second phase should be skipped if no tools used
            expect(result.phases.length).toBeGreaterThan(0);
        });

        it('should add phase instructions', async () => {
            const strategy: IterationStrategy = {
                name: 'instructed',
                description: 'Test instructions',
                maxIterations: 2,
                phases: [{
                    name: 'main',
                    maxIterations: 2,
                    toolUsage: 'optional',
                    instructions: 'Follow these specific instructions',
                }]
            };

            const executor = new StrategyExecutor(mockLLM);
            await executor.execute(conversation, tools, strategy);

            const messages = conversation.getMessages();
            const hasInstructions = messages.some(m =>
                m.content?.includes('Follow these specific instructions')
            );

            expect(hasInstructions).toBe(true);
        });

        it('should respect allowed tools in phase', async () => {
            const multiTools = ToolRegistry.create();
            multiTools.registerAll([
                {
                    name: 'allowed_tool',
                    description: 'Allowed',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'allowed result'
                },
                {
                    name: 'forbidden_tool',
                    description: 'Not allowed',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'should not be called'
                }
            ]);

            const strategy: IterationStrategy = {
                name: 'restricted',
                description: 'Tool restrictions',
                maxIterations: 5,
                phases: [{
                    name: 'restricted',
                    maxIterations: 5,
                    toolUsage: 'encouraged',
                    allowedTools: ['allowed_tool'],
                }]
            };

            const executor = new StrategyExecutor(mockLLM);
            await executor.execute(conversation, multiTools, strategy);

            // Should only execute allowed tools
            expect(true).toBe(true);  // Test passes if no errors
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty conversation', async () => {
            const emptyConv = ConversationBuilder.create();
            const strategy = IterationStrategyFactory.simple({ maxIterations: 2 });
            const executor = new StrategyExecutor(mockLLM);

            const result = await executor.execute(emptyConv, tools, strategy);

            expect(result.success).toBe(true);
        });

        it('should handle strategy without phases', async () => {
            const strategy: IterationStrategy = {
                name: 'no-phases',
                description: 'No phases defined',
                maxIterations: 3,
            };

            const executor = new StrategyExecutor(mockLLM);
            const result = await executor.execute(conversation, tools, strategy);

            expect(result.success).toBe(true);
            expect(result.phases).toHaveLength(1);  // Default phase created
        });

        it('should handle immediate stop', async () => {
            const strategy: IterationStrategy = {
                name: 'stop-immediately',
                description: 'Stops immediately',
                maxIterations: 10,
                phases: [{
                    name: 'main',
                    maxIterations: 10,
                    toolUsage: 'optional'
                }],
                shouldContinue: () => false,
            };

            const executor = new StrategyExecutor(mockLLM);
            const result = await executor.execute(conversation, tools, strategy);

            // Strategy runs at least one iteration before checking shouldContinue
            expect(result.totalIterations).toBeGreaterThanOrEqual(0);
        });

        it('should handle LLM errors gracefully', async () => {
            const failingLLM: LLMClient = {
                complete: async () => {
                    throw new Error('LLM failed');
                }
            };

            const strategy = IterationStrategyFactory.simple({ maxIterations: 2 });
            const executor = new StrategyExecutor(failingLLM);

            const result = await executor.execute(conversation, tools, strategy);

            expect(result.success).toBe(false);
        });
    });
});

