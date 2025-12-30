import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
    loadPromptFromDirectory, 
    isDirectory, 
    fileExists, 
    createAction, 
    processAction, 
    executeAction 
} from '../src/cli';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as RiotPrompt from '../src/riotprompt';

// Mock console and process
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`Process exit: ${code}`);
});

// Mock RiotPrompt internals where necessary
// We'll let real implementations run for integration-style unit tests where possible, 
// but mock expensive or external calls.

describe('CLI Unit Tests', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'riotprompt-cli-unit-'));
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('File Helpers', () => {
        it('should check if file exists', async () => {
            const file = path.join(tempDir, 'test.txt');
            await fs.writeFile(file, 'content');
            expect(await fileExists(file)).toBe(true);
            expect(await fileExists(path.join(tempDir, 'nonexistent'))).toBe(false);
        });

        it('should check if path is directory', async () => {
            const dir = path.join(tempDir, 'subdir');
            await fs.mkdir(dir);
            const file = path.join(tempDir, 'file.txt');
            await fs.writeFile(file, 'content');

            expect(await isDirectory(dir)).toBe(true);
            expect(await isDirectory(file)).toBe(false);
            expect(await isDirectory(path.join(tempDir, 'nonexistent'))).toBe(false);
        });
    });

    describe('loadPromptFromDirectory', () => {
        let promptPath: string;

        beforeEach(async () => {
            promptPath = path.join(tempDir, 'test-prompt');
            await fs.mkdir(promptPath);
        });

        it('should load prompt with persona and instructions', async () => {
            await fs.writeFile(path.join(promptPath, 'persona.md'), 'You are a test bot.');
            await fs.writeFile(path.join(promptPath, 'instructions.md'), 'Do the test.');

            const prompt = await loadPromptFromDirectory(promptPath);

            expect(prompt.persona).toBeDefined();
            expect(prompt.instructions).toBeDefined();
        });

        it('should support loading from directories', async () => {
            // Setup directories for persona and instructions
            const personaDir = path.join(promptPath, 'persona');
            await fs.mkdir(personaDir);
            await fs.writeFile(path.join(personaDir, 'p1.md'), 'Persona part 1');

            const instructionsDir = path.join(promptPath, 'instructions');
            await fs.mkdir(instructionsDir);
            await fs.writeFile(path.join(instructionsDir, 'i1.md'), 'Instr part 1');

            const prompt = await loadPromptFromDirectory(promptPath);
            expect(prompt.persona).toBeDefined();
            expect(prompt.instructions).toBeDefined();
        });

        it('should throw if instructions are missing', async () => {
            await fs.writeFile(path.join(promptPath, 'persona.md'), 'You are a test bot.');
            // No instructions

            await expect(loadPromptFromDirectory(promptPath)).rejects.toThrow('instructions');
        });

        it('should load context if present', async () => {
            await fs.writeFile(path.join(promptPath, 'instructions.md'), 'Do the test.');
            const contextDir = path.join(promptPath, 'context');
            await fs.mkdir(contextDir);
            await fs.writeFile(path.join(contextDir, 'data.txt'), 'Some context data');

            const prompt = await loadPromptFromDirectory(promptPath);
            expect(prompt.contexts).toBeDefined();
        });
    });

    describe('createAction', () => {
        it('should scaffold a new prompt', async () => {
            const promptName = 'new-prompt';
            const options = { path: tempDir, persona: 'Custom Persona', context: true };

            await createAction(promptName, options);

            const promptDir = path.join(tempDir, promptName);
            expect(await fileExists(path.join(promptDir, 'persona.md'))).toBe(true);
            expect(await fileExists(path.join(promptDir, 'instructions.md'))).toBe(true);
            expect(await fileExists(path.join(promptDir, 'context/README.md'))).toBe(true);

            const personaContent = await fs.readFile(path.join(promptDir, 'persona.md'), 'utf-8');
            expect(personaContent).toBe('Custom Persona');
        });

        it('should fail if directory already exists', async () => {
            const promptName = 'existing-prompt';
            await fs.mkdir(path.join(tempDir, promptName));

            await expect(createAction(promptName, { path: tempDir })).rejects.toThrow('Process exit: 1');
            expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('already exists'));
        });

        it('should import from JSON', async () => {
            const importFile = path.join(tempDir, 'import.json');
            await fs.writeFile(importFile, JSON.stringify({
                persona: { items: [{ text: 'Imported' }] },
                instructions: { items: [{ text: 'Instructions' }] }
            }));

            await createAction('imported', { path: tempDir, import: importFile });

            const promptDir = path.join(tempDir, 'imported');
            expect(await fileExists(path.join(promptDir, 'persona.md'))).toBe(true);
            expect(await fs.readFile(path.join(promptDir, 'persona.md'), 'utf-8')).toBe('Imported');
        });
        it('should fail on unsupported import extension', async () => {
            const importFile = path.join(tempDir, 'import.txt');
            await fs.writeFile(importFile, 'content');
            await expect(createAction('imported', { path: tempDir, import: importFile })).rejects.toThrow('Process exit: 1');
            expect(mockConsoleError).toHaveBeenCalledWith('Error creating prompt:', expect.objectContaining({
                message: expect.stringContaining('Unsupported file extension')
            }));
        });
    });

    describe('processAction', () => {
        let promptPath: string;

        beforeEach(async () => {
            promptPath = path.join(tempDir, 'process-prompt');
            await fs.mkdir(promptPath);
            await fs.writeFile(path.join(promptPath, 'instructions.md'), 'Process this.');
        });

        it('should process directory prompt', async () => {
            await processAction(promptPath, { model: 'gpt-4' });
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('--- Result ---'));
        });

        it('should fail if prompt path does not exist', async () => {
            await expect(processAction('nonexistent', {})).rejects.toThrow('Process exit: 1');
        });

        it('should output to file if requested', async () => {
            const outputPath = path.join(tempDir, 'output.txt');
            await processAction(promptPath, { model: 'gpt-4', output: outputPath });
            
            expect(await fileExists(outputPath)).toBe(true);
            const content = await fs.readFile(outputPath, 'utf-8');
            expect(content).toContain('Process this.');
        });

        it('should support JSON format', async () => {
            const outputPath = path.join(tempDir, 'output.json');
            await processAction(promptPath, { format: 'json', output: outputPath });
            
            const content = await fs.readFile(outputPath, 'utf-8');
            const data = JSON.parse(content);
            expect(data.instructions).toBeDefined();
        });
    });

    describe('executeAction', () => {
        let promptPath: string;

        beforeEach(async () => {
            promptPath = path.join(tempDir, 'exec-prompt');
            await fs.mkdir(promptPath);
            await fs.writeFile(path.join(promptPath, 'instructions.md'), 'Execute this.');
        });

        it('should execute prompt', async () => {
            // Mock Execution.execute
            const mockExecute = vi.spyOn(RiotPrompt.Execution, 'execute').mockResolvedValue({
                content: 'Mock response',
                model: 'gpt-4',
                usage: { inputTokens: 10, outputTokens: 20 }
            });

            await executeAction(promptPath, { model: 'gpt-4', key: 'sk-test' });

            expect(mockExecute).toHaveBeenCalled();
            expect(mockConsoleLog).toHaveBeenCalledWith('Mock response');
        });

        it('should handle execution errors', async () => {
            vi.spyOn(RiotPrompt.Execution, 'execute').mockRejectedValue(new Error('API Error'));

            await expect(executeAction(promptPath, { model: 'gpt-4' })).rejects.toThrow('Process exit: 1');
            expect(mockConsoleError).toHaveBeenCalledWith('Error executing prompt:', 'API Error');
        });
        it('should handle execution without usage stats', async () => {
            const mockExecute = vi.spyOn(RiotPrompt.Execution, 'execute').mockResolvedValue({
                content: 'Mock response',
                model: 'gpt-4'
                // no usage
            });

            await executeAction(promptPath, { model: 'gpt-4', key: 'sk-test' });

            expect(mockExecute).toHaveBeenCalled();
            expect(mockConsoleLog).toHaveBeenCalledWith('Mock response');
            // Should not log usage
            expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining('Input Tokens'));
        });
    });
});
