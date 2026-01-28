import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Path to the compiled CLI executable
const CLI_PATH = path.resolve(import.meta.dirname, '../dist/cli.js');

/**
 * Safely escape a shell argument to prevent command injection
 * @param arg - The argument to escape
 * @returns Properly escaped argument
 */
function escapeShellArg(arg: string): string {
    // On Windows, use double quotes; on Unix, use single quotes
    if (process.platform === 'win32') {
        // Escape double quotes and wrap in double quotes
        return `"${arg.replace(/"/g, '""')}"`;
    } else {
        // Escape single quotes by replacing ' with '\'' and wrap in single quotes
        return `'${arg.replace(/'/g, "'\\''")}'`;
    }
}

describe('CLI Integration', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'riotprompt-cli-test-'));
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('create command', () => {
        it('should create a new prompt scaffold', async () => {
            const promptName = 'test-prompt';
            const cmd = `node ${escapeShellArg(CLI_PATH)} create ${escapeShellArg(promptName)} --path ${escapeShellArg(tempDir)}`;
            
            await execAsync(cmd);

            const promptDir = path.join(tempDir, promptName);
            const stats = await fs.stat(promptDir);
            expect(stats.isDirectory()).toBe(true);

            expect(await fs.stat(path.join(promptDir, 'persona.md'))).toBeDefined();
            expect(await fs.stat(path.join(promptDir, 'instructions.md'))).toBeDefined();
            expect(await fs.stat(path.join(promptDir, 'context'))).toBeDefined();
        });

        it('should import from JSON', async () => {
            const promptName = 'imported-prompt';
            const jsonFile = path.join(tempDir, 'source.json');
            const jsonContent = JSON.stringify({
                instructions: {
                    items: [{ text: 'Imported instruction' }]
                }
            });
            await fs.writeFile(jsonFile, jsonContent);

            const cmd = `node ${escapeShellArg(CLI_PATH)} create ${escapeShellArg(promptName)} --path ${escapeShellArg(tempDir)} --import ${escapeShellArg(jsonFile)}`;
            await execAsync(cmd);

            const promptDir = path.join(tempDir, promptName);
            const content = await fs.readFile(path.join(promptDir, 'instructions.md'), 'utf-8');
            expect(content).toContain('Imported instruction');
        });
    });

    describe('process command', () => {
        let promptPath: string;

        beforeEach(async () => {
            promptPath = path.join(tempDir, 'my-prompt');
            await fs.mkdir(promptPath);
            await fs.writeFile(path.join(promptPath, 'instructions.md'), 'Test instruction');
        });

        it('should process a prompt directory to text', async () => {
            const cmd = `node ${escapeShellArg(CLI_PATH)} process ${escapeShellArg(promptPath)}`;
            const { stdout } = await execAsync(cmd);
            expect(stdout).toContain('Test instruction');
        });

        it('should process a prompt directory to JSON', async () => {
            const outputPath = path.join(tempDir, 'output.json');
            const cmd = `node ${escapeShellArg(CLI_PATH)} process ${escapeShellArg(promptPath)} --format json --output ${escapeShellArg(outputPath)}`;
            await execAsync(cmd);

            const content = await fs.readFile(outputPath, 'utf-8');
            const json = JSON.parse(content);
            expect(json.instructions.items[0].text).toContain('Test instruction');
        });

        it('should process a single JSON file input', async () => {
            const jsonInput = path.join(tempDir, 'input.json');
            await fs.writeFile(jsonInput, JSON.stringify({
                instructions: { items: [{ text: 'JSON Input' }] }
            }));

            const cmd = `node ${escapeShellArg(CLI_PATH)} process ${escapeShellArg(jsonInput)}`;
            const { stdout } = await execAsync(cmd);
            expect(stdout).toContain('JSON Input');
        });
    });
});
