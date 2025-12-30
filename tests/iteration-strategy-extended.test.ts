import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StrategyExecutor, IterationStrategyFactory, IterationStrategy, StrategyState, ToolUsagePolicy } from '../src/iteration-strategy';
import { ConversationBuilder } from '../src/conversation';
import { ToolRegistry } from '../src/tools';
import type { LLMClient } from '../src/iteration-strategy';

describe('Iteration Strategy Extended Coverage', () => {
    let mockLLM: LLMClient;
    let tools: ToolRegistry;
    let conversation: ConversationBuilder;

    beforeEach(() => {
        mockLLM = {
            complete: vi.fn(async () => ({ content: 'Response', tool_calls: undefined }))
        };
        tools = ToolRegistry.create();
        conversation = ConversationBuilder.create();
    });

    describe('Depth First Strategy', () => {
        it('should backtrack on failures', async () => {
            const strategy = IterationStrategyFactory.depthFirst({
                maxDepth: 5,
                backtrackOnFailure: true
            });

            const executor = new StrategyExecutor(mockLLM);
            const state: StrategyState = {
                phase: 'test',
                iteration: 0,
                toolCallsExecuted: 0,
                startTime: Date.now(),
                insights: [],
                findings: [],
                errors: [new Error('1'), new Error('2'), new Error('3')], // > 2 errors
                toolFailures: new Map()
            };

            const shouldContinue = strategy.shouldContinue!(state);
            expect(shouldContinue).toBe(false);
        });

        it('should continue if few errors', async () => {
            const strategy = IterationStrategyFactory.depthFirst({
                maxDepth: 5,
                backtrackOnFailure: true
            });

            const state: any = { errors: [new Error('1')] };
            expect(strategy.shouldContinue!(state)).toBe(true);
        });
    });

    describe('Circuit Breaker', () => {
        it('should disable tool after consecutive failures', async () => {
            const strategy: IterationStrategy = {
                name: 'breaker',
                description: 'Test circuit breaker',
                maxIterations: 5,
                phases: [{
                    name: 'main',
                    maxIterations: 5,
                    toolUsage: 'encouraged',
                    maxConsecutiveToolFailures: 2 // Low threshold
                }]
            };

            const failingTool: any = {
                name: 'fail_tool',
                description: 'Fails',
                parameters: { type: 'object', properties: {} },
                execute: async () => { throw new Error('Fail'); }
            };
            tools.register(failingTool);

            // Mock LLM to keep requesting the failing tool
            mockLLM.complete = vi.fn().mockResolvedValue({
                content: null,
                tool_calls: [{
                    id: 'call_1',
                    type: 'function',
                    function: { name: 'fail_tool', arguments: '{}' }
                }]
            });

            const executor = new StrategyExecutor(mockLLM);
            const result = await executor.execute(conversation, tools, strategy);

            // It should try 2 times (threshold), then on 3rd attempt check breaker
            // Actually implementation checks BEFORE execution.
            // Iteration 1: Fail -> failures=1
            // Iteration 2: Fail -> failures=2
            // Iteration 3: Check failures >= 2 -> Breaker triggered -> Skip execution
            
            // We expect at least some tool calls to have been attempted
            // And eventually it might stop or continue without tool
            expect(result.totalIterations).toBeGreaterThanOrEqual(2);
            
            // Verify logs or result to see if breaker was triggered?
            // The executor logs warning. 
            // We can check if the tool returned a specific error message in conversation
            const messages = conversation.getMessages();
            const breakerMessage = messages.find(m => 
                m.role === 'tool' && m.content && (m.content as string).includes('temporarily disabled')
            );
            expect(breakerMessage).toBeDefined();
        });
    });

    describe('Adaptive Strategy', () => {
        it('should switch strategies based on custom conditions', async () => {
            // Testing the factory method logic for 'adaptive'
            const strategy = IterationStrategyFactory.adaptive();
            
            // Early stage
            const stateEarly: any = { iteration: 2, toolCallsExecuted: 0 };
            expect(await strategy.onIteration!(2, stateEarly)).toBe('continue');

            // Mid stage
            const stateMid: any = { iteration: 10, toolCallsExecuted: 2 };
            expect(await strategy.onIteration!(10, stateMid)).toBe('continue');

            // Late stage (success)
            const stateLateSuccess: any = { iteration: 18, toolCallsExecuted: 5 };
            expect(await strategy.onIteration!(18, stateLateSuccess)).toBe('continue');

            // Late stage (fail/stop)
            const stateLateFail: any = { iteration: 18, toolCallsExecuted: 0 };
            expect(await strategy.onIteration!(18, stateLateFail)).toBe('stop');
        });
    });

    describe('Reflection', () => {
        it('should generate reflection when enabled', async () => {
            const strategy = IterationStrategyFactory.simple({ maxIterations: 1 });
            const executor = new StrategyExecutor(mockLLM);
            
            executor.withReflection({
                enabled: true,
                format: 'markdown'
            });

            const result = await executor.execute(conversation, tools, strategy);
            expect(result.reflection).toBeDefined();
        });
    });
});

