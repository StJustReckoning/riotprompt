import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationBuilder } from '../src/conversation';
import { createPrompt, createSection, createInstruction, createContent } from '../src/riotprompt';
import type { Prompt } from '../src/prompt';
import type { ToolCall } from '../src/conversation';

describe('ConversationBuilder', () => {
    describe('Creation and Initialization', () => {
        it('should create a new conversation builder with default config', () => {
            const conversation = ConversationBuilder.create();

            expect(conversation).toBeDefined();
            expect(conversation.getMessageCount()).toBe(0);
            expect(conversation.hasToolCalls()).toBe(false);
        });

        it('should create with custom model', () => {
            const conversation = ConversationBuilder.create({ model: 'gpt-4o-mini' });
            const metadata = conversation.getMetadata();

            expect(metadata.model).toBe('gpt-4o-mini');
        });

        it('should initialize from a prompt', async () => {
            const personaSection = createSection({ title: 'Persona' });
            personaSection.add(createInstruction('You are a helpful assistant', { weight: 1.0 }));

            const instructionSection = createSection({ title: 'Instructions' });
            instructionSection.add(createInstruction('Be concise and clear', { weight: 1.0 }));

            const contentSection = createSection({ title: 'Content' });
            contentSection.add(createContent('Hello, how can I help?', { weight: 1.0 }));

            const prompt: Prompt = createPrompt({
                persona: personaSection,
                instructions: instructionSection,
                contents: contentSection,
            });

            const conversation = ConversationBuilder.create();
            conversation.fromPrompt(prompt, 'gpt-4o');

            expect(conversation.getMessageCount()).toBeGreaterThan(0);
            const messages = conversation.getMessages();
            expect(messages[0].role).toBe('system');
        });

        it('should track context provided when enabled', () => {
            const conversation = ConversationBuilder.create({ trackContext: true });

            conversation.injectContext([
                { content: 'First context', title: 'Context 1' }
            ]);

            expect(conversation.getMessageCount()).toBe(1);
        });

        it('should deduplicate context when enabled', () => {
            const conversation = ConversationBuilder.create({
                trackContext: true,
                deduplicateContext: true
            });

            conversation.injectContext([
                { id: 'same-id', content: 'Duplicate context', title: 'Same' }
            ], { deduplicate: true, deduplicateBy: 'id' });

            conversation.injectContext([
                { id: 'same-id', content: 'Duplicate context', title: 'Same' }
            ], { deduplicate: true, deduplicateBy: 'id' });

            // Should only add once due to deduplication
            expect(conversation.getMessageCount()).toBe(1);
        });
    });

    describe('Message Management', () => {
        let conversation: ConversationBuilder;

        beforeEach(() => {
            conversation = ConversationBuilder.create();
        });

        it('should add system message', () => {
            conversation.addSystemMessage('You are an AI assistant');

            const messages = conversation.getMessages();
            expect(messages).toHaveLength(1);
            expect(messages[0].role).toBe('system');
            expect(messages[0].content).toBe('You are an AI assistant');
        });

        it('should add user message', () => {
            conversation.addUserMessage('What is the weather?');

            const messages = conversation.getMessages();
            expect(messages).toHaveLength(1);
            expect(messages[0].role).toBe('user');
            expect(messages[0].content).toBe('What is the weather?');
        });

        it('should add assistant message', () => {
            conversation.addAssistantMessage('The weather is sunny');

            const messages = conversation.getMessages();
            expect(messages).toHaveLength(1);
            expect(messages[0].role).toBe('assistant');
            expect(messages[0].content).toBe('The weather is sunny');
        });

        it('should add multiple messages in sequence', () => {
            conversation
                .addSystemMessage('You are helpful')
                .addUserMessage('Hello')
                .addAssistantMessage('Hi there!');

            expect(conversation.getMessageCount()).toBe(3);

            const messages = conversation.getMessages();
            expect(messages[0].role).toBe('system');
            expect(messages[1].role).toBe('user');
            expect(messages[2].role).toBe('assistant');
        });

        it('should get last message', () => {
            conversation
                .addUserMessage('First')
                .addAssistantMessage('Second');

            const lastMessage = conversation.getLastMessage();
            expect(lastMessage?.role).toBe('assistant');
            expect(lastMessage?.content).toBe('Second');
        });

        it('should return undefined for last message when empty', () => {
            const lastMessage = conversation.getLastMessage();
            expect(lastMessage).toBeUndefined();
        });
    });

    describe('Tool Call Management', () => {
        let conversation: ConversationBuilder;

        beforeEach(() => {
            conversation = ConversationBuilder.create();
        });

        it('should add assistant message with tool calls', () => {
            const toolCalls: ToolCall[] = [{
                id: 'call_123',
                type: 'function',
                function: {
                    name: 'get_weather',
                    arguments: '{"location":"London"}'
                }
            }];

            conversation.addAssistantWithToolCalls(null, toolCalls);

            const messages = conversation.getMessages();
            expect(messages).toHaveLength(1);
            expect(messages[0].role).toBe('assistant');
            expect(messages[0].tool_calls).toHaveLength(1);
            expect(messages[0].tool_calls![0].function.name).toBe('get_weather');
            expect(conversation.hasToolCalls()).toBe(true);
        });

        it('should add tool result message', () => {
            conversation.addToolResult('call_123', 'Sunny, 22°C', 'get_weather');

            const messages = conversation.getMessages();
            expect(messages).toHaveLength(1);
            expect(messages[0].role).toBe('tool');
            expect(messages[0].tool_call_id).toBe('call_123');
            expect(messages[0].content).toBe('Sunny, 22°C');
            expect(messages[0].name).toBe('get_weather');
        });

        it('should track tool call count in metadata', () => {
            const toolCalls: ToolCall[] = [
                {
                    id: 'call_1',
                    type: 'function',
                    function: { name: 'tool1', arguments: '{}' }
                },
                {
                    id: 'call_2',
                    type: 'function',
                    function: { name: 'tool2', arguments: '{}' }
                }
            ];

            conversation.addAssistantWithToolCalls(null, toolCalls);

            const metadata = conversation.getMetadata();
            expect(metadata.toolCallCount).toBe(2);
        });

        it('should handle complete tool call cycle', () => {
            conversation.addUserMessage('What is the weather in London?');

            conversation.addAssistantWithToolCalls(null, [{
                id: 'call_123',
                type: 'function',
                function: {
                    name: 'get_weather',
                    arguments: '{"location":"London"}'
                }
            }]);

            conversation.addToolResult('call_123', 'Sunny, 22°C');

            conversation.addAssistantMessage('The weather in London is sunny with a temperature of 22°C.');

            expect(conversation.getMessageCount()).toBe(4);
            expect(conversation.hasToolCalls()).toBe(true);
        });
    });

    describe('Context Injection', () => {
        let conversation: ConversationBuilder;

        beforeEach(() => {
            conversation = ConversationBuilder.create();
        });

        it('should inject context at end', () => {
            conversation.addUserMessage('Initial message');

            conversation.injectContext([
                { content: 'Additional context', title: 'Context' }
            ]);

            expect(conversation.getMessageCount()).toBe(2);
            const lastMessage = conversation.getLastMessage();
            expect(lastMessage?.content).toContain('Additional context');
        });

        it('should inject context before last message', () => {
            conversation
                .addUserMessage('First')
                .addAssistantMessage('Second');

            conversation.injectContext([
                { content: 'Injected context' }
            ], { position: 'before-last' });

            const messages = conversation.getMessages();
            expect(messages).toHaveLength(3);
            expect(messages[1].content).toContain('Injected context');
            expect(messages[2].role).toBe('assistant');
        });

        it('should inject multiple context items', () => {
            conversation.injectContext([
                { content: 'Context 1', title: 'First' },
                { content: 'Context 2', title: 'Second' }
            ]);

            const messages = conversation.getMessages();
            // Each context item becomes a separate message
            expect(messages.length).toBeGreaterThanOrEqual(2);
            const allContent = messages.map(m => m.content).join(' ');
            expect(allContent).toContain('Context 1');
            expect(allContent).toContain('Context 2');
        });

        it('should inject system context', () => {
            conversation.injectSystemContext('System-level context');

            const messages = conversation.getMessages();
            expect(messages[0].role).toBe('system');
            expect(messages[0].content).toBe('System-level context');
        });
    });

    describe('Conversation Manipulation', () => {
        let conversation: ConversationBuilder;

        beforeEach(() => {
            conversation = ConversationBuilder.create();
            conversation
                .addSystemMessage('System')
                .addUserMessage('User 1')
                .addAssistantMessage('Assistant 1')
                .addUserMessage('User 2')
                .addAssistantMessage('Assistant 2');
        });

        it('should truncate conversation', () => {
            expect(conversation.getMessageCount()).toBe(5);

            conversation.truncate(3);

            expect(conversation.getMessageCount()).toBe(3);
            const messages = conversation.getMessages();
            // Should keep last 3: "Assistant 1", "User 2", "Assistant 2"
            expect(messages[0].content).toBe('Assistant 1');
            expect(messages[1].content).toBe('User 2');
            expect(messages[2].content).toBe('Assistant 2');
        });

        it('should not truncate if already below limit', () => {
            conversation.truncate(10);

            expect(conversation.getMessageCount()).toBe(5);
        });

        it('should remove messages of specific type', () => {
            conversation.removeMessagesOfType('user');

            expect(conversation.getMessageCount()).toBe(3);
            const messages = conversation.getMessages();
            expect(messages.every(msg => msg.role !== 'user')).toBe(true);
        });

        it('should clone conversation', () => {
            const cloned = conversation.clone();

            expect(cloned.getMessageCount()).toBe(conversation.getMessageCount());

            // Modify clone
            cloned.addUserMessage('New message');

            // Original should be unchanged
            expect(conversation.getMessageCount()).toBe(5);
            expect(cloned.getMessageCount()).toBe(6);
        });
    });

    describe('Serialization', () => {
        let conversation: ConversationBuilder;

        beforeEach(() => {
            conversation = ConversationBuilder.create({ model: 'gpt-4o' });
            conversation
                .addSystemMessage('You are helpful')
                .addUserMessage('Hello')
                .addAssistantMessage('Hi there!');
        });

        it('should serialize to JSON', () => {
            const json = conversation.toJSON();

            expect(json).toBeDefined();
            const parsed = JSON.parse(json);

            expect(parsed.messages).toHaveLength(3);
            expect(parsed.metadata.model).toBe('gpt-4o');
            expect(parsed.metadata.messageCount).toBe(3);
        });

        it('should restore from JSON', () => {
            const json = conversation.toJSON();

            const restored = ConversationBuilder.fromJSON(json);

            expect(restored.getMessageCount()).toBe(3);
            expect(restored.getMetadata().model).toBe('gpt-4o');

            const messages = restored.getMessages();
            expect(messages[0].content).toBe('You are helpful');
            expect(messages[1].content).toBe('Hello');
            expect(messages[2].content).toBe('Hi there!');
        });

        it('should preserve tool calls in serialization', () => {
            conversation.addAssistantWithToolCalls(null, [{
                id: 'call_123',
                type: 'function',
                function: { name: 'test_tool', arguments: '{}' }
            }]);

            const json = conversation.toJSON();
            const restored = ConversationBuilder.fromJSON(json);

            expect(restored.hasToolCalls()).toBe(true);
            expect(restored.getMetadata().toolCallCount).toBe(1);
        });

        it('should preserve context tracking in serialization', () => {
            const conv = ConversationBuilder.create({ trackContext: true, deduplicateContext: true });
            conv.injectContext([{ id: 'ctx1', content: 'Test', title: 'Context 1' }], {
                deduplicate: true,
                deduplicateBy: 'id'
            });

            const json = conv.toJSON();
            const restored = ConversationBuilder.fromJSON(json, { trackContext: true, deduplicateContext: true });

            // Verify messages were restored
            expect(restored.getMessageCount()).toBe(1);

            // ContextManager state isn't serialized, so new context can be added
            restored.injectContext([{ id: 'ctx2', content: 'New Test', title: 'Context 2' }], {
                deduplicate: true,
                deduplicateBy: 'id'
            });

            // Should now have 2 messages
            expect(restored.getMessageCount()).toBe(2);
        });
    });

    describe('Export Formats', () => {
        let conversation: ConversationBuilder;

        beforeEach(() => {
            conversation = ConversationBuilder.create();
            conversation
                .addSystemMessage('System')
                .addUserMessage('User')
                .addAssistantMessage('Assistant');
        });

        it('should export to OpenAI message format', () => {
            const messages = conversation.toMessages();

            expect(messages).toHaveLength(3);
            expect(messages[0]).toHaveProperty('role');
            expect(messages[0]).toHaveProperty('content');
        });

        it('should create immutable copies when exporting', () => {
            const messages = conversation.toMessages();
            messages[0].content = 'Modified';

            // Original should be unchanged
            const originalMessages = conversation.getMessages();
            expect(originalMessages[0].content).toBe('System');
        });
    });

    describe('Metadata Tracking', () => {
        it('should track message count', () => {
            const conversation = ConversationBuilder.create();

            conversation.addUserMessage('Test');

            const metadata = conversation.getMetadata();
            expect(metadata.messageCount).toBe(1);
        });

        it('should track creation and modification dates', () => {
            const conversation = ConversationBuilder.create();
            const metadata1 = conversation.getMetadata();

            expect(metadata1.created).toBeInstanceOf(Date);
            expect(metadata1.lastModified).toBeInstanceOf(Date);

            // Wait a bit and add message
            setTimeout(() => {
                conversation.addUserMessage('Test');
                const metadata2 = conversation.getMetadata();

                expect(metadata2.lastModified.getTime()).toBeGreaterThanOrEqual(metadata1.lastModified.getTime());
            }, 10);
        });

        it('should track model', () => {
            const conversation = ConversationBuilder.create({ model: 'gpt-4o-mini' });

            const metadata = conversation.getMetadata();
            expect(metadata.model).toBe('gpt-4o-mini');
        });
    });

    describe('Fluent API', () => {
        it('should support method chaining', () => {
            const conversation = ConversationBuilder.create()
                .addSystemMessage('System')
                .addUserMessage('User')
                .addAssistantMessage('Assistant')
                .build();

            expect(conversation.getMessageCount()).toBe(3);
        });

        it('should return self from all builder methods', () => {
            const conversation = ConversationBuilder.create();

            const result1 = conversation.addSystemMessage('Test');
            expect(result1).toBe(conversation);

            const result2 = conversation.addUserMessage('Test');
            expect(result2).toBe(conversation);

            const result3 = conversation.truncate(1);
            expect(result3).toBe(conversation);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty assistant messages', () => {
            const conversation = ConversationBuilder.create();
            conversation.addAssistantMessage(null);

            const messages = conversation.getMessages();
            expect(messages[0].content).toBe('');
        });

        it('should handle messages with special characters', () => {
            const conversation = ConversationBuilder.create();
            const specialText = 'Test with "quotes" and \n newlines';

            conversation.addUserMessage(specialText);

            const messages = conversation.getMessages();
            expect(messages[0].content).toBe(specialText);
        });

        it('should handle very long conversations', () => {
            const conversation = ConversationBuilder.create();

            for (let i = 0; i < 100; i++) {
                conversation.addUserMessage(`Message ${i}`);
            }

            expect(conversation.getMessageCount()).toBe(100);
        });

        it('should handle tool results without tool name', () => {
            const conversation = ConversationBuilder.create();
            conversation.addToolResult('call_123', 'Result');

            const messages = conversation.getMessages();
            expect(messages[0].role).toBe('tool');
            expect(messages[0].name).toBeUndefined();
        });
    });
});

