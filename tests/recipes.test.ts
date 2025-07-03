import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cook, quick, commit, recipe } from '../src/recipes';
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
                content: ['Test content'],
            });

            expect(prompt).toHaveProperty('instructions');
            expect(prompt).toHaveProperty('contents');
            expect(prompt).toHaveProperty('contexts');
            expect(prompt).toHaveProperty('persona');
        });

        it('should handle template inheritance', async () => {
            const prompt = await cook({
                basePath,
                template: 'commit',
                content: ['Test diff content'],
            });

            expect(prompt).toHaveProperty('instructions');
            expect(prompt).toHaveProperty('contents');
            expect(prompt).toHaveProperty('contexts');
            expect(prompt).toHaveProperty('persona');
        });

        it('should process different content item types', async () => {
            const prompt = await cook({
                basePath,
                content: [
                    'Simple string content',
                    { content: 'Inline content', title: 'Test Title', weight: 0.8 },
                    { path: 'test/file.md', title: 'File Content' },
                    { directories: ['docs/'], title: 'Directory Content' },
                ],
            });

            expect(Parser.create().parse).toHaveBeenCalledWith('Simple string content', expect.any(Object));
            expect(Parser.create().parse).toHaveBeenCalledWith('Inline content', expect.objectContaining({
                title: 'Test Title',
                weight: 0.8,
            }));
            expect(Parser.create().parseFile).toHaveBeenCalled();
            expect(Loader.create().load).toHaveBeenCalled();
        });
    });

    describe('commit template function', () => {
        it('should create a commit prompt with template defaults', async () => {
            const prompt = await commit({
                basePath,
                content: [{ content: 'diff content', title: 'Diff' }],
            });

            expect(prompt).toHaveProperty('instructions');
            expect(prompt).toHaveProperty('contents');
        });
    });

    describe('quick builders', () => {
        it('should create a quick commit prompt', async () => {
            const prompt = await quick.commit('diff content', {
                basePath,
                userDirection: 'Focus on performance',
                context: 'Production system',
            });

            expect(prompt).toHaveProperty('instructions');
            expect(prompt).toHaveProperty('contents');
            expect(prompt).toHaveProperty('contexts');
        });

        it('should create a quick release prompt', async () => {
            const prompt = await quick.release('log content', 'diff content', {
                basePath,
                releaseFocus: 'Breaking changes',
            });

            expect(prompt).toHaveProperty('instructions');
            expect(prompt).toHaveProperty('contents');
        });
    });

    describe('recipe fluent builder', () => {
        it('should build a prompt using fluent interface', async () => {
            const prompt = await recipe(basePath)
                .template('commit')
                .with({
                    content: [{ content: 'test content', title: 'Test' }],
                });

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
                template: 'commit' as const,
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