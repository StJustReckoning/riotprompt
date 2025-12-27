import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationBuilder } from '../src/conversation';
import { ContextManager } from '../src/context-manager';
import type { DynamicContentItem } from '../src/context-manager';

describe('Dynamic Context Injection', () => {
    describe('ContextManager', () => {
        let manager: ContextManager;

        beforeEach(() => {
            manager = new ContextManager();
        });

        it('should track context items', () => {
            manager.track({
                id: 'test-1',
                content: 'Test content',
                title: 'Test',
                category: 'test',
            }, 0);

            expect(manager.hasContext('test-1')).toBe(true);
            expect(manager.get('test-1')?.content).toBe('Test content');
        });

        it('should detect content by hash', () => {
            const content = 'Unique content';
            manager.track({ content, title: 'First' }, 0);

            expect(manager.hasContentHash(content)).toBe(true);
        });

        it('should detect similar content', () => {
            manager.track({ content: 'Hello world', title: 'First' }, 0);

            expect(manager.hasSimilarContent('hello world')).toBe(true);
            expect(manager.hasSimilarContent('Hello world!')).toBe(true);
        });

        it('should get items by category', () => {
            manager.track({ content: 'A', category: 'cat1' }, 0);
            manager.track({ content: 'B', category: 'cat1' }, 1);
            manager.track({ content: 'C', category: 'cat2' }, 2);

            const cat1Items = manager.getByCategory('cat1');
            expect(cat1Items).toHaveLength(2);
        });

        it('should get items by priority', () => {
            manager.track({ content: 'A', priority: 'high' }, 0);
            manager.track({ content: 'B', priority: 'low' }, 1);
            manager.track({ content: 'C', priority: 'high' }, 2);

            const highPriority = manager.getByPriority('high');
            expect(highPriority).toHaveLength(2);
        });

        it('should provide context statistics', () => {
            manager.track({ content: 'A', category: 'cat1', priority: 'high' }, 0);
            manager.track({ content: 'B', category: 'cat1', priority: 'low' }, 1);
            manager.track({ content: 'C', category: 'cat2', priority: 'high' }, 2);

            const stats = manager.getStats();
            expect(stats.totalItems).toBe(3);
            expect(stats.byCategory.get('cat1')).toBe(2);
            expect(stats.byPriority.get('high')).toBe(2);
        });

        it('should remove context items', () => {
            manager.track({ id: 'removable', content: 'Test' }, 0);

            expect(manager.hasContext('removable')).toBe(true);
            manager.remove('removable');
            expect(manager.hasContext('removable')).toBe(false);
        });

        it('should clear all context', () => {
            manager.track({ content: 'A' }, 0);
            manager.track({ content: 'B' }, 1);

            expect(manager.getAll()).toHaveLength(2);
            manager.clear();
            expect(manager.getAll()).toHaveLength(0);
        });
    });

    describe('ConversationBuilder Context Injection', () => {
        let conversation: ConversationBuilder;

        beforeEach(() => {
            conversation = ConversationBuilder.create();
        });

        it('should inject context at end', () => {
            conversation.addUserMessage('First message');

            conversation.injectContext([
                { content: 'Context 1', title: 'C1' }
            ], { position: 'end' });

            expect(conversation.getMessageCount()).toBe(2);
            const messages = conversation.getMessages();
            expect(messages[1].content).toContain('Context 1');
        });

        it('should inject context before last message', () => {
            conversation
                .addUserMessage('First')
                .addAssistantMessage('Second');

            conversation.injectContext([
                { content: 'Injected', title: 'Context' }
            ], { position: 'before-last' });

            const messages = conversation.getMessages();
            expect(messages).toHaveLength(3);
            expect(messages[1].content).toContain('Injected');
            expect(messages[2].role).toBe('assistant');
        });

        it('should inject context after system messages', () => {
            conversation
                .addSystemMessage('System 1')
                .addSystemMessage('System 2')
                .addUserMessage('User message');

            conversation.injectContext([
                { content: 'Context' }
            ], { position: 'after-system' });

            const messages = conversation.getMessages();
            // Should be: system, system, context, user
            expect(messages[2].content).toContain('Context');
        });

        it('should inject at numeric position', () => {
            conversation
                .addUserMessage('First')
                .addAssistantMessage('Second')
                .addUserMessage('Third');

            conversation.injectContext([
                { content: 'At position 1' }
            ], { position: 1 });

            const messages = conversation.getMessages();
            expect(messages[1].content).toContain('At position 1');
        });

        it('should deduplicate by ID', () => {
            const context: DynamicContentItem[] = [
                { id: 'ctx1', content: 'Test' }
            ];

            conversation.injectContext(context, { deduplicate: true, deduplicateBy: 'id' });
            conversation.injectContext(context, { deduplicate: true, deduplicateBy: 'id' });

            expect(conversation.getMessageCount()).toBe(1);
        });

        it('should deduplicate by content hash', () => {
            const content = 'Same content';

            conversation.injectContext([
                { content, title: 'First' }
            ], { deduplicate: true, deduplicateBy: 'hash' });

            conversation.injectContext([
                { content, title: 'Second' }
            ], { deduplicate: true, deduplicateBy: 'hash' });

            expect(conversation.getMessageCount()).toBe(1);
        });

        it('should deduplicate by similar content', () => {
            conversation.injectContext([
                { content: 'Hello World' }
            ], { deduplicate: true, deduplicateBy: 'content' });

            conversation.injectContext([
                { content: 'hello world' }  // Different case, similar
            ], { deduplicate: true, deduplicateBy: 'content' });

            expect(conversation.getMessageCount()).toBe(1);
        });

        it('should not deduplicate when disabled', () => {
            const context: DynamicContentItem[] = [
                { id: 'ctx1', content: 'Test' }
            ];

            conversation.injectContext(context, { deduplicate: false });
            conversation.injectContext(context, { deduplicate: false });

            expect(conversation.getMessageCount()).toBe(2);
        });

        it('should format context as structured', () => {
            conversation.injectContext([
                {
                    content: 'Test content',
                    title: 'Test Title',
                    source: 'tool:test',
                    timestamp: new Date('2025-01-01T00:00:00Z')
                }
            ], { format: 'structured' });

            const messages = conversation.getMessages();
            const content = messages[0].content as string;

            expect(content).toContain('## Test Title');
            expect(content).toContain('Test content');
            expect(content).toContain('Source: tool:test');
            expect(content).toContain('2025-01-01T00:00:00');
        });

        it('should format context as inline', () => {
            conversation.injectContext([
                {
                    content: 'Test content',
                    title: 'Test Title'
                }
            ], { format: 'inline' });

            const messages = conversation.getMessages();
            const content = messages[0].content as string;

            expect(content).toContain('Note:');
            expect(content).toContain('Test Title');
            expect(content).toContain('Test content');
        });

        it('should format context as reference', () => {
            conversation.injectContext([
                {
                    id: 'ref123',
                    content: 'Test content',
                    title: 'Test Title'
                }
            ], { format: 'reference' });

            const messages = conversation.getMessages();
            const content = messages[0].content as string;

            expect(content).toContain('[Context Reference: ref123]');
            expect(content).toContain('Test Title');
        });

        it('should apply metadata from options', () => {
            conversation.injectContext([
                { content: 'Test' }
            ], {
                priority: 'high',
                weight: 2.0,
                category: 'important',
                source: 'user'
            });

            const contextManager = conversation.getContextManager();
            const items = contextManager.getAll();

            expect(items[0].priority).toBe('high');
            expect(items[0].weight).toBe(2.0);
            expect(items[0].category).toBe('important');
            expect(items[0].source).toBe('user');
        });

        it('should track injected context', () => {
            conversation.injectContext([
                { id: 'tracked', content: 'Test', category: 'test' }
            ]);

            const contextManager = conversation.getContextManager();
            expect(contextManager.hasContext('tracked')).toBe(true);

            const item = contextManager.get('tracked');
            expect(item?.category).toBe('test');
        });

        it('should inject multiple items at once', () => {
            conversation.injectContext([
                { content: 'Item 1', title: 'First' },
                { content: 'Item 2', title: 'Second' },
                { content: 'Item 3', title: 'Third' }
            ]);

            const messages = conversation.getMessages();
            expect(messages).toHaveLength(3);
        });

        it('should handle empty context array', () => {
            conversation.injectContext([]);

            expect(conversation.getMessageCount()).toBe(0);
        });

        it('should handle context with no title', () => {
            conversation.injectContext([
                { content: 'No title context' }
            ], { format: 'structured' });

            const messages = conversation.getMessages();
            const content = messages[0].content as string;
            expect(content).toContain('## Context');
        });
    });

    describe('Context Manager Integration', () => {
        let conversation: ConversationBuilder;

        beforeEach(() => {
            conversation = ConversationBuilder.create();
        });

        it('should provide access to context manager', () => {
            const manager = conversation.getContextManager();
            expect(manager).toBeInstanceOf(ContextManager);
        });

        it('should query context after injection', () => {
            conversation.injectContext([
                { content: 'File 1', category: 'source-code' },
                { content: 'File 2', category: 'source-code' },
                { content: 'Test 1', category: 'tests' }
            ]);

            const manager = conversation.getContextManager();
            const sourceFiles = manager.getByCategory('source-code');
            expect(sourceFiles).toHaveLength(2);
        });

        it('should track categories', () => {
            conversation.injectContext([
                { content: 'A', category: 'cat1' },
                { content: 'B', category: 'cat2' },
                { content: 'C', category: 'cat1' }
            ]);

            const manager = conversation.getContextManager();
            const categories = manager.getCategories();
            expect(categories).toContain('cat1');
            expect(categories).toContain('cat2');
        });

        it('should provide statistics', () => {
            conversation.injectContext([
                { content: 'High', priority: 'high' },
                { content: 'Low', priority: 'low' },
                { content: 'Medium', priority: 'medium' }
            ]);

            const stats = conversation.getContextManager().getStats();
            expect(stats.totalItems).toBe(3);
            expect(stats.byPriority.get('high')).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        let conversation: ConversationBuilder;

        beforeEach(() => {
            conversation = ConversationBuilder.create();
        });

        it('should handle very long content', () => {
            const longContent = 'A'.repeat(10000);

            conversation.injectContext([
                { content: longContent, title: 'Long' }
            ]);

            expect(conversation.getMessageCount()).toBe(1);
        });

        it('should handle special characters in content', () => {
            const specialContent = 'Content with "quotes" and \n newlines and <tags>';

            conversation.injectContext([
                { content: specialContent }
            ]);

            const messages = conversation.getMessages();
            expect(messages[0].content).toContain(specialContent);
        });

        it('should handle numeric position beyond length', () => {
            conversation.addUserMessage('First');

            conversation.injectContext([
                { content: 'Test' }
            ], { position: 100 });  // Way beyond length

            // Should clamp to end
            expect(conversation.getMessageCount()).toBe(2);
        });

        it('should handle negative numeric position', () => {
            conversation.addUserMessage('First');

            conversation.injectContext([
                { content: 'Test' }
            ], { position: -5 });  // Negative

            // Should clamp to 0
            expect(conversation.getMessageCount()).toBe(2);
        });

        it('should handle injection into empty conversation', () => {
            conversation.injectContext([
                { content: 'First context' }
            ]);

            expect(conversation.getMessageCount()).toBe(1);
        });

        it('should handle before-last with only one message', () => {
            conversation.addUserMessage('Only message');

            conversation.injectContext([
                { content: 'Context' }
            ], { position: 'before-last' });

            const messages = conversation.getMessages();
            expect(messages[0].content).toContain('Context');
        });

        it('should handle after-system with no system messages', () => {
            conversation.addUserMessage('User message');

            conversation.injectContext([
                { content: 'Context' }
            ], { position: 'after-system' });

            // Should inject at position 0 (beginning)
            const messages = conversation.getMessages();
            expect(messages[0].content).toContain('Context');
        });
    });
});

