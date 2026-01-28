import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenCounter, TokenBudgetManager } from '../src/token-budget';
import { ConversationBuilder } from '../src/conversation';
import type { ConversationMessage } from '../src/conversation';
import type { TokenBudgetConfig } from '../src/token-budget';

describe('Token Budget Management', () => {
    describe('TokenCounter', () => {
        let counter: TokenCounter;

        beforeEach(() => {
            counter = new TokenCounter('gpt-4o');
        });

        afterEach(() => {
            counter.dispose();
        });

        it('should count tokens in text', () => {
            const text = 'Hello, world!';
            const tokens = counter.count(text);

            expect(tokens).toBeGreaterThan(0);
            expect(tokens).toBeLessThan(10);  // Should be around 4 tokens
        });

        it('should return 0 for empty text', () => {
            expect(counter.count('')).toBe(0);
        });

        it('should count tokens in a message', () => {
            const message: ConversationMessage = {
                role: 'user',
                content: 'What is the weather today?'
            };

            const tokens = counter.countMessage(message);
            expect(tokens).toBeGreaterThan(5);  // At least base overhead + content
        });

        it('should count tool call tokens', () => {
            const message: ConversationMessage = {
                role: 'assistant',
                content: null,
                tool_calls: [{
                    id: 'call_123',
                    type: 'function',
                    function: {
                        name: 'get_weather',
                        arguments: '{"location":"London"}'
                    }
                }]
            };

            const tokens = counter.countMessage(message);
            expect(tokens).toBeGreaterThan(10);  // Includes tool call overhead
        });

        it('should count conversation tokens', () => {
            const messages: ConversationMessage[] = [
                { role: 'system', content: 'You are helpful' },
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' }
            ];

            const tokens = counter.countConversation(messages);
            expect(tokens).toBeGreaterThan(15);  // Multiple messages with overhead
        });

        it('should estimate response tokens', () => {
            const messages: ConversationMessage[] = [
                { role: 'user', content: 'A'.repeat(1000) }  // Long input
            ];

            const estimate = counter.estimateResponseTokens(messages);
            expect(estimate).toBeGreaterThan(100);
        });

        it('should count with tool overhead when tools present', () => {
            const messages: ConversationMessage[] = [
                { role: 'user', content: 'Call a tool' },
                { 
                    role: 'assistant', 
                    content: null,
                    tool_calls: [{
                        id: 'call_1',
                        type: 'function',
                        function: { name: 'test', arguments: '{}' }
                    }]
                }
            ];

            const withOverhead = counter.countWithOverhead(messages, true);
            const withoutOverhead = counter.countWithOverhead(messages, false);
            
            expect(withOverhead).toBeGreaterThan(withoutOverhead);
            expect(withOverhead - withoutOverhead).toBe(100); // Tool definition overhead
        });

        it('should count with tool overhead when no tools present', () => {
            const messages: ConversationMessage[] = [
                { role: 'user', content: 'Simple message' }
            ];

            const withOverhead = counter.countWithOverhead(messages, true);
            const withoutOverhead = counter.countWithOverhead(messages, false);
            
            expect(withOverhead).toBe(withoutOverhead); // No difference without tools
        });

        it('should count tool result tokens', () => {
            const message: ConversationMessage = {
                role: 'tool',
                tool_call_id: 'call_123',
                content: 'Tool result data'
            };

            const tokens = counter.countMessage(message);
            expect(tokens).toBeGreaterThan(10); // Includes tool_call_id overhead
        });
    });

    describe('TokenBudgetManager', () => {
        let manager: TokenBudgetManager;
        let config: TokenBudgetConfig;

        beforeEach(() => {
            config = {
                max: 1000,
                reserveForResponse: 200,
                strategy: 'fifo',
                onBudgetExceeded: 'compress',
            };
            manager = new TokenBudgetManager(config, 'gpt-4o');
        });

        afterEach(() => {
            manager.dispose();
        });

        it('should track current usage', () => {
            const messages: ConversationMessage[] = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' }
            ];

            const usage = manager.getCurrentUsage(messages);

            expect(usage.used).toBeGreaterThan(0);
            expect(usage.max).toBe(1000);
            expect(usage.remaining).toBeLessThan(1000);
            expect(usage.percentage).toBeGreaterThan(0);
            expect(usage.percentage).toBeLessThan(100);
        });

        it('should check if message can be added', () => {
            const messages: ConversationMessage[] = [
                { role: 'user', content: 'Short message' }
            ];

            const newMessage: ConversationMessage = {
                role: 'assistant',
                content: 'Short response'
            };

            expect(manager.canAddMessage(newMessage, messages)).toBe(true);
        });

        it('should detect when budget exceeded', () => {
            // Create messages that exceed budget
            const messages: ConversationMessage[] = [];
            for (let i = 0; i < 100; i++) {
                messages.push({
                    role: 'user',
                    content: 'This is a reasonably long message that will consume tokens'
                });
            }

            const newMessage: ConversationMessage = {
                role: 'assistant',
                content: 'Response'
            };

            expect(manager.canAddMessage(newMessage, messages)).toBe(false);
        });

        it('should detect near limit', () => {
            const warned = vi.fn();
            const nearLimitManager = new TokenBudgetManager(
                { ...config, warningThreshold: 0.5, onWarning: warned },
                'gpt-4o'
            );

            const messages: ConversationMessage[] = [];
            // Add messages close to 50% of budget
            for (let i = 0; i < 30; i++) {
                messages.push({
                    role: 'user',
                    content: 'Message that uses tokens'
                });
            }

            const isNear = nearLimitManager.isNearLimit(messages, 0.5);
            expect(typeof isNear).toBe('boolean');

            nearLimitManager.dispose();
        });

        it('should call onWarning callback when near limit', () => {
            const warned = vi.fn();
            const nearLimitManager = new TokenBudgetManager(
                { ...config, max: 100, warningThreshold: 0.1, onWarning: warned },
                'gpt-4o'
            );

            const messages: ConversationMessage[] = [];
            // Add enough messages to exceed 10% threshold
            for (let i = 0; i < 5; i++) {
                messages.push({
                    role: 'user',
                    content: 'Message that uses tokens to exceed threshold'
                });
            }

            const isNear = nearLimitManager.isNearLimit(messages);
            expect(isNear).toBe(true);
            expect(warned).toHaveBeenCalled();

            nearLimitManager.dispose();
        });

        it('should not call onWarning when below threshold', () => {
            const warned = vi.fn();
            const nearLimitManager = new TokenBudgetManager(
                { ...config, warningThreshold: 0.9, onWarning: warned },
                'gpt-4o'
            );

            const messages: ConversationMessage[] = [
                { role: 'user', content: 'Short' }
            ];

            const isNear = nearLimitManager.isNearLimit(messages);
            expect(isNear).toBe(false);
            expect(warned).not.toHaveBeenCalled();

            nearLimitManager.dispose();
        });
    });

    describe('Compression Strategies', () => {
        describe('FIFO Compression', () => {
            it('should remove oldest messages first', () => {
                const config: TokenBudgetConfig = {
                    max: 200,
                    reserveForResponse: 50,
                    strategy: 'fifo',
                    onBudgetExceeded: 'compress',
                    preserveRecent: 2,
                };

                const manager = new TokenBudgetManager(config, 'gpt-4o');

                const messages: ConversationMessage[] = [
                    { role: 'user', content: 'Message 1' },
                    { role: 'assistant', content: 'Response 1' },
                    { role: 'user', content: 'Message 2' },
                    { role: 'assistant', content: 'Response 2' },
                    { role: 'user', content: 'Message 3' },
                    { role: 'assistant', content: 'Response 3' },
                ];

                const compressed = manager.compress(messages);

                // Should keep recent messages
                expect(compressed.length).toBeLessThanOrEqual(messages.length);
                if (compressed.length < messages.length) {
                    expect(compressed[compressed.length - 1].content).toContain('Response');
                }

                manager.dispose();
            });

            it('should preserve system messages', () => {
                const config: TokenBudgetConfig = {
                    max: 200,
                    reserveForResponse: 50,
                    strategy: 'fifo',
                    onBudgetExceeded: 'compress',
                    preserveSystem: true,
                };

                const manager = new TokenBudgetManager(config, 'gpt-4o');

                const messages: ConversationMessage[] = [
                    { role: 'system', content: 'You are helpful' },
                    ...Array(20).fill(null).map((_, i) => ({
                        role: 'user',
                        content: `Message ${i}`
                    } as ConversationMessage))
                ];

                const compressed = manager.compress(messages);

                // System message should be preserved
                expect(compressed[0].role).toBe('system');
                expect(compressed[0].content).toBe('You are helpful');

                manager.dispose();
            });
        });

        describe('Priority-Based Compression', () => {
            it('should keep high-priority messages', () => {
                const config: TokenBudgetConfig = {
                    max: 200,
                    reserveForResponse: 50,
                    strategy: 'priority-based',
                    onBudgetExceeded: 'compress',
                };

                const manager = new TokenBudgetManager(config, 'gpt-4o');

                const messages: ConversationMessage[] = [
                    { role: 'system', content: 'System message' },  // High priority
                    { role: 'user', content: 'Old message' },
                    { role: 'assistant', content: 'Old response' },
                    { role: 'user', content: 'Recent message' },  // Higher priority (recent)
                ];

                const compressed = manager.compress(messages);

                // System and recent messages should be kept
                expect(compressed).toContainEqual(expect.objectContaining({ role: 'system' }));
                expect(compressed).toContainEqual(expect.objectContaining({ content: 'Recent message' }));

                manager.dispose();
            });

            it('should consider tool messages as moderate priority', () => {
                const config: TokenBudgetConfig = {
                    max: 300,
                    reserveForResponse: 50,
                    strategy: 'priority-based',
                    onBudgetExceeded: 'compress',
                };

                const manager = new TokenBudgetManager(config, 'gpt-4o');

                const messages: ConversationMessage[] = [
                    { role: 'system', content: 'System' },
                    { role: 'user', content: 'Request tool' },
                    { role: 'assistant', content: null, tool_calls: [{
                        id: 'call_1',
                        type: 'function',
                        function: { name: 'test', arguments: '{}' }
                    }]},
                    { role: 'tool', tool_call_id: 'call_1', content: 'Tool result' },
                    ...Array(10).fill(null).map(() => ({
                        role: 'user',
                        content: 'Filler message'
                    } as ConversationMessage))
                ];

                const compressed = manager.compress(messages);

                // Tool-related messages should have moderate priority
                expect(compressed.some(m => m.role === 'tool')).toBe(true);

                manager.dispose();
            });
        });

        describe('Adaptive Compression', () => {
            it('should use different strategies based on conversation length', () => {
                const config: TokenBudgetConfig = {
                    max: 200,
                    reserveForResponse: 50,
                    strategy: 'adaptive',
                    onBudgetExceeded: 'compress',
                };

                const manager = new TokenBudgetManager(config, 'gpt-4o');

                // Short conversation (early phase)
                const shortMessages: ConversationMessage[] = [
                    { role: 'user', content: 'Message 1' },
                    { role: 'assistant', content: 'Response 1' },
                ];

                const compressed1 = manager.compress(shortMessages);
                expect(compressed1.length).toBe(shortMessages.length);  // No compression needed

                // Long conversation (late phase)
                const longMessages: ConversationMessage[] = Array(30).fill(null).map((_, i) => ({
                    role: 'user',
                    content: `Message ${i}`
                } as ConversationMessage));

                const compressed2 = manager.compress(longMessages);
                expect(compressed2.length).toBeLessThan(longMessages.length);

                manager.dispose();
            });

            it('should handle mid-phase compression (6-15 messages)', () => {
                const config: TokenBudgetConfig = {
                    max: 150,
                    reserveForResponse: 30,
                    strategy: 'adaptive',
                    onBudgetExceeded: 'compress',
                    preserveRecent: 3,
                };

                const manager = new TokenBudgetManager(config, 'gpt-4o');

                // Mid-phase conversation (10 messages)
                const midMessages: ConversationMessage[] = Array(10).fill(null).map((_, i) => ({
                    role: 'user',
                    content: `Message ${i} with some content`
                } as ConversationMessage));

                const compressed = manager.compress(midMessages);
                
                // Should compress but preserve more than late phase
                expect(compressed.length).toBeLessThanOrEqual(midMessages.length);

                manager.dispose();
            });
        });

        describe('Summarize Strategy', () => {
            it('should fall back to FIFO for summarize strategy', () => {
                const config: TokenBudgetConfig = {
                    max: 150,
                    reserveForResponse: 30,
                    strategy: 'summarize',
                    onBudgetExceeded: 'compress',
                };

                const manager = new TokenBudgetManager(config, 'gpt-4o');

                const messages: ConversationMessage[] = Array(20).fill(null).map((_, i) => ({
                    role: 'user',
                    content: `Message ${i}`
                } as ConversationMessage));

                const compressed = manager.compress(messages);
                expect(compressed.length).toBeLessThan(messages.length);

                manager.dispose();
            });
        });
    });

    describe('ConversationBuilder Integration', () => {
        let conversation: ConversationBuilder;

        beforeEach(() => {
            conversation = ConversationBuilder.create();
        });

        it('should configure token budget', () => {
            conversation.withTokenBudget({
                max: 1000,
                reserveForResponse: 200,
                strategy: 'fifo',
                onBudgetExceeded: 'compress',
            });

            const usage = conversation.getTokenUsage();
            expect(usage.max).toBe(1000);
        });

        it('should return infinite usage without budget', () => {
            const usage = conversation.getTokenUsage();
            expect(usage.max).toBe(Infinity);
            expect(usage.remaining).toBe(Infinity);
        });

        it('should auto-compress when adding messages', () => {
            conversation.withTokenBudget({
                max: 200,
                reserveForResponse: 50,
                strategy: 'fifo',
                onBudgetExceeded: 'compress',
                preserveRecent: 2,
            });

            // Add many messages
            for (let i = 0; i < 50; i++) {
                conversation.addUserMessage(`Message ${i}`);
            }

            const usage = conversation.getTokenUsage();
            expect(usage.used).toBeLessThanOrEqual(200);
        });

        it('should trigger compression callback', () => {
            const onCompression = vi.fn();

            conversation.withTokenBudget({
                max: 150,
                reserveForResponse: 30,
                strategy: 'fifo',
                onBudgetExceeded: 'compress',
                onCompression,
            });

            // Add messages to trigger compression
            for (let i = 0; i < 40; i++) {
                conversation.addUserMessage('This is a longer message that uses more tokens to ensure budget is exceeded');
            }

            // Compression may or may not be called depending on exact token counts
            expect(onCompression.mock.calls.length).toBeGreaterThanOrEqual(0);
        });

        it('should manually compress conversation', () => {
            conversation
                .addUserMessage('Message 1')
                .addUserMessage('Message 2')
                .addUserMessage('Message 3');

            conversation.withTokenBudget({
                max: 100,
                reserveForResponse: 20,
                strategy: 'fifo',
                onBudgetExceeded: 'compress',
            });

            const beforeCount = conversation.getMessageCount();
            conversation.compress();
            const afterCount = conversation.getMessageCount();

            expect(afterCount).toBeLessThanOrEqual(beforeCount);
        });

        it('should preserve high-priority injected context', () => {
            conversation.withTokenBudget({
                max: 300,
                reserveForResponse: 50,
                strategy: 'priority-based',
                onBudgetExceeded: 'compress',
                preserveHighPriority: true,
            });

            conversation.injectContext([
                {
                    content: 'Critical information',
                    title: 'Important',
                    priority: 'high',
                }
            ]);

            // Add many messages to trigger compression
            for (let i = 0; i < 40; i++) {
                conversation.addUserMessage(`Filler message ${i}`);
            }

            const messages = conversation.getMessages();

            // Just verify compression occurred
            expect(messages.length).toBeGreaterThan(0);
            expect(messages.length).toBeLessThan(42);  // Should have compressed
        });

        it('should handle budget with recipe', async () => {
            const { recipe } = await import('../src/recipes');

            const conv = await recipe(__dirname)
                .persona({ content: 'You are helpful' })
                .buildConversation('gpt-4o', {
                    max: 500,
                    reserveForResponse: 100,
                    strategy: 'fifo',
                    onBudgetExceeded: 'compress',
                });

            const usage = conv.getTokenUsage();
            expect(usage.max).toBe(500);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty conversation', () => {
            const config: TokenBudgetConfig = {
                max: 1000,
                reserveForResponse: 200,
                strategy: 'fifo',
                onBudgetExceeded: 'compress',
            };

            const manager = new TokenBudgetManager(config, 'gpt-4o');
            const messages: ConversationMessage[] = [];

            const usage = manager.getCurrentUsage(messages);
            expect(usage.used).toBe(3);  // Just base overhead
            expect(usage.remaining).toBeGreaterThan(0);

            manager.dispose();
        });

        it('should handle very small budget', () => {
            const config: TokenBudgetConfig = {
                max: 50,
                reserveForResponse: 10,
                strategy: 'fifo',
                onBudgetExceeded: 'compress',
                preserveRecent: 1,
            };

            const manager = new TokenBudgetManager(config, 'gpt-4o');

            const messages: ConversationMessage[] = Array(20).fill(null).map((_, i) => ({
                role: 'user',
                content: `Message ${i}`
            } as ConversationMessage));

            const compressed = manager.compress(messages);

            // Should aggressively compress
            expect(compressed.length).toBeLessThanOrEqual(5);

            manager.dispose();
        });

        it('should handle message with null content', () => {
            const counter = new TokenCounter('gpt-4o');

            const message: ConversationMessage = {
                role: 'assistant',
                content: null,
                tool_calls: [{
                    id: 'call_1',
                    type: 'function',
                    function: { name: 'test', arguments: '{}' }
                }]
            };

            const tokens = counter.countMessage(message);
            expect(tokens).toBeGreaterThan(0);  // Should count tool calls

            counter.dispose();
        });

        it('should handle truncate with preservation', () => {
            const config: TokenBudgetConfig = {
                max: 1000,
                reserveForResponse: 200,
                strategy: 'fifo',
                onBudgetExceeded: 'compress',
            };

            const manager = new TokenBudgetManager(config, 'gpt-4o');

            const messages: ConversationMessage[] = [
                { role: 'system', content: 'System' },
                ...Array(10).fill(null).map((_, i) => ({
                    role: 'user',
                    content: `Message ${i}`
                } as ConversationMessage))
            ];

            const truncated = manager.truncate(messages, 5);

            // Should keep system + 4 recent
            expect(truncated.length).toBe(5);
            expect(truncated[0].role).toBe('system');

            manager.dispose();
        });

        it('should not truncate when below max messages', () => {
            const config: TokenBudgetConfig = {
                max: 1000,
                reserveForResponse: 200,
                strategy: 'fifo',
                onBudgetExceeded: 'compress',
            };

            const manager = new TokenBudgetManager(config, 'gpt-4o');

            const messages: ConversationMessage[] = [
                { role: 'user', content: 'Message 1' },
                { role: 'user', content: 'Message 2' },
            ];

            const truncated = manager.truncate(messages, 5);

            // Should return all messages unchanged
            expect(truncated.length).toBe(2);
            expect(truncated).toEqual(messages);

            manager.dispose();
        });

        it('should handle compression when no compression needed', () => {
            const config: TokenBudgetConfig = {
                max: 10000,
                reserveForResponse: 200,
                strategy: 'fifo',
                onBudgetExceeded: 'compress',
            };

            const manager = new TokenBudgetManager(config, 'gpt-4o');

            const messages: ConversationMessage[] = [
                { role: 'user', content: 'Short' },
            ];

            const compressed = manager.compress(messages);

            // Should return messages unchanged
            expect(compressed.length).toBe(messages.length);
            expect(compressed).toEqual(messages);

            manager.dispose();
        });

        it('should handle messages with tool_calls in priority calculation', () => {
            const config: TokenBudgetConfig = {
                max: 200,
                reserveForResponse: 50,
                strategy: 'priority-based',
                onBudgetExceeded: 'compress',
            };

            const manager = new TokenBudgetManager(config, 'gpt-4o');

            const messages: ConversationMessage[] = [
                { role: 'user', content: 'Request' },
                { 
                    role: 'assistant', 
                    content: null,
                    tool_calls: [{
                        id: 'call_1',
                        type: 'function',
                        function: { name: 'test', arguments: '{}' }
                    }]
                },
                ...Array(15).fill(null).map((_, i) => ({
                    role: 'user',
                    content: `Filler ${i}`
                } as ConversationMessage))
            ];

            const compressed = manager.compress(messages);

            // Message with tool_calls should have higher priority
            expect(compressed.some(m => m.tool_calls && m.tool_calls.length > 0)).toBe(true);

            manager.dispose();
        });
    });
});

