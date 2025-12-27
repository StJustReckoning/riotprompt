import { describe, it, expect } from 'vitest';
import { MessageBuilder, MessageTemplates } from '../src/message-builder';
import { ConversationBuilder } from '../src/conversation';
import { createSection, createInstruction } from '../src/riotprompt';
import type { ToolCall } from '../src/conversation';

describe('MessageBuilder', () => {
    describe('Creation', () => {
        it('should create system message builder', () => {
            const builder = MessageBuilder.system();
            const message = builder.withContent('Test').build();

            expect(message.role).toBe('system');
            expect(message.content).toBe('Test');
        });

        it('should create user message builder', () => {
            const builder = MessageBuilder.user();
            const message = builder.withContent('Query').build();

            expect(message.role).toBe('user');
            expect(message.content).toBe('Query');
        });

        it('should create assistant message builder', () => {
            const builder = MessageBuilder.assistant();
            const message = builder.withContent('Response').build();

            expect(message.role).toBe('assistant');
            expect(message.content).toBe('Response');
        });

        it('should create tool message builder', () => {
            const builder = MessageBuilder.tool('call_123');
            const message = builder.withResult('result').build();

            expect(message.role).toBe('tool');
            expect(message.tool_call_id).toBe('call_123');
        });

        it('should create developer message builder', () => {
            const builder = MessageBuilder.developer();
            const message = builder.withContent('Developer message').build();

            expect(message.role).toBe('developer');
        });
    });

    describe('Content Building', () => {
        it('should add simple string content', () => {
            const message = MessageBuilder.user()
                .withContent('Hello')
                .build();

            expect(message.content).toBe('Hello');
        });

        it('should add multiple content parts', () => {
            const message = MessageBuilder.user()
                .withContent('Part 1')
                .withContent('Part 2')
                .build();

            expect(message.content).toContain('Part 1');
            expect(message.content).toContain('Part 2');
        });

        it('should add section content', () => {
            const section = createSection({ title: 'Test' });
            section.add(createInstruction('Instruction text', { weight: 1.0 }));

            const message = MessageBuilder.system()
                .withContent(section)
                .build();

            expect(message.content).toContain('Instruction text');
        });

        it('should add persona section', () => {
            const persona = createSection({ title: 'Persona' });
            persona.add(createInstruction('You are helpful', { weight: 1.0 }));

            const message = MessageBuilder.system()
                .withPersona(persona)
                .build();

            expect(message.content).toContain('You are helpful');
        });

        it('should add instructions as array', () => {
            const message = MessageBuilder.system()
                .withInstructions(['Instruction 1', 'Instruction 2'])
                .build();

            expect(message.content).toContain('Instruction 1');
            expect(message.content).toContain('Instruction 2');
        });

        it('should add context as array', () => {
            const message = MessageBuilder.user()
                .withContext([
                    { content: 'Context 1', title: 'C1' },
                    { content: 'Context 2', title: 'C2' }
                ])
                .build();

            expect(message.content).toContain('Context 1');
            expect(message.content).toContain('Context 2');
        });
    });

    describe('Tool Message Building', () => {
        it('should build tool message with call ID', () => {
            const message = MessageBuilder.tool('call_123')
                .withResult('Tool result')
                .build();

            expect(message.role).toBe('tool');
            expect(message.tool_call_id).toBe('call_123');
            expect(message.content).toBe('Tool result');
        });

        it('should handle object results', () => {
            const message = MessageBuilder.tool('call_123')
                .withResult({ data: 'value', status: 'success' })
                .build();

            expect(message.content).toContain('data');
            expect(message.content).toContain('value');
        });

        it('should add tool calls to assistant message', () => {
            const toolCalls: ToolCall[] = [{
                id: 'call_1',
                type: 'function',
                function: {
                    name: 'test_tool',
                    arguments: '{}'
                }
            }];

            const message = MessageBuilder.assistant()
                .withContent('Calling tool')
                .withToolCalls(toolCalls)
                .build();

            expect(message.tool_calls).toHaveLength(1);
            expect(message.tool_calls![0].function.name).toBe('test_tool');
        });
    });

    describe('Metadata', () => {
        it('should add metadata', () => {
            const message = MessageBuilder.user()
                .withContent('Test')
                .withMetadata({ key: 'value', count: 42 })
                .build();

            // Note: metadata isn't part of ConversationMessage
            // but can be used for internal tracking
            expect(message.content).toBe('Test');
        });

        it('should add timestamp', () => {
            const builder = MessageBuilder.user()
                .withContent('Test')
                .withTimestamp();

            // Timestamp added to internal metadata
            expect(builder).toBeDefined();
        });

        it('should add priority', () => {
            const builder = MessageBuilder.user()
                .withContent('Test')
                .withPriority('high');

            expect(builder).toBeDefined();
        });
    });

    describe('Model-Specific Roles', () => {
        it('should use system role for GPT-4o', () => {
            const message = MessageBuilder.system()
                .withContent('Test')
                .buildForModel('gpt-4o');

            expect(message.role).toBe('system');
        });

        it('should use developer role for o1 models', () => {
            const message = MessageBuilder.system()
                .withContent('Test')
                .buildForModel('o1');

            expect(message.role).toBe('developer');
        });

        it('should use developer role for o1-preview', () => {
            const message = MessageBuilder.system()
                .withContent('Test')
                .buildForModel('o1-preview');

            expect(message.role).toBe('developer');
        });

        it('should use developer role for o3-mini', () => {
            const message = MessageBuilder.system()
                .withContent('Test')
                .buildForModel('o3-mini');

            expect(message.role).toBe('developer');
        });

        it('should not change non-system roles', () => {
            const message = MessageBuilder.user()
                .withContent('Test')
                .buildForModel('o1');

            expect(message.role).toBe('user');
        });
    });

    describe('Fluent API', () => {
        it('should support method chaining', () => {
            const message = MessageBuilder.system()
                .withContent('Part 1')
                .withContent('Part 2')
                .withMetadata({ key: 'value' })
                .withTimestamp()
                .withPriority('high')
                .build();

            expect(message.content).toContain('Part 1');
            expect(message.content).toContain('Part 2');
        });
    });
});

