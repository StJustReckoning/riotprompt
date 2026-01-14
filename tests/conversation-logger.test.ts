import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConversationLogger, ConversationReplayer } from '../src/conversation-logger';
import { ConversationBuilder } from '../src/conversation';
import fs from 'fs/promises';
import path from 'path';
import type { LogConfig } from '../src/conversation-logger';

describe('Conversation Persistence & Replay', () => {
    const testOutputDir = path.join(__dirname, 'test-logs');

    beforeEach(async () => {
        // Create test output directory
        await fs.mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        // Clean up test files
        try {
            await fs.rm(testOutputDir, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    describe('ConversationLogger', () => {
        it('should create conversation logger', () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: testOutputDir,
                format: 'json'
            });

            expect(logger).toBeDefined();
        });

        it('should log messages', () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: testOutputDir,
                format: 'json'
            });

            const message = {
                role: 'user' as const,
                content: 'Test message'
            };

            logger.onMessageAdded(message);

            const conversation = logger.getConversation();
            expect(conversation.messages).toHaveLength(1);
            expect(conversation.messages[0].content).toBe('Test message');
        });

        it('should track tool calls', () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: testOutputDir
            });

            logger.onToolCall(
                'call_123',
                'test_tool',
                1,
                { param: 'value' },
                'result',
                45,
                true
            );

            const conversation = logger.getConversation();
            expect(conversation).toBeDefined();
        });

        it('should save as JSON', async () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: testOutputDir,
                format: 'json'
            });

            logger.onConversationStart({ model: 'gpt-4o', startTime: new Date() });
            logger.onMessageAdded({ role: 'user', content: 'Test' });
            logger.onConversationEnd({
                totalMessages: 1,
                toolCallsExecuted: 0,
                iterations: 1,
                success: true
            });

            const savedPath = await logger.save();

            expect(savedPath).toBeDefined();
            const exists = await fs.access(savedPath).then(() => true).catch(() => false);
            expect(exists).toBe(true);

            // Verify content
            const content = await fs.readFile(savedPath, 'utf-8');
            const data = JSON.parse(content);
            expect(data.messages).toHaveLength(1);
        });

        it('should save as Markdown', async () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: testOutputDir,
                format: 'markdown'
            });

            logger.onConversationStart({ model: 'gpt-4o', startTime: new Date() });
            logger.onMessageAdded({ role: 'user', content: 'Test message' });
            logger.onConversationEnd({
                totalMessages: 1,
                toolCallsExecuted: 0,
                iterations: 1,
                success: true
            });

            const savedPath = await logger.save();

            const content = await fs.readFile(savedPath, 'utf-8');
            expect(content).toContain('# Conversation Log');
            expect(content).toContain('Test message');
        });

        it('should redact sensitive data', () => {
            const logger = new ConversationLogger({
                enabled: true,
                outputPath: testOutputDir,
                redactSensitive: true
            });

            const message = {
                role: 'user' as const,
                content: 'My API key is sk-abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234'
            };

            logger.onMessageAdded(message);

            const conversation = logger.getConversation();
            expect(conversation.messages[0].content).not.toContain('sk-abcd');
            // Fjell masking uses **** instead of [REDACTED]
            expect(conversation.messages[0].content).toContain('****');
        });

        it('should call onSaved callback', async () => {
            let savedPath: string | undefined;

            const logger = new ConversationLogger({
                enabled: true,
                outputPath: testOutputDir,
                format: 'json',
                onSaved: (path) => { savedPath = path; }
            });

            logger.onConversationStart({ model: 'gpt-4o', startTime: new Date() });
            logger.onMessageAdded({ role: 'user', content: 'Test' });
            logger.onConversationEnd({
                totalMessages: 1,
                toolCallsExecuted: 0,
                iterations: 1,
                success: true
            });

            await logger.save();

            expect(savedPath).toBeDefined();
        });
    });

    describe('ConversationReplayer', () => {
        it('should load conversation from JSON', async () => {
            // Create a test conversation file
            const testConversation = {
                id: 'test-conv',
                metadata: {
                    startTime: new Date(),
                    model: 'gpt-4o'
                },
                messages: [
                    { index: 0, timestamp: new Date().toISOString(), role: 'user', content: 'Test' }
                ],
                summary: {
                    totalMessages: 1,
                    toolCallsExecuted: 0,
                    iterations: 1,
                    success: true
                }
            };

            const testPath = path.join(testOutputDir, 'test-conv.json');
            await fs.writeFile(testPath, JSON.stringify(testConversation), 'utf-8');

            const replayer = await ConversationReplayer.load(testPath);

            expect(replayer).toBeDefined();
            expect(replayer.messages).toHaveLength(1);
        });

        it('should load conversation from JSONL', async () => {
            const messages = [
                { index: 0, timestamp: new Date().toISOString(), role: 'user', content: 'Line 1' },
                { index: 1, timestamp: new Date().toISOString(), role: 'assistant', content: 'Line 2' }
            ];

            const testPath = path.join(testOutputDir, 'test-conv.jsonl');
            const jsonl = messages.map(m => JSON.stringify(m)).join('\n');
            await fs.writeFile(testPath, jsonl, 'utf-8');

            const replayer = await ConversationReplayer.load(testPath);

            expect(replayer.messages).toHaveLength(2);
        });

        it('should get tool calls', async () => {
            const testConversation = {
                id: 'test-conv',
                metadata: {
                    startTime: new Date(),
                    model: 'gpt-4o'
                },
                messages: [
                    {
                        index: 0,
                        timestamp: new Date().toISOString(),
                        role: 'assistant',
                        content: null,
                        tool_calls: [{
                            id: 'call_1',
                            type: 'function' as const,
                            function: { name: 'test_tool', arguments: '{}' }
                        }]
                    }
                ],
                summary: {
                    totalMessages: 1,
                    toolCallsExecuted: 1,
                    iterations: 1,
                    success: true
                }
            };

            const testPath = path.join(testOutputDir, 'test-with-tools.json');
            await fs.writeFile(testPath, JSON.stringify(testConversation), 'utf-8');

            const replayer = await ConversationReplayer.load(testPath);
            const toolCalls = replayer.getToolCalls();

            expect(toolCalls).toHaveLength(1);
            expect(toolCalls[0].toolName).toBe('test_tool');
        });

        it('should get timeline', async () => {
            const testConversation = {
                id: 'test-conv',
                metadata: {
                    startTime: new Date(),
                    model: 'gpt-4o'
                },
                messages: [
                    { index: 0, timestamp: new Date().toISOString(), role: 'user', content: 'Test 1' },
                    { index: 1, timestamp: new Date().toISOString(), role: 'assistant', content: 'Test 2' }
                ],
                summary: {
                    totalMessages: 2,
                    toolCallsExecuted: 0,
                    iterations: 1,
                    success: true
                }
            };

            const testPath = path.join(testOutputDir, 'test-timeline.json');
            await fs.writeFile(testPath, JSON.stringify(testConversation), 'utf-8');

            const replayer = await ConversationReplayer.load(testPath);
            const timeline = replayer.getTimeline();

            expect(timeline).toHaveLength(2);
            expect(timeline[0].type).toBe('message');
        });

        it('should export to different formats', async () => {
            const testConversation = {
                id: 'test-conv',
                metadata: {
                    startTime: new Date(),
                    model: 'gpt-4o'
                },
                messages: [
                    { index: 0, timestamp: new Date().toISOString(), role: 'user', content: 'Test' }
                ],
                summary: {
                    totalMessages: 1,
                    toolCallsExecuted: 0,
                    iterations: 1,
                    success: true
                }
            };

            const testPath = path.join(testOutputDir, 'source.json');
            await fs.writeFile(testPath, JSON.stringify(testConversation), 'utf-8');

            const replayer = await ConversationReplayer.load(testPath);

            // Export as markdown
            const mdPath = path.join(testOutputDir, 'exported.md');
            await replayer.exportToFormat('markdown', mdPath);

            const mdContent = await fs.readFile(mdPath, 'utf-8');
            expect(mdContent).toContain('# Conversation Log');
        });
    });

    describe('ConversationBuilder Integration', () => {
        it('should configure logging', () => {
            const conversation = ConversationBuilder.create();

            conversation.withLogging({
                enabled: true,
                outputPath: testOutputDir,
                format: 'json'
            });

            expect(conversation).toBeDefined();
        });

        it('should save conversation log', async () => {
            const conversation = ConversationBuilder.create();

            conversation.withLogging({
                enabled: true,
                outputPath: testOutputDir,
                format: 'json'
            });

            conversation.asUser('Test message');
            conversation.asAssistant('Response');

            const savedPath = await conversation.saveLog();

            expect(savedPath).toBeDefined();
            const exists = await fs.access(savedPath).then(() => true).catch(() => false);
            expect(exists).toBe(true);
        });

        it('should throw error when saving without logging enabled', async () => {
            const conversation = ConversationBuilder.create();
            conversation.asUser('Test');

            await expect(conversation.saveLog()).rejects.toThrow('Logging not enabled');
        });
    });
});

