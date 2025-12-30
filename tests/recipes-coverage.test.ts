import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cook, registerTemplates, generateToolGuidance, ToolGuidanceConfig } from '../src/recipes';
import * as Parser from '../src/parser';
import * as Loader from '../src/loader';
import * as Override from '../src/override';
import { ToolRegistry } from '../src/tools';
import { Tool } from '../src/tools';

vi.mock('../src/parser');
vi.mock('../src/loader');
vi.mock('../src/override');

describe('Recipes Coverage', () => {
    const basePath = '/test/path';

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default mocks
        vi.mocked(Parser.create).mockReturnValue({
            parse: vi.fn().mockResolvedValue({ items: [{ text: 'parsed' }] }),
            parseFile: vi.fn().mockResolvedValue({ items: [{ text: 'parsed file' }] })
        } as any);
        vi.mocked(Loader.create).mockReturnValue({
            load: vi.fn().mockResolvedValue([{ items: [{ text: 'loaded' }] }])
        } as any);
        vi.mocked(Override.create).mockReturnValue({
            customize: vi.fn().mockImplementation((_, s) => Promise.resolve(s)),
            override: vi.fn().mockResolvedValue({})
        } as any);
    });

    describe('Tool Guidance Generation', () => {
        const tools: Tool[] = [
            { 
                name: 'search', 
                description: 'Search the web', 
                parameters: { 
                    type: 'object', 
                    properties: { query: { type: 'string', description: 'Query string' } },
                    required: ['query']
                },
                category: 'Research',
                examples: [{ scenario: 'Find weather', params: { query: 'weather' } }]
            },
            {
                name: 'calc',
                description: 'Calculate math',
                parameters: { type: 'object', properties: {} },
                category: 'Math',
                cost: 'low'
            }
        ];

        it('should return empty string for no tools', () => {
            expect(generateToolGuidance([], 'auto')).toBe('');
        });

        it('should handle "auto" strategy', () => {
            const guidance = generateToolGuidance(tools, 'auto');
            expect(guidance).toContain('## Available Tools');
            expect(guidance).toContain('**search**');
            expect(guidance).toContain('**When to use:**'); // Adaptive includes this
            expect(guidance).toContain('**Examples:**');
        });

        it('should handle "minimal" strategy', () => {
            const guidance = generateToolGuidance(tools, 'minimal');
            expect(guidance).toContain('**search**');
            expect(guidance).not.toContain('**When to use:**');
            expect(guidance).not.toContain('**Examples:**');
            expect(guidance).not.toContain('Parameters:');
        });

        it('should handle "detailed" strategy', () => {
            const guidance = generateToolGuidance(tools, 'detailed');
            expect(guidance).toContain('**When to use:**');
            expect(guidance).toContain('Parameters:');
        });

        it('should handle object config with custom instructions', () => {
            const config: ToolGuidanceConfig = {
                strategy: 'adaptive',
                customInstructions: 'Use these tools wisely.'
            };
            const guidance = generateToolGuidance(tools, config);
            expect(guidance).toContain('Use these tools wisely.');
        });

        it('should group by categories', () => {
            const config: ToolGuidanceConfig = {
                strategy: 'adaptive',
                includeCategories: true
            };
            const guidance = generateToolGuidance(tools, config);
            expect(guidance).toContain('### Research');
            expect(guidance).toContain('### Math');
        });

        it('should show tool costs if present', () => {
            const guidance = generateToolGuidance(tools, 'minimal');
            expect(guidance).toContain('_(low)_'); // calc tool
        });
    });

    describe('cook with tools', () => {
        it('should integrate tool registry', async () => {
            const registry = ToolRegistry.create();
            registry.register({ 
                name: 'test', 
                description: 'desc', 
                parameters: { type: 'object', properties: {} },
                execute: async () => 'test result'
            });

            const prompt = await cook({
                basePath,
                tools: registry,
                toolGuidance: 'auto'
            });

            // Parser should be called with generated guidance
            expect(Parser.create().parse).toHaveBeenCalledWith(
                expect.stringContaining('**test**'), 
                expect.any(Object)
            );
        });

        it('should filter tools by category', async () => {
            const registry = ToolRegistry.create();
            registry.register({ name: 't1', description: 'd', parameters: { type: 'object', properties: {} }, category: 'A', execute: async () => '' });
            registry.register({ name: 't2', description: 'd', parameters: { type: 'object', properties: {} }, category: 'B', execute: async () => '' });

            await cook({
                basePath,
                tools: registry,
                toolGuidance: 'auto',
                toolCategories: ['A']
            });

            // Should contain t1 but not t2
            const parseCall = vi.mocked(Parser.create().parse).mock.calls.find(
                call => typeof call[0] === 'string' && call[0].includes('Available Tools')
            );
            
            const guidance = parseCall?.[0] as string;
            expect(guidance).toContain('**t1**');
            expect(guidance).not.toContain('**t2**');
        });
    });

    describe('Template Inheritance', () => {
        it('should merge arrays from template', async () => {
            registerTemplates({
                'base': {
                    instructions: [{ content: 'base-inst' }],
                    content: [{ content: 'base-content' }],
                    context: [{ content: 'base-context' }]
                }
            });

            await cook({
                basePath,
                template: 'base',
                instructions: [{ content: 'child-inst' }],
                content: [{ content: 'child-content' }],
                context: [{ content: 'child-context' }]
            });

            // Check that all items were processed
            const parseCalls = vi.mocked(Parser.create().parse).mock.calls.map(c => c[0]);
            expect(parseCalls).toContain('base-inst');
            expect(parseCalls).toContain('child-inst');
            expect(parseCalls).toContain('base-content');
            expect(parseCalls).toContain('child-content');
        });
    });
});

