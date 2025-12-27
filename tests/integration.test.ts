import { describe, it, expect, beforeEach } from 'vitest';
import { recipe, registerTemplates } from '../src/recipes';
import { ConversationBuilder } from '../src/conversation';
import { ToolRegistry } from '../src/tools';
import * as Formatter from '../src/formatter';
import type { Tool } from '../src/tools';
import type { ToolCall } from '../src/conversation';
import path from 'path';

describe('Integration: Conversation + Tools + Recipes', () => {
    const testBasePath = path.join(__dirname, 'fixtures');

    describe('Recipe with Tools', () => {
        let tools: Tool[];
        let registry: ToolRegistry;

        beforeEach(() => {
            tools = [
                {
                    name: 'get_file',
                    description: 'Read a file from the repository',
                    category: 'file-system',
                    cost: 'cheap',
                    parameters: {
                        type: 'object',
                        properties: {
                            path: { type: 'string', description: 'File path' }
                        },
                        required: ['path']
                    },
                    examples: [
                        {
                            scenario: 'Read a config file',
                            params: { path: 'config.json' },
                            expectedResult: 'File contents'
                        }
                    ],
                    execute: async ({ path }) => `Contents of ${path}`
                },
                {
                    name: 'search_code',
                    description: 'Search for code patterns',
                    category: 'analysis',
                    cost: 'moderate',
                    parameters: {
                        type: 'object',
                        properties: {
                            pattern: { type: 'string', description: 'Search pattern' }
                        },
                        required: ['pattern']
                    },
                    execute: async ({ pattern }) => `Found 3 matches for ${pattern}`
                }
            ];

            registry = ToolRegistry.create();
            registry.registerAll(tools);
        });

        it('should build conversation from recipe with tools', async () => {
            const conversation = await recipe(testBasePath)
                .persona({ content: 'You are a code analyst' })
                .tools(tools)
                .toolGuidance('auto')
                .content({ content: 'Analyze the codebase' })
                .buildConversation('gpt-4o');

            expect(conversation).toBeDefined();
            expect(conversation.getMessageCount()).toBeGreaterThan(0);

            const messages = conversation.getMessages();
            const userMessage = messages.find(m => m.role === 'user');
            expect(userMessage?.content).toContain('Available Tools');
            expect(userMessage?.content).toContain('get_file');
            expect(userMessage?.content).toContain('search_code');
        });

        it('should filter tools by category', async () => {
            const prompt = await recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .tools(tools)
                .toolCategories(['file-system'])
                .toolGuidance('auto')
                .cook();

            const formatted = Formatter.create().format(prompt.instructions);

            expect(formatted).toContain('get_file');
            expect(formatted).not.toContain('search_code');
        });

        it('should generate different guidance levels', async () => {
            const minimalPrompt = await recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .tools([tools[0]])
                .toolGuidance('minimal')
                .cook();

            const detailedPrompt = await recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .tools([tools[0]])
                .toolGuidance('detailed')
                .cook();

            const formatter = Formatter.create();
            const minimalText = formatter.format(minimalPrompt.instructions);
            const detailedText = formatter.format(detailedPrompt.instructions);

            expect(detailedText.length).toBeGreaterThan(minimalText.length);
            expect(detailedText).toContain('Parameters');
            expect(detailedText).toContain('Examples');
        });

        it('should use tool registry from recipe', async () => {
            const prompt = await recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .toolRegistry(registry)
                .toolGuidance('auto')
                .cook();

            const formatted = Formatter.create().format(prompt.instructions);
            expect(formatted).toContain('get_file');
        });

        it('should get tool registry from recipe builder', () => {
            const builder = recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .tools(tools);

            const extractedRegistry = builder.getToolRegistry();

            expect(extractedRegistry).toBeDefined();
            expect(extractedRegistry?.count()).toBe(2);
        });
    });

    describe('Complete Agentic Workflow', () => {
        it('should handle complete tool call cycle', async () => {
            const tools: Tool[] = [
                {
                    name: 'calculate',
                    description: 'Perform calculation',
                    parameters: {
                        type: 'object',
                        properties: {
                            operation: { type: 'string', description: 'Operation to perform' },
                            a: { type: 'number', description: 'First number' },
                            b: { type: 'number', description: 'Second number' }
                        },
                        required: ['operation', 'a', 'b']
                    },
                    execute: async ({ operation, a, b }) => {
                        switch (operation) {
                            case 'add': return a + b;
                            case 'multiply': return a * b;
                            default: throw new Error('Unknown operation');
                        }
                    }
                }
            ];

            const registry = ToolRegistry.create();
            registry.registerAll(tools);

            // Build initial conversation
            const conversation = await recipe(testBasePath)
                .persona({ content: 'You are a calculator assistant' })
                .toolRegistry(registry)
                .toolGuidance('auto')
                .content({ content: 'Calculate 5 + 3' })
                .buildConversation('gpt-4o');

            // Simulate LLM requesting tool call
            const toolCalls: ToolCall[] = [{
                id: 'call_123',
                type: 'function',
                function: {
                    name: 'calculate',
                    arguments: JSON.stringify({ operation: 'add', a: 5, b: 3 })
                }
            }];

            conversation.addAssistantWithToolCalls(null, toolCalls);

            // Execute tool
            const args = JSON.parse(toolCalls[0].function.arguments);
            const result = await registry.execute(toolCalls[0].function.name, args);

            // Add result back to conversation
            conversation.addToolResult(toolCalls[0].id, String(result));

            // Add final response
            conversation.addAssistantMessage('The result of 5 + 3 is 8.');

            // Verify complete cycle
            expect(conversation.getMessageCount()).toBeGreaterThan(3);
            expect(conversation.hasToolCalls()).toBe(true);

            const messages = conversation.getMessages();
            const toolMessage = messages.find(m => m.role === 'tool');
            expect(toolMessage?.content).toBe('8');
        });

        it('should handle multiple tool calls in sequence', async () => {
            const tools: Tool[] = [
                {
                    name: 'step1',
                    description: 'First step',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'step1 result'
                },
                {
                    name: 'step2',
                    description: 'Second step',
                    parameters: {
                        type: 'object',
                        properties: {
                            input: { type: 'string', description: 'Input from step 1' }
                        }
                    },
                    execute: async ({ input }) => `step2 with ${input}`
                }
            ];

            const registry = ToolRegistry.create();
            registry.registerAll(tools);

            const conversation = await recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .toolRegistry(registry)
                .toolGuidance('auto')
                .content({ content: 'Complete both steps' })
                .buildConversation('gpt-4o');

            // First tool call
            conversation.addAssistantWithToolCalls(null, [{
                id: 'call_1',
                type: 'function',
                function: { name: 'step1', arguments: '{}' }
            }]);

            const result1 = await registry.execute('step1', {});
            conversation.addToolResult('call_1', result1);

            // Second tool call
            conversation.addAssistantWithToolCalls(null, [{
                id: 'call_2',
                type: 'function',
                function: { name: 'step2', arguments: JSON.stringify({ input: result1 }) }
            }]);

            const result2 = await registry.execute('step2', { input: result1 });
            conversation.addToolResult('call_2', result2);

            conversation.addAssistantMessage('Both steps completed successfully.');

            expect(conversation.getMetadata().toolCallCount).toBe(2);

            const stats = registry.getUsageStats();
            expect(stats.get('step1')?.calls).toBe(1);
            expect(stats.get('step2')?.calls).toBe(1);
        });

        it('should handle tool execution errors gracefully', async () => {
            const tools: Tool[] = [
                {
                    name: 'failing_tool',
                    description: 'This tool fails',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => {
                        throw new Error('Tool execution failed');
                    }
                }
            ];

            const registry = ToolRegistry.create();
            registry.registerAll(tools);

            const conversation = await recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .toolRegistry(registry)
                .toolGuidance('auto')
                .buildConversation('gpt-4o');

            conversation.addAssistantWithToolCalls(null, [{
                id: 'call_fail',
                type: 'function',
                function: { name: 'failing_tool', arguments: '{}' }
            }]);

            // Execute tool and handle error
            try {
                await registry.execute('failing_tool', {});
            } catch (error) {
                conversation.addToolResult('call_fail', `Error: ${error}`);
            }

            const stats = registry.getUsageStats();
            expect(stats.get('failing_tool')?.failures).toBe(1);
        });
    });

    describe('Conversation Branching with Tools', () => {
        it('should create parallel branches with different tool contexts', async () => {
            const tools: Tool[] = [
                {
                    name: 'analyze',
                    description: 'Analyze something',
                    parameters: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', description: 'Analysis type' }
                        }
                    },
                    execute: async ({ type }) => `${type} analysis complete`
                }
            ];

            const registry = ToolRegistry.create();
            registry.registerAll(tools);

            // Base conversation
            const base = await recipe(testBasePath)
                .persona({ content: 'You are an analyst' })
                .toolRegistry(registry)
                .toolGuidance('auto')
                .content({ content: 'Analyze the system' })
                .buildConversation('gpt-4o');

            // Branch 1: Security analysis
            const securityBranch = base.clone();
            securityBranch.injectContext([{
                content: 'Focus on security vulnerabilities',
                title: 'Security Context'
            }]);

            // Branch 2: Performance analysis
            const performanceBranch = base.clone();
            performanceBranch.injectContext([{
                content: 'Focus on performance bottlenecks',
                title: 'Performance Context'
            }]);

            // Both branches should have different contexts
            expect(base.getMessageCount()).toBeLessThan(securityBranch.getMessageCount());
            expect(securityBranch.getMessages()).not.toEqual(performanceBranch.getMessages());
        });
    });

    describe('Tool Context with Conversation State', () => {
        it('should update tool context mid-conversation', async () => {
            let contextValue = 'initial';

            const tools: Tool[] = [
                {
                    name: 'get_context',
                    description: 'Get current context',
                    parameters: { type: 'object', properties: {} },
                    execute: async (params, ctx) => {
                        return ctx?.contextValue || 'no context';
                    }
                }
            ];

            const registry = ToolRegistry.create({ contextValue });
            registry.registerAll(tools);

            const result1 = await registry.execute('get_context', {});
            expect(result1).toBe('initial');

            // Update context
            registry.updateContext({ contextValue: 'updated' });

            const result2 = await registry.execute('get_context', {});
            expect(result2).toBe('updated');
        });
    });

    describe('Template System with Tools', () => {
        it('should use template with tools from recipe', async () => {
            const tools: Tool[] = [{
                name: 'read_code',
                description: 'Read code file',
                parameters: {
                    type: 'object',
                    properties: {
                        file: { type: 'string', description: 'File path' }
                    }
                },
                execute: async ({ file }) => `Code from ${file}`
            }];

            const conversation = await recipe(testBasePath)
                .persona({ content: 'You are a code analysis expert' })
                .instructions({ content: 'Analyze code for quality and issues' })
                .tools(tools)
                .toolGuidance('auto')
                .content({ content: 'Analyze main.ts' })
                .buildConversation('gpt-4o');

            const messages = conversation.getMessages();
            const userMessage = messages.find(m => m.role === 'user');

            // Tool guidance should be in the user message
            expect(userMessage?.content).toContain('read_code');
        });
    });

    describe('Serialization with Tools', () => {
        it('should serialize and restore conversation with tool calls', async () => {
            const tools: Tool[] = [
                {
                    name: 'test_tool',
                    description: 'Test',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'result'
                }
            ];

            const conversation = await recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .tools(tools)
                .toolGuidance('auto')
                .buildConversation('gpt-4o');

            conversation.addAssistantWithToolCalls(null, [{
                id: 'call_123',
                type: 'function',
                function: { name: 'test_tool', arguments: '{}' }
            }]);

            conversation.addToolResult('call_123', 'result');

            // Serialize
            const json = conversation.toJSON();

            // Restore
            const restored = ConversationBuilder.fromJSON(json);

            expect(restored.getMessageCount()).toBe(conversation.getMessageCount());
            expect(restored.hasToolCalls()).toBe(true);

            const messages = restored.getMessages();
            const toolCall = messages.find(m => m.tool_calls);
            expect(toolCall?.tool_calls![0].function.name).toBe('test_tool');
        });
    });

    describe('OpenAI Format Integration', () => {
        it('should export conversation in OpenAI-compatible format with tools', async () => {
            const tools: Tool[] = [
                {
                    name: 'test_tool',
                    description: 'A test tool',
                    parameters: {
                        type: 'object',
                        properties: {
                            param: { type: 'string', description: 'A parameter' }
                        }
                    },
                    execute: async () => 'result'
                }
            ];

            const registry = ToolRegistry.create();
            registry.registerAll(tools);

            const conversation = await recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .toolRegistry(registry)
                .toolGuidance('auto')
                .buildConversation('gpt-4o');

            // Get messages in OpenAI format
            const messages = conversation.toMessages();

            // Get tools in OpenAI format
            const openAITools = registry.toOpenAIFormat();

            // This would be passed to OpenAI API
            const apiRequest = {
                model: 'gpt-4o',
                messages: messages,
                tools: openAITools
            };

            expect(apiRequest.messages).toBeDefined();
            expect(apiRequest.tools).toHaveLength(1);
            expect(apiRequest.tools[0].type).toBe('function');
        });
    });

    describe('Tool Guidance Generation', () => {
        it('should generate adaptive guidance based on tool complexity', async () => {
            const simpleTools: Tool[] = [
                {
                    name: 'simple',
                    description: 'Simple tool',
                    cost: 'cheap',
                    parameters: {
                        type: 'object',
                        properties: {
                            input: { type: 'string', description: 'Input' }
                        }
                    },
                    execute: async () => 'result'
                }
            ];

            const complexTools: Tool[] = [
                {
                    name: 'complex',
                    description: 'Complex tool',
                    cost: 'expensive',
                    parameters: {
                        type: 'object',
                        properties: {
                            param1: { type: 'string', description: 'Param 1' },
                            param2: { type: 'string', description: 'Param 2' },
                            param3: { type: 'string', description: 'Param 3' },
                            param4: { type: 'string', description: 'Param 4' },
                            param5: { type: 'string', description: 'Param 5' },
                            param6: { type: 'string', description: 'Param 6' }
                        }
                    },
                    execute: async () => 'result'
                }
            ];

            const simplePrompt = await recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .tools(simpleTools)
                .toolGuidance('auto')
                .cook();

            const complexPrompt = await recipe(testBasePath)
                .persona({ content: 'You are helpful' })
                .tools(complexTools)
                .toolGuidance('auto')
                .cook();

            const formatter = Formatter.create();
            const simpleText = formatter.format(simplePrompt.instructions);
            const complexText = formatter.format(complexPrompt.instructions);

            // Both should contain tool information
            expect(simpleText).toContain('simple');
            expect(complexText).toContain('complex');
            expect(complexText).toContain('param1');
        });
    });
});

