import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolRegistry } from '../src/tools';
import type { Tool, ToolContext } from '../src/tools';

describe('ToolRegistry', () => {
    describe('Creation and Registration', () => {
        let registry: ToolRegistry;

        beforeEach(() => {
            registry = ToolRegistry.create();
        });

        it('should create a new registry', () => {
            expect(registry).toBeDefined();
            expect(registry.count()).toBe(0);
        });

        it('should register a tool', () => {
            const tool: Tool = {
                name: 'test_tool',
                description: 'A test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        input: { type: 'string', description: 'Test input' }
                    },
                    required: ['input']
                },
                execute: async (params) => `Received: ${params.input}`
            };

            registry.register(tool);

            expect(registry.count()).toBe(1);
            expect(registry.has('test_tool')).toBe(true);
        });

        it('should register multiple tools', () => {
            const tools: Tool[] = [
                {
                    name: 'tool1',
                    description: 'First tool',
                    parameters: {
                        type: 'object',
                        properties: {}
                    },
                    execute: async () => 'result1'
                },
                {
                    name: 'tool2',
                    description: 'Second tool',
                    parameters: {
                        type: 'object',
                        properties: {}
                    },
                    execute: async () => 'result2'
                }
            ];

            registry.registerAll(tools);

            expect(registry.count()).toBe(2);
            expect(registry.has('tool1')).toBe(true);
            expect(registry.has('tool2')).toBe(true);
        });

        it('should overwrite tool with same name', () => {
            const tool1: Tool = {
                name: 'duplicate',
                description: 'First',
                parameters: { type: 'object', properties: {} },
                execute: async () => 'first'
            };

            const tool2: Tool = {
                name: 'duplicate',
                description: 'Second',
                parameters: { type: 'object', properties: {} },
                execute: async () => 'second'
            };

            registry.register(tool1);
            registry.register(tool2);

            expect(registry.count()).toBe(1);
            const tool = registry.get('duplicate');
            expect(tool?.description).toBe('Second');
        });

        it('should validate tool on registration', () => {
            const invalidTool = {
                name: '',
                description: 'Invalid',
                parameters: { type: 'object', properties: {} },
                execute: async () => 'result'
            } as Tool;

            expect(() => registry.register(invalidTool)).toThrow();
        });
    });

    describe('Tool Retrieval', () => {
        let registry: ToolRegistry;
        let testTools: Tool[];

        beforeEach(() => {
            registry = ToolRegistry.create();
            testTools = [
                {
                    name: 'file_read',
                    description: 'Read a file',
                    category: 'file-system',
                    cost: 'cheap',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'file content'
                },
                {
                    name: 'api_call',
                    description: 'Make API call',
                    category: 'network',
                    cost: 'expensive',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'api response'
                },
                {
                    name: 'file_write',
                    description: 'Write a file',
                    category: 'file-system',
                    cost: 'moderate',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'written'
                }
            ];
            registry.registerAll(testTools);
        });

        it('should get tool by name', () => {
            const tool = registry.get('file_read');

            expect(tool).toBeDefined();
            expect(tool?.name).toBe('file_read');
            expect(tool?.description).toBe('Read a file');
        });

        it('should return undefined for non-existent tool', () => {
            const tool = registry.get('non_existent');

            expect(tool).toBeUndefined();
        });

        it('should get all tools', () => {
            const allTools = registry.getAll();

            expect(allTools).toHaveLength(3);
        });

        it('should get tools by category', () => {
            const fileTools = registry.getByCategory('file-system');

            expect(fileTools).toHaveLength(2);
            expect(fileTools.every(t => t.category === 'file-system')).toBe(true);
        });

        it('should check if tool exists', () => {
            expect(registry.has('file_read')).toBe(true);
            expect(registry.has('non_existent')).toBe(false);
        });

        it('should get categories', () => {
            const categories = registry.getCategories();

            expect(categories).toContain('file-system');
            expect(categories).toContain('network');
            expect(categories).toHaveLength(2);
        });
    });

    describe('Tool Execution', () => {
        let registry: ToolRegistry;

        beforeEach(() => {
            registry = ToolRegistry.create();
        });

        it('should execute a tool', async () => {
            const tool: Tool = {
                name: 'echo',
                description: 'Echo input',
                parameters: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'Message' }
                    }
                },
                execute: async (params) => `Echo: ${params.message}`
            };

            registry.register(tool);

            const result = await registry.execute('echo', { message: 'Hello' });

            expect(result).toBe('Echo: Hello');
        });

        it('should throw error for non-existent tool', async () => {
            await expect(registry.execute('non_existent', {}))
                .rejects
                .toThrow('Tool "non_existent" not found');
        });

        it('should pass context to tool execution', async () => {
            const context: ToolContext = {
                workingDirectory: '/test/dir',
                customData: { key: 'value' }
            };

            const tool: Tool = {
                name: 'context_tool',
                description: 'Uses context',
                parameters: { type: 'object', properties: {} },
                execute: async (params, ctx) => {
                    return ctx?.workingDirectory || 'no context';
                }
            };

            const registryWithContext = ToolRegistry.create(context);
            registryWithContext.register(tool);

            const result = await registryWithContext.execute('context_tool', {});

            expect(result).toBe('/test/dir');
        });

        it('should track usage statistics', async () => {
            const tool: Tool = {
                name: 'tracked_tool',
                description: 'Tracked',
                parameters: { type: 'object', properties: {} },
                execute: async () => 'result'
            };

            registry.register(tool);

            await registry.execute('tracked_tool', {});
            await registry.execute('tracked_tool', {});

            const stats = registry.getUsageStats();
            const toolStats = stats.get('tracked_tool');

            expect(toolStats?.calls).toBe(2);
            expect(toolStats?.failures).toBe(0);
            expect(toolStats?.successRate).toBe(1);
        });

        it('should track failures', async () => {
            const tool: Tool = {
                name: 'failing_tool',
                description: 'Fails',
                parameters: { type: 'object', properties: {} },
                execute: async () => {
                    throw new Error('Tool failed');
                }
            };

            registry.register(tool);

            await expect(registry.execute('failing_tool', {})).rejects.toThrow();

            const stats = registry.getUsageStats();
            const toolStats = stats.get('failing_tool');

            expect(toolStats?.calls).toBe(1);
            expect(toolStats?.failures).toBe(1);
            expect(toolStats?.successRate).toBe(0);
        });

        it('should execute batch of tools', async () => {
            const tools: Tool[] = [
                {
                    name: 'add',
                    description: 'Add numbers',
                    parameters: {
                        type: 'object',
                        properties: {
                            a: { type: 'number', description: 'First number' },
                            b: { type: 'number', description: 'Second number' }
                        }
                    },
                    execute: async (params) => params.a + params.b
                },
                {
                    name: 'multiply',
                    description: 'Multiply numbers',
                    parameters: {
                        type: 'object',
                        properties: {
                            a: { type: 'number', description: 'First number' },
                            b: { type: 'number', description: 'Second number' }
                        }
                    },
                    execute: async (params) => params.a * params.b
                }
            ];

            registry.registerAll(tools);

            const results = await registry.executeBatch([
                { name: 'add', params: { a: 2, b: 3 } },
                { name: 'multiply', params: { a: 4, b: 5 } }
            ]);

            expect(results).toEqual([5, 20]);
        });

        it('should handle errors in batch execution', async () => {
            const tool: Tool = {
                name: 'failing',
                description: 'Fails',
                parameters: { type: 'object', properties: {} },
                execute: async () => {
                    throw new Error('Failed');
                }
            };

            registry.register(tool);

            const results = await registry.executeBatch([
                { name: 'failing', params: {} }
            ]);

            expect(results[0]).toHaveProperty('error');
        });
    });

    describe('Export Formats', () => {
        let registry: ToolRegistry;

        beforeEach(() => {
            registry = ToolRegistry.create();

            const tool: Tool = {
                name: 'test_tool',
                description: 'A test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        input: { type: 'string', description: 'Input string' }
                    },
                    required: ['input']
                },
                execute: async () => 'result'
            };

            registry.register(tool);
        });

        it('should export to OpenAI format', () => {
            const openAITools = registry.toOpenAIFormat();

            expect(openAITools).toHaveLength(1);
            expect(openAITools[0]).toEqual({
                type: 'function',
                function: {
                    name: 'test_tool',
                    description: 'A test tool',
                    parameters: {
                        type: 'object',
                        properties: {
                            input: { type: 'string', description: 'Input string' }
                        },
                        required: ['input']
                    }
                }
            });
        });

        it('should export to Anthropic format', () => {
            const anthropicTools = registry.toAnthropicFormat();

            expect(anthropicTools).toHaveLength(1);
            expect(anthropicTools[0]).toEqual({
                name: 'test_tool',
                description: 'A test tool',
                input_schema: {
                    type: 'object',
                    properties: {
                        input: { type: 'string', description: 'Input string' }
                    },
                    required: ['input']
                }
            });
        });

        it('should get tool definitions', () => {
            const definitions = registry.getDefinitions();

            expect(definitions).toHaveLength(1);
            expect(definitions[0]).toHaveProperty('name');
            expect(definitions[0]).toHaveProperty('description');
            expect(definitions[0]).toHaveProperty('parameters');
            expect(definitions[0]).not.toHaveProperty('execute');
        });
    });

    describe('Context Management', () => {
        it('should create registry with initial context', () => {
            const context: ToolContext = {
                workingDirectory: '/test',
                storage: { read: vi.fn() }
            };

            const registry = ToolRegistry.create(context);

            expect(registry.getContext()).toEqual(context);
        });

        it('should update context', () => {
            const registry = ToolRegistry.create({ workingDirectory: '/initial' });

            registry.updateContext({ workingDirectory: '/updated' });

            const context = registry.getContext();
            expect(context.workingDirectory).toBe('/updated');
        });

        it('should merge context on update', () => {
            const registry = ToolRegistry.create({
                workingDirectory: '/test',
                storage: { read: vi.fn() }
            });

            registry.updateContext({ workingDirectory: '/updated' });

            const context = registry.getContext();
            expect(context.workingDirectory).toBe('/updated');
            expect(context.storage).toBeDefined();
        });
    });

    describe('Usage Statistics', () => {
        let registry: ToolRegistry;

        beforeEach(() => {
            registry = ToolRegistry.create();

            const tools: Tool[] = [
                {
                    name: 'popular',
                    description: 'Popular tool',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'result'
                },
                {
                    name: 'unpopular',
                    description: 'Unpopular tool',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'result'
                }
            ];

            registry.registerAll(tools);
        });

        it('should get most used tools', async () => {
            await registry.execute('popular', {});
            await registry.execute('popular', {});
            await registry.execute('popular', {});
            await registry.execute('unpopular', {});

            const mostUsed = registry.getMostUsed(1);

            expect(mostUsed).toHaveLength(1);
            expect(mostUsed[0].name).toBe('popular');
        });

        it('should calculate success rate', async () => {
            const tool: Tool = {
                name: 'mixed',
                description: 'Sometimes fails',
                parameters: { type: 'object', properties: {} },
                execute: async (params: any) => {
                    if (params.shouldFail) {
                        throw new Error('Failed');
                    }
                    return 'success';
                }
            };

            registry.register(tool);

            await registry.execute('mixed', { shouldFail: false });
            await registry.execute('mixed', { shouldFail: false });

            try {
                await registry.execute('mixed', { shouldFail: true });
            } catch (e) {
                // Expected
            }

            const stats = registry.getUsageStats();
            const toolStats = stats.get('mixed');

            expect(toolStats?.calls).toBe(3);
            expect(toolStats?.failures).toBe(1);
            expect(toolStats?.successRate).toBeCloseTo(2/3, 2);
        });

        it('should reset statistics', async () => {
            await registry.execute('popular', {});

            registry.resetStats();

            const stats = registry.getUsageStats();
            const toolStats = stats.get('popular');

            expect(toolStats?.calls).toBe(0);
            expect(toolStats?.failures).toBe(0);
        });
    });

    describe('Tool Management', () => {
        let registry: ToolRegistry;

        beforeEach(() => {
            registry = ToolRegistry.create();
        });

        it('should unregister a tool', () => {
            const tool: Tool = {
                name: 'removable',
                description: 'Will be removed',
                parameters: { type: 'object', properties: {} },
                execute: async () => 'result'
            };

            registry.register(tool);
            expect(registry.has('removable')).toBe(true);

            const removed = registry.unregister('removable');

            expect(removed).toBe(true);
            expect(registry.has('removable')).toBe(false);
        });

        it('should return false when unregistering non-existent tool', () => {
            const removed = registry.unregister('non_existent');

            expect(removed).toBe(false);
        });

        it('should clear all tools', () => {
            const tools: Tool[] = [
                {
                    name: 'tool1',
                    description: 'First',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'result'
                },
                {
                    name: 'tool2',
                    description: 'Second',
                    parameters: { type: 'object', properties: {} },
                    execute: async () => 'result'
                }
            ];

            registry.registerAll(tools);
            expect(registry.count()).toBe(2);

            registry.clear();

            expect(registry.count()).toBe(0);
        });
    });

    describe('Tool Metadata', () => {
        let registry: ToolRegistry;

        beforeEach(() => {
            registry = ToolRegistry.create();
        });

        it('should store tool category', () => {
            const tool: Tool = {
                name: 'categorized',
                description: 'Has category',
                category: 'test-category',
                parameters: { type: 'object', properties: {} },
                execute: async () => 'result'
            };

            registry.register(tool);

            const retrieved = registry.get('categorized');
            expect(retrieved?.category).toBe('test-category');
        });

        it('should store cost hint', () => {
            const tool: Tool = {
                name: 'expensive_tool',
                description: 'Expensive',
                cost: 'expensive',
                parameters: { type: 'object', properties: {} },
                execute: async () => 'result'
            };

            registry.register(tool);

            const retrieved = registry.get('expensive_tool');
            expect(retrieved?.cost).toBe('expensive');
        });

        it('should store examples', () => {
            const tool: Tool = {
                name: 'documented',
                description: 'Has examples',
                parameters: {
                    type: 'object',
                    properties: {
                        input: { type: 'string', description: 'Input' }
                    }
                },
                examples: [
                    {
                        scenario: 'Simple use case',
                        params: { input: 'test' },
                        expectedResult: 'Test result'
                    }
                ],
                execute: async () => 'result'
            };

            registry.register(tool);

            const retrieved = registry.get('documented');
            expect(retrieved?.examples).toHaveLength(1);
            expect(retrieved?.examples![0].scenario).toBe('Simple use case');
        });
    });

    describe('Edge Cases', () => {
        let registry: ToolRegistry;

        beforeEach(() => {
            registry = ToolRegistry.create();
        });

        it('should handle tool with no parameters', async () => {
            const tool: Tool = {
                name: 'no_params',
                description: 'No parameters',
                parameters: {
                    type: 'object',
                    properties: {}
                },
                execute: async () => 'result'
            };

            registry.register(tool);

            const result = await registry.execute('no_params', {});
            expect(result).toBe('result');
        });

        it('should handle tool returning complex objects', async () => {
            const tool: Tool = {
                name: 'complex_return',
                description: 'Returns object',
                parameters: { type: 'object', properties: {} },
                execute: async () => ({
                    status: 'success',
                    data: [1, 2, 3],
                    nested: { key: 'value' }
                })
            };

            registry.register(tool);

            const result = await registry.execute('complex_return', {});

            expect(result).toHaveProperty('status', 'success');
            expect(result.data).toEqual([1, 2, 3]);
            expect(result.nested.key).toBe('value');
        });

        it('should handle async tool execution', async () => {
            const tool: Tool = {
                name: 'async_tool',
                description: 'Async execution',
                parameters: { type: 'object', properties: {} },
                execute: async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 'async result';
                }
            };

            registry.register(tool);

            const result = await registry.execute('async_tool', {});
            expect(result).toBe('async result');
        });

        it('should handle tool with nested parameter objects', () => {
            const tool: Tool = {
                name: 'nested_params',
                description: 'Nested parameters',
                parameters: {
                    type: 'object',
                    properties: {
                        simpleParam: {
                            type: 'string',
                            description: 'A simple parameter'
                        },
                        config: {
                            type: 'object',
                            description: 'Configuration object',
                            properties: {
                                timeout: { type: 'number', description: 'Timeout in ms' },
                                retries: { type: 'number', description: 'Retry count' }
                            }
                        }
                    }
                },
                execute: async () => 'result'
            };

            registry.register(tool);

            const retrieved = registry.get('nested_params');
            expect(retrieved?.parameters.properties.simpleParam.type).toBe('string');
            expect(retrieved?.parameters.properties.config.type).toBe('object');
        });
    });
});

