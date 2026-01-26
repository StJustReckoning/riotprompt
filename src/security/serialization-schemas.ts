/**
 * RiotPrompt - Serialization Schemas
 *
 * Zod schemas for validating deserialized data to prevent
 * object injection attacks and ensure data integrity.
 */

import { z } from 'zod';

/**
 * Schema version for forward compatibility
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Maximum sizes for serialized data
 */
export const SERIALIZATION_LIMITS = {
    maxContentLength: 1_000_000,    // 1MB per message
    maxArgumentsLength: 100_000,    // 100KB for tool arguments
    maxMessages: 10_000,            // 10k messages per conversation
    maxContextItems: 1_000,         // 1k context items
    maxStringLength: 100,           // 100 chars for names/ids
    maxToolCalls: 100,              // 100 tool calls per message
};

/**
 * Tool call schema
 */
export const ToolCallSchema = z.object({
    id: z.string().max(SERIALIZATION_LIMITS.maxStringLength),
    type: z.literal('function'),
    function: z.object({
        name: z.string().max(SERIALIZATION_LIMITS.maxStringLength),
        arguments: z.string().max(SERIALIZATION_LIMITS.maxArgumentsLength),
    }),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Conversation message schema
 */
export const ConversationMessageSchema = z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string().nullable().refine(
        val => val === null || val.length <= SERIALIZATION_LIMITS.maxContentLength,
        { message: `Content exceeds maximum length of ${SERIALIZATION_LIMITS.maxContentLength}` }
    ),
    name: z.string().max(SERIALIZATION_LIMITS.maxStringLength).optional(),
    tool_calls: z.array(ToolCallSchema).max(SERIALIZATION_LIMITS.maxToolCalls).optional(),
    tool_call_id: z.string().max(SERIALIZATION_LIMITS.maxStringLength).optional(),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

/**
 * Conversation metadata schema
 */
export const ConversationMetadataSchema = z.object({
    model: z.string().max(SERIALIZATION_LIMITS.maxStringLength),
    created: z.string().datetime(),
    lastModified: z.string().datetime(),
    messageCount: z.number().int().nonnegative(),
    toolCallCount: z.number().int().nonnegative(),
});

export type ConversationMetadata = z.infer<typeof ConversationMetadataSchema>;

/**
 * Serialized conversation schema
 */
export const SerializedConversationSchema = z.object({
    // Optional version for forward compatibility
    version: z.string().optional(),
    messages: z.array(ConversationMessageSchema).max(SERIALIZATION_LIMITS.maxMessages),
    metadata: ConversationMetadataSchema,
    contextProvided: z.array(z.string().max(1000)).max(SERIALIZATION_LIMITS.maxContextItems).optional(),
});

export type SerializedConversation = z.infer<typeof SerializedConversationSchema>;

/**
 * Prompt serialization schema (flexible for various prompt structures)
 */
export const SerializedPromptSchema = z.object({
    version: z.string().optional(),
    persona: z.any().optional(),
    instructions: z.any().optional(),
    contexts: z.any().optional(),
    content: z.any().optional(),
});

export type SerializedPrompt = z.infer<typeof SerializedPromptSchema>;

/**
 * Logged conversation schema (for conversation-logger)
 */
export const LoggedConversationSchema = z.object({
    id: z.string().max(200),
    metadata: z.object({
        startTime: z.union([z.string().datetime(), z.date()]),
        endTime: z.union([z.string().datetime(), z.date()]).optional(),
        duration: z.number().nonnegative().optional(),
        model: z.string().max(SERIALIZATION_LIMITS.maxStringLength),
        template: z.string().max(SERIALIZATION_LIMITS.maxStringLength).optional(),
        userContext: z.record(z.string(), z.any()).optional(),
    }),
    prompt: z.object({
        persona: z.string().optional(),
        instructions: z.string().optional(),
        content: z.array(z.string()).optional(),
        context: z.array(z.string()).optional(),
    }).optional(),
    messages: z.array(z.object({
        index: z.number().int().nonnegative(),
        timestamp: z.string(),
        role: z.string(),
        content: z.string().nullable(),
        tool_calls: z.array(ToolCallSchema).optional(),
        tool_call_id: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
    })).max(SERIALIZATION_LIMITS.maxMessages),
    summary: z.object({
        totalMessages: z.number().int().nonnegative(),
        totalTokens: z.number().int().nonnegative().optional(),
        toolCallsExecuted: z.number().int().nonnegative(),
        iterations: z.number().int().nonnegative(),
        finalOutput: z.string().optional(),
        success: z.boolean(),
    }),
});

export type LoggedConversation = z.infer<typeof LoggedConversationSchema>;

/**
 * Validate serialized conversation data
 *
 * @param data - The data to validate
 * @returns Validation result
 */
export function validateConversation(data: unknown): {
    success: boolean;
    data?: SerializedConversation;
    error?: string;
} {
    const result = SerializedConversationSchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    // Create safe error message (don't leak full schema details)
    const issues = result.error.issues
        .slice(0, 3) // Limit to first 3 issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ');

    return { success: false, error: issues };
}

/**
 * Validate logged conversation data
 *
 * @param data - The data to validate
 * @returns Validation result
 */
export function validateLoggedConversation(data: unknown): {
    success: boolean;
    data?: LoggedConversation;
    error?: string;
} {
    const result = LoggedConversationSchema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const issues = result.error.issues
        .slice(0, 3)
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join('; ');

    return { success: false, error: issues };
}

/**
 * Safe JSON parse with schema validation
 *
 * @param json - JSON string to parse
 * @param schema - Zod schema to validate against
 * @returns Parsed and validated data
 * @throws Error if parsing or validation fails
 */
export function safeJsonParse<T>(
    json: string,
    schema: z.ZodSchema<T>
): T {
    let parsed: unknown;

    try {
        parsed = JSON.parse(json);
    } catch {
        throw new Error('Invalid JSON format');
    }

    const result = schema.safeParse(parsed);

    if (!result.success) {
        const issues = result.error.issues
            .slice(0, 3)
            .map(i => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
        throw new Error(`Validation failed: ${issues}`);
    }

    return result.data;
}

