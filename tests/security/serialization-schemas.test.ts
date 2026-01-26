/**
 * Tests for Serialization Schemas - Deserialization Security
 */

import { describe, it, expect } from 'vitest';
import {
    SCHEMA_VERSION,
    SERIALIZATION_LIMITS,
    ToolCallSchema,
    ConversationMessageSchema,
    ConversationMetadataSchema,
    SerializedConversationSchema,
    LoggedConversationSchema,
    validateConversation,
    validateLoggedConversation,
    safeJsonParse,
} from '../../src/security/serialization-schemas';

describe('Serialization Schemas', () => {
    describe('SCHEMA_VERSION', () => {
        it('should be defined', () => {
            expect(SCHEMA_VERSION).toBeDefined();
            expect(typeof SCHEMA_VERSION).toBe('string');
        });
    });

    describe('SERIALIZATION_LIMITS', () => {
        it('should have reasonable limits', () => {
            expect(SERIALIZATION_LIMITS.maxContentLength).toBeGreaterThan(0);
            expect(SERIALIZATION_LIMITS.maxMessages).toBeGreaterThan(0);
            expect(SERIALIZATION_LIMITS.maxToolCalls).toBeGreaterThan(0);
        });
    });

    describe('ToolCallSchema', () => {
        it('should accept valid tool call', () => {
            const validToolCall = {
                id: 'call_123',
                type: 'function' as const,
                function: {
                    name: 'get_weather',
                    arguments: '{"location": "NYC"}',
                },
            };

            expect(() => ToolCallSchema.parse(validToolCall)).not.toThrow();
        });

        it('should reject invalid type', () => {
            const invalidToolCall = {
                id: 'call_123',
                type: 'invalid',
                function: {
                    name: 'get_weather',
                    arguments: '{}',
                },
            };

            expect(() => ToolCallSchema.parse(invalidToolCall)).toThrow();
        });

        it('should reject oversized arguments', () => {
            const oversizedToolCall = {
                id: 'call_123',
                type: 'function' as const,
                function: {
                    name: 'test',
                    arguments: 'x'.repeat(SERIALIZATION_LIMITS.maxArgumentsLength + 1),
                },
            };

            expect(() => ToolCallSchema.parse(oversizedToolCall)).toThrow();
        });
    });

    describe('ConversationMessageSchema', () => {
        it('should accept valid user message', () => {
            const validMessage = {
                role: 'user' as const,
                content: 'Hello, world!',
            };

            expect(() => ConversationMessageSchema.parse(validMessage)).not.toThrow();
        });

        it('should accept valid assistant message with tool calls', () => {
            const validMessage = {
                role: 'assistant' as const,
                content: null,
                tool_calls: [{
                    id: 'call_123',
                    type: 'function' as const,
                    function: {
                        name: 'get_weather',
                        arguments: '{}',
                    },
                }],
            };

            expect(() => ConversationMessageSchema.parse(validMessage)).not.toThrow();
        });

        it('should accept valid tool message', () => {
            const validMessage = {
                role: 'tool' as const,
                content: '{"result": "sunny"}',
                tool_call_id: 'call_123',
            };

            expect(() => ConversationMessageSchema.parse(validMessage)).not.toThrow();
        });

        it('should reject invalid role', () => {
            const invalidMessage = {
                role: 'invalid',
                content: 'Hello',
            };

            expect(() => ConversationMessageSchema.parse(invalidMessage)).toThrow();
        });

        it('should reject oversized content', () => {
            const oversizedMessage = {
                role: 'user' as const,
                content: 'x'.repeat(SERIALIZATION_LIMITS.maxContentLength + 1),
            };

            expect(() => ConversationMessageSchema.parse(oversizedMessage)).toThrow();
        });
    });

    describe('ConversationMetadataSchema', () => {
        it('should accept valid metadata', () => {
            const validMetadata = {
                model: 'gpt-4o',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                messageCount: 5,
                toolCallCount: 2,
            };

            expect(() => ConversationMetadataSchema.parse(validMetadata)).not.toThrow();
        });

        it('should reject invalid datetime', () => {
            const invalidMetadata = {
                model: 'gpt-4o',
                created: 'not-a-date',
                lastModified: new Date().toISOString(),
                messageCount: 5,
                toolCallCount: 2,
            };

            expect(() => ConversationMetadataSchema.parse(invalidMetadata)).toThrow();
        });

        it('should reject negative counts', () => {
            const invalidMetadata = {
                model: 'gpt-4o',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                messageCount: -1,
                toolCallCount: 0,
            };

            expect(() => ConversationMetadataSchema.parse(invalidMetadata)).toThrow();
        });
    });

    describe('SerializedConversationSchema', () => {
        const validConversation = {
            version: SCHEMA_VERSION,
            messages: [
                { role: 'user' as const, content: 'Hello' },
                { role: 'assistant' as const, content: 'Hi there!' },
            ],
            metadata: {
                model: 'gpt-4o',
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                messageCount: 2,
                toolCallCount: 0,
            },
        };

        it('should accept valid conversation', () => {
            expect(() => SerializedConversationSchema.parse(validConversation)).not.toThrow();
        });

        it('should accept conversation without version', () => {
            const { version: _, ...withoutVersion } = validConversation;
            expect(() => SerializedConversationSchema.parse(withoutVersion)).not.toThrow();
        });

        it('should accept conversation with context', () => {
            const withContext = {
                ...validConversation,
                contextProvided: ['context1', 'context2'],
            };
            expect(() => SerializedConversationSchema.parse(withContext)).not.toThrow();
        });

        it('should reject too many messages', () => {
            const tooManyMessages = {
                ...validConversation,
                messages: Array(SERIALIZATION_LIMITS.maxMessages + 1).fill({
                    role: 'user' as const,
                    content: 'Hello',
                }),
            };

            expect(() => SerializedConversationSchema.parse(tooManyMessages)).toThrow();
        });
    });

    describe('validateConversation', () => {
        it('should return success for valid data', () => {
            const validData = {
                messages: [{ role: 'user', content: 'Hello' }],
                metadata: {
                    model: 'gpt-4o',
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    messageCount: 1,
                    toolCallCount: 0,
                },
            };

            const result = validateConversation(validData);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });

        it('should return error for invalid data', () => {
            const invalidData = {
                messages: 'not an array',
            };

            const result = validateConversation(invalidData);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should limit error messages', () => {
            const invalidData = {
                messages: [
                    { role: 'invalid1', content: 123 },
                    { role: 'invalid2', content: 456 },
                    { role: 'invalid3', content: 789 },
                    { role: 'invalid4', content: 101 },
                ],
                metadata: 'invalid',
            };

            const result = validateConversation(invalidData);
            expect(result.success).toBe(false);
            // Should only show first 3 issues
            const issueCount = (result.error?.match(/;/g) || []).length + 1;
            expect(issueCount).toBeLessThanOrEqual(3);
        });
    });

    describe('LoggedConversationSchema', () => {
        const validLoggedConversation = {
            id: 'conv-123',
            metadata: {
                startTime: new Date().toISOString(),
                model: 'gpt-4o',
            },
            messages: [
                {
                    index: 0,
                    timestamp: new Date().toISOString(),
                    role: 'user',
                    content: 'Hello',
                },
            ],
            summary: {
                totalMessages: 1,
                toolCallsExecuted: 0,
                iterations: 1,
                success: true,
            },
        };

        it('should accept valid logged conversation', () => {
            expect(() => LoggedConversationSchema.parse(validLoggedConversation)).not.toThrow();
        });

        it('should accept with optional fields', () => {
            const withOptional = {
                ...validLoggedConversation,
                metadata: {
                    ...validLoggedConversation.metadata,
                    endTime: new Date().toISOString(),
                    duration: 5000,
                    template: 'default',
                },
                summary: {
                    ...validLoggedConversation.summary,
                    totalTokens: 100,
                    finalOutput: 'Done',
                },
            };

            expect(() => LoggedConversationSchema.parse(withOptional)).not.toThrow();
        });
    });

    describe('validateLoggedConversation', () => {
        it('should validate logged conversation', () => {
            const validData = {
                id: 'conv-123',
                metadata: {
                    startTime: new Date().toISOString(),
                    model: 'gpt-4o',
                },
                messages: [],
                summary: {
                    totalMessages: 0,
                    toolCallsExecuted: 0,
                    iterations: 0,
                    success: true,
                },
            };

            const result = validateLoggedConversation(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('safeJsonParse', () => {
        it('should parse and validate valid JSON', () => {
            const json = JSON.stringify({ role: 'user', content: 'Hello' });
            const result = safeJsonParse(json, ConversationMessageSchema);
            expect(result.role).toBe('user');
            expect(result.content).toBe('Hello');
        });

        it('should throw on invalid JSON', () => {
            expect(() => safeJsonParse('not json', ConversationMessageSchema))
                .toThrow('Invalid JSON format');
        });

        it('should throw on validation failure', () => {
            const json = JSON.stringify({ role: 'invalid', content: 'Hello' });
            expect(() => safeJsonParse(json, ConversationMessageSchema))
                .toThrow('Validation failed');
        });
    });
});

