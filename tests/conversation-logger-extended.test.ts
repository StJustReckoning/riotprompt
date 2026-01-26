import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversationLogger } from '../src/conversation-logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Conversation Logger Extended', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'riotprompt-logger-'));
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('Redaction', () => {
        it('should redact custom patterns', () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: tempDir,
                redactSensitive: true,
                redactPatterns: [/SECRET-\d+/g]
            });

            logger.onMessageAdded({
                role: 'user',
                content: 'My SECRET-123 is here'
            });

            const conv = logger.getConversation();
            // Custom patterns still use [REDACTED]
            expect(conv.messages[0].content).toBe('My [REDACTED] is here');
        });

        it('should redact default sensitive patterns', () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: tempDir,
                redactSensitive: true
            });

            logger.onMessageAdded({
                role: 'user',
                content: 'Key: sk-123456789012345678901234567890123456789012345678'
            });

            const conv = logger.getConversation();
            // Fjell masking uses **** instead of [REDACTED]
            expect(conv.messages[0].content).toContain('****');
        });
    });

    describe('Error Handling', () => {
        it('should handle write errors for JSONL', async () => {
            const onError = vi.fn();
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: '/invalid/path/that/does/not/exist',
                format: 'jsonl',
                onError
            });

            logger.onConversationStart({ model: 'gpt-4' });
            
            // Trigger write
            logger.onMessageAdded({ role: 'user', content: 'test' });

            // Wait a bit for the async write queue
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(onError).toHaveBeenCalled();
        });

        it('should handle write errors for save()', async () => {
            const onError = vi.fn();
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: '/invalid/path', // Assuming this is not writable or valid
                format: 'json',
                onError
            });

            await expect(logger.save()).rejects.toThrow();
            expect(onError).toHaveBeenCalled();
        });
    });

    describe('Formats', () => {
        it('should handle markdown format with tool calls', async () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: tempDir,
                format: 'markdown'
            });

            logger.onMessageAdded({
                role: 'assistant',
                content: null,
                tool_calls: [{
                    id: '1',
                    type: 'function',
                    function: { name: 'test', arguments: '{}' }
                }]
            });

            const file = await logger.save();
            const content = await fs.readFile(file, 'utf-8');
            expect(content).toContain('**Tool Calls:**');
            expect(content).toContain('test');
        });
        it('should skip redaction for non-string content', () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: tempDir,
                redactSensitive: true
            });

            const content = { type: 'image_url', url: '...' };
            logger.onMessageAdded({
                role: 'user',
                content: content as any
            });

            const conv = logger.getConversation();
            expect(conv.messages[0].content).toBe(content);
        });

        it('should handle jsonl format and cache path', async () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: tempDir,
                format: 'jsonl'
            });

            logger.onConversationStart({ model: 'gpt-4' });
            logger.onMessageAdded({ role: 'user', content: 'test 1' });
            
            // Wait for queue
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Write again to trigger cached path usage
            logger.onMessageAdded({ role: 'assistant', content: 'test 2' });
            
            // Await the private writeQueue to ensure flush
            await (logger as any).writeQueue;
            
            const files = await fs.readdir(tempDir);
            expect(files.filter(f => f.endsWith('.jsonl')).length).toBe(1);
        });

        it('should handle tool call argument parsing errors in replayer', async () => {
            // Create a log with bad tool args
            const badLog = {
                id: 'bad-log',
                metadata: { startTime: new Date(), model: 'gpt' },
                messages: [{
                    index: 0,
                    timestamp: new Date().toISOString(),
                    role: 'assistant',
                    content: null,
                    tool_calls: [{
                        id: 'call_1',
                        type: 'function',
                        function: { name: 'test', arguments: '{ bad json }' }
                    }]
                }],
                summary: { totalMessages: 1, toolCallsExecuted: 0, iterations: 0, success: false }
            };
            
            const logPath = path.join(tempDir, 'bad-tools.json');
            await fs.writeFile(logPath, JSON.stringify(badLog));
            
            // We need to import Replayer dynamically or use the one from source
            const { ConversationReplayer } = await import('../src/conversation-logger');
            const replayer = await ConversationReplayer.load(logPath);
            
            const toolCalls = replayer.getToolCalls();
            expect(toolCalls).toHaveLength(1);
            expect(toolCalls[0].arguments).toHaveProperty('__parse_error');
        });
    });
});

