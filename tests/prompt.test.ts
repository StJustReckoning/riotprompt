import { describe, expect, vi, test, beforeEach } from 'vitest';
import { createPrompt, createSection } from '../src/riotprompt';
import type { Weighted } from '../src/items/weighted';

// Mock all dependencies
vi.mock('../src/items/content', () => ({
    create: vi.fn((text) => ({ text, weight: 1 })),
}));

vi.mock('../src/items/context', () => ({
    create: vi.fn((text) => ({ text, weight: 1 })),
}));

vi.mock('../src/items/instruction', () => ({
    create: vi.fn((text) => ({ text, weight: 1 })),
}));

describe('Prompt', () => {

    beforeEach(async () => {
        // Reset all mocks
        vi.clearAllMocks();
        // No need to clear the create* mocks here anymore as they are fresh per import
    });

    test('should create a prompt with empty arrays', async () => {

        const persona = createSection({ title: 'Persona' });
        const instructions = createSection({ title: 'Instructions' });
        const contents = createSection({ title: 'Contents' });
        const contexts = createSection({ title: 'Contexts' });

        const prompt = createPrompt({ persona, instructions, contents, contexts });

        expect(prompt.persona?.items).toEqual([]);
        expect(prompt.instructions.items).toEqual([]);
        expect(prompt.contents?.items).toEqual([]);
        expect(prompt.contexts?.items).toEqual([]);
    });

    test('should add an instruction from a string', async () => {
        const persona = createSection({ title: 'Persona' });
        const instructions = createSection({ title: 'Instructions' });
        const contents = createSection({ title: 'Contents' });
        const contexts = createSection({ title: 'Contexts' });

        const prompt = createPrompt({ persona, instructions, contents, contexts });
        const instructionText = 'Test instruction';

        instructions.add(instructionText);

        // Check that the mock create function was called
        expect(prompt.instructions.items.length).toBe(1);
        expect((prompt.instructions.items[0] as Weighted).text).toBe(instructionText);
    });

    test('should add an instruction object', async () => {
        const persona = createSection({ title: 'Persona' });
        const instructions = createSection({ title: 'Instructions' });
        const contents = createSection({ title: 'Contents' });
        const contexts = createSection({ title: 'Contexts' });

        const prompt = createPrompt({ persona, instructions, contents, contexts });
        const instruction = { text: 'Test instruction', weight: 1 };

        instructions.add(instruction);

        expect(prompt.instructions.items).toContain(instruction);
    });

    test('should add an instruction section', async () => {
        const { create } = await import('../src/items/section');
        const persona = createSection({ title: 'Persona' });
        const instructions = createSection({ title: 'Instructions' });
        const contents = createSection({ title: 'Contents' });
        const contexts = createSection({ title: 'Contexts' });

        const prompt = createPrompt({ persona, instructions, contents, contexts });
        const section = create({ title: 'Test Section' });

        instructions.add(section);

        expect(prompt.instructions.items).toContain(section);
    });

    test('should add content from a string', async () => {
        const persona = createSection({ title: 'Persona' });
        const instructions = createSection({ title: 'Instructions' });
        const contents = createSection({ title: 'Contents' });
        const contexts = createSection({ title: 'Contexts' });

        const prompt = createPrompt({ persona, instructions, contents, contexts });
        const contentText = 'Test content';

        contents.add(contentText);

        // Check that the mock create function was called
        expect(prompt.contents?.items.length).toBe(1);
        expect((prompt.contents?.items[0] as Weighted).text).toBe(contentText);
    });

    test('should add content object', async () => {
        const persona = createSection({ title: 'Persona' });
        const instructions = createSection({ title: 'Instructions' });
        const contents = createSection({ title: 'Contents' });
        const contexts = createSection({ title: 'Contexts' });

        const prompt = createPrompt({ persona, instructions, contents, contexts });
        const content = { text: 'Test content', weight: 1 };

        contents.add(content);

        expect(prompt.contents?.items).toContain(content);
    });

    test('should add content section', async () => {
        const { create } = await import('../src/items/section');
        const persona = createSection({ title: 'Persona' });
        const instructions = createSection({ title: 'Instructions' });
        const contents = createSection({ title: 'Contents' });
        const contexts = createSection({ title: 'Contexts' });

        const prompt = createPrompt({ persona, instructions, contents, contexts });
        const section = create({ title: 'Test Section' });

        contents.add(section);

        expect(prompt.contents?.items).toContain(section);
    });

    test('should add context from a string', async () => {
        const persona = createSection({ title: 'Persona' });
        const instructions = createSection({ title: 'Instructions' });
        const contents = createSection({ title: 'Contents' });
        const contexts = createSection({ title: 'Contexts' });

        const prompt = createPrompt({ persona, instructions, contents, contexts });
        const contextText = 'Test context';

        contexts.add(contextText);

        // Check that the mock create function was called
        expect(prompt.contexts?.items.length).toBe(1);
        expect((prompt.contexts?.items[0] as Weighted).text).toBe(contextText);
    });

    test('should add context object', async () => {
        const persona = createSection({ title: 'Persona' });
        const instructions = createSection({ title: 'Instructions' });
        const contents = createSection({ title: 'Contents' });
        const contexts = createSection({ title: 'Contexts' });

        const prompt = createPrompt({ persona, instructions, contents, contexts });
        const context = { text: 'Test context', weight: 1 };

        contexts.add(context);

        expect(prompt.contexts?.items).toContain(context);
    });

    test('should add context section', async () => {
        const { create } = await import('../src/items/section');
        const persona = createSection({ title: 'Persona' });
        const instructions = createSection({ title: 'Instructions' });
        const contents = createSection({ title: 'Contents' });
        const contexts = createSection({ title: 'Contexts' });

        const prompt = createPrompt({ persona, instructions, contents, contexts });
        const section = create({ title: 'Test Section' });

        contexts.add(section);

        expect(prompt.contexts?.items).toContain(section);
    });
});