describe('MessageTemplates', () => {
    describe('agenticSystem', () => {
        it('should create agentic system message', () => {
            const builder = MessageTemplates.agenticSystem(
                'You are an AI agent',
                ['Use tools', 'Investigate thoroughly']
            );

            const message = builder.build();

            expect(message.role).toBe('system');
            expect(message.content).toContain('You are an AI agent');
            expect(message.content).toContain('Use tools');
        });

        it('should work without instructions', () => {
            const builder = MessageTemplates.agenticSystem('You are helpful');
            const message = builder.build();

            expect(message.content).toBe('You are helpful');
        });
    });

    describe('userQuery', () => {
        it('should create user query', () => {
            const builder = MessageTemplates.userQuery('What is the weather?');
            const message = builder.build();

            expect(message.role).toBe('user');
            expect(message.content).toBe('What is the weather?');
        });

        it('should include context', () => {
            const builder = MessageTemplates.userQuery('Analyze this', [
                { content: 'Context 1', title: 'C1' },
                { content: 'Context 2', title: 'C2' }
            ]);

            const message = builder.build();

            expect(message.content).toContain('Analyze this');
            expect(message.content).toContain('Context 1');
        });
    });

    describe('toolResult', () => {
        it('should create tool result message', () => {
            const builder = MessageTemplates.toolResult('call_123', 'Result data');
            const message = builder.build();

            expect(message.role).toBe('tool');
            expect(message.tool_call_id).toBe('call_123');
            expect(message.content).toContain('Result data');
        });

        it('should include metadata', () => {
            const builder = MessageTemplates.toolResult('call_123', 'Result', {
                duration: 45,
                source: 'cache'
            });

            const message = builder.build();
            expect(message.tool_call_id).toBe('call_123');
        });
    });

    describe('toolSuccess', () => {
        it('should create success message', () => {
            const builder = MessageTemplates.toolSuccess('call_123', 'Success', 100);
            const message = builder.build();

            expect(message.role).toBe('tool');
            expect(message.content).toContain('Success');
        });
    });

    describe('toolFailure', () => {
        it('should create failure message', () => {
            const error = new Error('Tool failed');
            const builder = MessageTemplates.toolFailure('call_123', error);
            const message = builder.build();

            expect(message.role).toBe('tool');
            expect(message.content).toContain('Tool failed');
        });
    });
});

describe('ConversationBuilder Semantic Methods', () => {
    it('should add system message with asSystem', () => {
        const conversation = ConversationBuilder.create();

        conversation.asSystem('System message');

        const messages = conversation.getMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].role).toBe('system');
        expect(messages[0].content).toBe('System message');
    });

    it('should add user message with asUser', () => {
        const conversation = ConversationBuilder.create();

        conversation.asUser('User message');

        const messages = conversation.getMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].role).toBe('user');
        expect(messages[0].content).toBe('User message');
    });

    it('should add assistant message with asAssistant', () => {
        const conversation = ConversationBuilder.create();

        conversation.asAssistant('Assistant message');

        const messages = conversation.getMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].role).toBe('assistant');
        expect(messages[0].content).toBe('Assistant message');
    });

    it('should add assistant with tool calls', () => {
        const conversation = ConversationBuilder.create();

        const toolCalls: ToolCall[] = [{
            id: 'call_1',
            type: 'function',
            function: { name: 'test', arguments: '{}' }
        }];

        conversation.asAssistant('Calling tool', toolCalls);

        const messages = conversation.getMessages();
        expect(messages[0].tool_calls).toHaveLength(1);
    });

    it('should add tool message with asTool', () => {
        const conversation = ConversationBuilder.create();

        conversation.asTool('call_123', 'Tool result', { duration: 45 });

        const messages = conversation.getMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].role).toBe('tool');
        expect(messages[0].tool_call_id).toBe('call_123');
    });

    it('should handle model-specific roles', () => {
        const o1Conversation = ConversationBuilder.create({ model: 'o1' });

        o1Conversation.asSystem('System message');

        const messages = o1Conversation.getMessages();
        // For o1, system becomes developer
        expect(messages[0].role).toBe('developer');
    });
});

