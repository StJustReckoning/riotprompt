import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as Writer from '../src/writer';
import { create as createPrompt } from '../src/prompt';
import { create as createSection } from '../src/items/section';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Writer', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'riotprompt-test-'));
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should save a prompt to a directory structure', async () => {
        const prompt = createPrompt({
            persona: createSection({ title: 'Persona' }).add('You are a bot.'),
            instructions: createSection({ title: 'Instructions' }).add('Do work.'),
            contexts: createSection({ title: 'Context' }).add(
                createSection({ title: 'Data' }).add('{ "a": 1 }')
            )
        });

        await Writer.saveToDirectory(prompt, tempDir);

        // Check Persona
        const personaPath = path.join(tempDir, 'persona.md');
        const personaExists = await fs.stat(personaPath).then(() => true).catch(() => false);
        expect(personaExists).toBe(true);
        const personaContent = await fs.readFile(personaPath, 'utf-8');
        expect(personaContent).toBe('You are a bot.');

        // Check Instructions
        const instructionsPath = path.join(tempDir, 'instructions.md');
        const instructionsExists = await fs.stat(instructionsPath).then(() => true).catch(() => false);
        expect(instructionsExists).toBe(true);
        const instructionsContent = await fs.readFile(instructionsPath, 'utf-8');
        expect(instructionsContent).toBe('Do work.');

        // Check Context (Nested)
        const contextDir = path.join(tempDir, 'context');
        const contextDirExists = await fs.stat(contextDir).then(s => s.isDirectory()).catch(() => false);
        expect(contextDirExists).toBe(true);

        const dataPath = path.join(contextDir, 'Data.md'); // Title 'Data' -> Data.md
        const dataExists = await fs.stat(dataPath).then(() => true).catch(() => false);
        
        // Writer logic creates directories for nested sections if they have subsections,
        // or files if they are leaf sections mixed in?
        // Let's check Writer implementation:
        // if (typeof item === 'object' && 'items' in item) { ... subPath = path.join(targetPath, subTitle); await saveSection(...) }
        // So 'Data' section inside 'Context' section.
        // 'Context' section has 'Data' section as item.
        // saveSection('context') -> iterates items.
        // Item 0 is Section('Data'). -> recurses to saveSection(..., 'context/Data')
        // Inside 'Data': items=['{ "a": 1 }']. No subsections.
        // -> writes 'context/Data.md'.
        
        expect(dataExists).toBe(true);
        const dataContent = await fs.readFile(dataPath, 'utf-8');
        expect(dataContent).toBe('{ "a": 1 }');
    });
});

