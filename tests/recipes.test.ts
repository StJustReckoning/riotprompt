import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cook, recipe, registerTemplates, getTemplates, clearTemplates } from '../src/recipes';
import * as Parser from '../src/parser';
import * as Loader from '../src/loader';
import * as Override from '../src/override';

vi.mock('../src/parser');
vi.mock('../src/loader');
vi.mock('../src/override');

describe('Recipes System', () => {
    const basePath = '/test/path';

    beforeEach(() => {
        vi.clearAllMocks();
        clearTemplates(); // Clear templates between tests

        // Mock parser
        const mockParser = {
            parse: vi.fn().mockReturnValue({ items: [{ text: 'parsed content', weight: 1.0 }] }),
            parseFile: vi.fn().mockResolvedValue({ items: [{ text: 'parsed file content', weight: 1.0 }] }),
        };
        vi.mocked(Parser.create).mockReturnValue(mockParser);

        // Mock loader
        const mockLoader = {
            load: vi.fn().mockResolvedValue([{ items: [{ text: 'loaded content', weight: 1.0 }] }]),
        };
        vi.mocked(Loader.create).mockReturnValue(mockLoader);

        // Mock override
        const mockOverride = {
            customize: vi.fn().mockImplementation((path, section) => Promise.resolve(section)),
            override: vi.fn().mockResolvedValue({ prepends: [], appends: [] }),
        };
        vi.mocked(Override.create).mockReturnValue(mockOverride);
    });

    describe('cook function', () => {
        it('should create a prompt with minimal configuration', async () => {
            const prompt = await cook({
                basePath,
            });

            expect(prompt).toBeDefined();
            expect(prompt.instructions).toBeDefined();
            // Optional sections are undefined when not provided
            expect(prompt.contents).toBeUndefined();
            expect(prompt.persona).toBeUndefined();
            expect(prompt.contexts).toBeUndefined();
        });

        it('should create a prompt with full configuration', async () => {
            const prompt = await cook({
                basePath,
                persona: { content: 'You are a helpful assistant' },
                instructions: [{ content: 'Follow these steps' }],
                content: [{ content: 'Process this content' }],
                context: [{ content: 'Additional context' }],
            });

            expect(prompt).toBeDefined();
            expect(Parser.create().parse).toHaveBeenCalledWith('You are a helpful assistant', expect.any(Object));
            expect(Parser.create().parse).toHaveBeenCalledWith('Follow these steps', expect.any(Object));
            expect(Parser.create().parse).toHaveBeenCalledWith('Process this content', expect.any(Object));
            expect(Parser.create().parse).toHaveBeenCalledWith('Additional context', expect.any(Object));
        });
    });

    describe('template system', () => {
        it('should register and use custom templates', async () => {
            registerTemplates({
                'myTemplate': {
                    persona: { content: 'Custom persona' },
                    instructions: [{ content: 'Custom instructions' }],
                },
            });

            const prompt = await cook({
                basePath,
                template: 'myTemplate',
            });

            expect(prompt).toBeDefined();

            // Check that both persona and instructions were parsed
            const parseCalls = vi.mocked(Parser.create().parse).mock.calls;
            expect(parseCalls).toContainEqual(['Custom persona', expect.any(Object)]);
            expect(parseCalls).toContainEqual(['Custom instructions', expect.any(Object)]);
        });

        it('should get registered templates', () => {
            registerTemplates({
                'template1': { persona: { content: 'Persona 1' } },
                'template2': { persona: { content: 'Persona 2' } },
            });

            const templates = getTemplates();

            expect(templates).toEqual({
                'template1': { persona: { content: 'Persona 1' } },
                'template2': { persona: { content: 'Persona 2' } },
            });
        });

        it('should clear templates', () => {
            registerTemplates({
                'template1': { persona: { content: 'Persona 1' } },
            });

            expect(getTemplates()).toEqual({
                'template1': { persona: { content: 'Persona 1' } },
            });

            clearTemplates();

            expect(getTemplates()).toEqual({});
        });

        it('should override template with config', async () => {
            registerTemplates({
                'baseTemplate': {
                    persona: { content: 'Base persona' },
                    instructions: [{ content: 'Base instructions' }],
                },
            });

            const prompt = await cook({
                basePath,
                template: 'baseTemplate',
                persona: { content: 'Override persona' },
                instructions: [{ content: 'Override instructions' }],
            });

            expect(prompt).toBeDefined();
            expect(Parser.create().parse).toHaveBeenCalledWith('Override persona', expect.any(Object));
            expect(Parser.create().parse).toHaveBeenCalledWith('Override instructions', expect.any(Object));
        });
    });

    describe('recipe fluent builder', () => {
        it('should build a prompt using fluent interface with template', async () => {
            registerTemplates({
                'testTemplate': {
                    persona: { content: 'Test persona' },
                    instructions: [{ content: 'Test instructions' }],
                },
            });

            const prompt = await recipe(basePath)
                .template('testTemplate')
                .with({
                    content: [{ content: 'test content', title: 'Test' }],
                })
                .cook();

            expect(prompt).toHaveProperty('instructions');
            expect(prompt).toHaveProperty('contents');
        });

        it('should build a custom prompt from scratch', async () => {
            const prompt = await recipe(basePath)
                .persona({ content: 'You are a helpful assistant' })
                .instructions('Analyze the code')
                .content({ content: 'source code', title: 'Code' })
                .cook();

            expect(prompt).toHaveProperty('instructions');
            expect(prompt).toHaveProperty('contents');
            expect(prompt).toHaveProperty('persona');
        });
    });

    describe('configuration validation', () => {
        it('should provide reasonable defaults', async () => {
            const prompt = await cook({
                basePath,
                // Minimal configuration - should use defaults
            });

            expect(prompt).toBeDefined();
            expect(prompt.instructions).toBeDefined();
        });

        it('should handle partial configurations correctly', async () => {
            const prompt = await cook({
                basePath,
                persona: { content: 'Custom persona' },
                // Other fields should use defaults
            });

            expect(prompt).toBeDefined();
            expect(prompt.persona).toBeDefined();
            expect(prompt.instructions).toBeDefined();
        });
    });

    describe('content processing', () => {
        it('should handle string content', async () => {
            await cook({
                basePath,
                content: ['Simple string'],
            });

            expect(Parser.create().parse).toHaveBeenCalledWith('Simple string', expect.any(Object));
        });

        it('should handle inline content with options', async () => {
            await cook({
                basePath,
                content: [{ content: 'test', title: 'Test Title', weight: 0.5 }],
            });

            expect(Parser.create().parse).toHaveBeenCalledWith('test', expect.objectContaining({
                title: 'Test Title',
                weight: 0.5,
            }));
        });

        it('should handle file paths', async () => {
            await cook({
                basePath,
                content: [{ path: 'test.md', title: 'File', weight: 0.8 }],
            });

            expect(Parser.create().parseFile).toHaveBeenCalledWith(
                expect.stringContaining('test.md'),
                expect.objectContaining({
                    title: 'File',
                    weight: 0.8,
                })
            );
        });

        it('should handle directory loading', async () => {
            await cook({
                basePath,
                content: [{ directories: ['docs/', 'examples/'], title: 'Docs' }],
            });

            expect(Loader.create().load).toHaveBeenCalledWith(
                ['docs/', 'examples/'],
                expect.objectContaining({
                    title: 'Docs',
                })
            );
        });
    });

    describe('type safety', () => {
        it('should accept valid recipe configurations', async () => {
            // This test mainly verifies TypeScript compilation
            const validConfig = {
                basePath,
                template: 'customTemplate',
                persona: { content: 'You are an expert' },
                instructions: [
                    { path: 'instructions.md' },
                    { content: 'Additional instruction' },
                ],
                content: [
                    'Simple content',
                    { content: 'Detailed content', title: 'Details', weight: 1.0 },
                    { path: 'file.md', weight: 0.5 },
                    { directories: ['docs/'], weight: 0.3 },
                ],
                context: [
                    { content: 'Context info', title: 'Context' },
                ],
            };

            const prompt = await cook(validConfig);
            expect(prompt).toBeDefined();
        });
    });
}); 