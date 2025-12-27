import { Model } from "./chat";
import { Context } from "./items/context";
import { Instruction } from "./items/instruction";
import { Section } from "./items/section";
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import type { ConversationMessage, ToolCall } from "./conversation";
import * as Formatter from "./formatter";

// ===== TYPE DEFINITIONS =====

/**
 * Semantic message role
 */
export type SemanticRole = 'system' | 'user' | 'assistant' | 'tool' | 'developer';

/**
 * Message metadata
 */
export interface MessageMetadata {
    priority?: 'high' | 'medium' | 'low';
    timestamp?: Date;
    source?: string;
    [key: string]: any;
}

/**
 * MessageBuilder provides semantic, type-safe message construction.
 *
 * Features:
 * - Semantic message types (system, user, assistant, tool)
 * - Model-specific role handling (system vs developer)
 * - Structured content composition
 * - Metadata attachment
 * - Format-aware building
 *
 * @example
 * ```typescript
 * const message = MessageBuilder.system()
 *   .withContent('You are a helpful assistant')
 *   .withInstructions(instructionSection)
 *   .buildForModel('gpt-4o');
 *
 * const toolMessage = MessageBuilder.tool('call_123')
 *   .withResult(result)
 *   .withMetadata({ duration: 45 })
 *   .build();
 * ```
 */
export class MessageBuilder {
    private semanticRole: SemanticRole;
    private contentParts: string[];
    private metadata: MessageMetadata;
    private formatter?: Formatter.Instance;
    private toolCallId?: string;
    private toolCalls?: ToolCall[];
    private logger: any;

    private constructor(role: SemanticRole, logger?: any) {
        this.semanticRole = role;
        this.contentParts = [];
        this.metadata = {};
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'MessageBuilder');
    }

    /**
     * Create system message builder
     */
    static system(logger?: any): MessageBuilder {
        return new MessageBuilder('system', logger);
    }

    /**
     * Create user message builder
     */
    static user(logger?: any): MessageBuilder {
        return new MessageBuilder('user', logger);
    }

    /**
     * Create assistant message builder
     */
    static assistant(logger?: any): MessageBuilder {
        return new MessageBuilder('assistant', logger);
    }

    /**
     * Create tool message builder
     */
    static tool(callId: string, logger?: any): MessageBuilder {
        const builder = new MessageBuilder('tool', logger);
        builder.toolCallId = callId;
        return builder;
    }

    /**
     * Create developer message builder (for o1 models)
     */
    static developer(logger?: any): MessageBuilder {
        return new MessageBuilder('developer', logger);
    }

    /**
     * Add content to message
     */
    withContent(content: string | Section<any>): this {
        if (typeof content === 'string') {
            this.contentParts.push(content);
        } else {
            // Format section
            const formatter = this.formatter || Formatter.create();
            this.contentParts.push(formatter.format(content));
        }
        return this;
    }

    /**
     * Add persona section (typically for system messages)
     */
    withPersona(persona: Section<Instruction>): this {
        const formatter = this.formatter || Formatter.create();
        this.contentParts.push(formatter.format(persona));
        return this;
    }

    /**
     * Add instructions section
     */
    withInstructions(instructions: Section<Instruction> | string[]): this {
        if (Array.isArray(instructions)) {
            this.contentParts.push(instructions.join('\n'));
        } else {
            const formatter = this.formatter || Formatter.create();
            this.contentParts.push(formatter.format(instructions));
        }
        return this;
    }

    /**
     * Add context section
     */
    withContext(context: Section<Context> | Array<{ content: string; title?: string }>): this {
        if (Array.isArray(context)) {
            const contextStr = context.map(c =>
                c.title ? `## ${c.title}\n\n${c.content}` : c.content
            ).join('\n\n');
            this.contentParts.push(contextStr);
        } else {
            const formatter = this.formatter || Formatter.create();
            this.contentParts.push(formatter.format(context));
        }
        return this;
    }

    /**
     * Set tool call ID (for tool messages)
     */
    withCallId(id: string): this {
        this.toolCallId = id;
        return this;
    }

    /**
     * Set tool result (for tool messages)
     */
    withResult(result: any): this {
        const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        this.contentParts.push(resultStr);
        return this;
    }

    /**
     * Add tool calls (for assistant messages)
     */
    withToolCalls(calls: ToolCall[]): this {
        this.toolCalls = calls;
        return this;
    }

    /**
     * Add metadata
     */
    withMetadata(metadata: Record<string, any>): this {
        this.metadata = { ...this.metadata, ...metadata };
        return this;
    }

    /**
     * Add timestamp to metadata
     */
    withTimestamp(): this {
        this.metadata.timestamp = new Date();
        return this;
    }

    /**
     * Set priority in metadata
     */
    withPriority(priority: 'high' | 'medium' | 'low'): this {
        this.metadata.priority = priority;
        return this;
    }

    /**
     * Set formatter for section rendering
     */
    withFormatter(formatter: Formatter.Instance): this {
        this.formatter = formatter;
        return this;
    }

    /**
     * Build message with semantic role
     */
    build(): ConversationMessage {
        const content = this.contentParts.join('\n\n');

        const message: ConversationMessage = {
            role: this.semanticRole as any,
            content: content || null,
        };

        // Add tool-specific fields
        if (this.semanticRole === 'tool' && this.toolCallId) {
            message.tool_call_id = this.toolCallId;
        }

        if (this.toolCalls) {
            message.tool_calls = this.toolCalls;
        }

        return message;
    }

    /**
     * Build message with model-specific role
     */
    buildForModel(model: Model): ConversationMessage {
        const message = this.build();

        // Handle model-specific role requirements
        if (this.semanticRole === 'system') {
            // O1 models use 'developer' instead of 'system'
            if (model.startsWith('o1') || model.startsWith('o3') || model === 'o1-pro') {
                message.role = 'developer' as any;
            }
        }

        return message;
    }
}

/**
 * Message template functions for common patterns
 */
export const MessageTemplates = {
    /**
     * System message for agentic tasks
     */
    agenticSystem: (persona?: string, instructions?: string[]) => {
        const builder = MessageBuilder.system();

        if (persona) {
            builder.withContent(persona);
        }

        if (instructions) {
            builder.withInstructions(instructions);
        }

        return builder;
    },

    /**
     * User query with optional context
     */
    userQuery: (query: string, context?: Array<{ content: string; title?: string }>) => {
        const builder = MessageBuilder.user().withContent(query);

        if (context) {
            builder.withContext(context);
        }

        return builder;
    },

    /**
     * Tool result with metadata
     */
    toolResult: (callId: string, result: any, metadata?: Record<string, any>) => {
        const builder = MessageBuilder.tool(callId)
            .withResult(result)
            .withTimestamp();

        if (metadata) {
            builder.withMetadata(metadata);
        }

        return builder;
    },

    /**
     * Tool success result
     */
    toolSuccess: (callId: string, result: any, duration?: number) => {
        return MessageBuilder.tool(callId)
            .withResult(result)
            .withMetadata({ success: true, duration })
            .withTimestamp();
    },

    /**
     * Tool failure result
     */
    toolFailure: (callId: string, error: Error) => {
        return MessageBuilder.tool(callId)
            .withResult({ error: error.message, stack: error.stack })
            .withMetadata({ success: false, errorName: error.name })
            .withTimestamp();
    },
};

export default MessageBuilder;

