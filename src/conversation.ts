import { z } from "zod";
import { Model } from "./chat";
import { Content } from "./items/content";
import { Context } from "./items/context";
import { Instruction } from "./items/instruction";
import { Section } from "./items/section";
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import { Prompt } from "./prompt";
import * as Formatter from "./formatter";

// ===== TYPE DEFINITIONS =====

/**
 * Represents a tool call made by the assistant
 */
export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

/**
 * Message in a conversation (compatible with OpenAI ChatCompletionMessageParam)
 */
export interface ConversationMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    name?: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}

/**
 * Configuration for ConversationBuilder
 */
export interface ConversationBuilderConfig {
    model: Model;
    formatter?: Formatter.Instance;
    trackContext?: boolean;
    deduplicateContext?: boolean;
}

/**
 * Metadata about the conversation
 */
export interface ConversationMetadata {
    model: Model;
    created: Date;
    lastModified: Date;
    messageCount: number;
    toolCallCount: number;
}

/**
 * Internal state of a conversation
 */
export interface ConversationState {
    messages: ConversationMessage[];
    metadata: ConversationMetadata;
    contextProvided: Set<string>;
}

/**
 * Serializable conversation state for persistence
 */
export interface SerializedConversation {
    messages: ConversationMessage[];
    metadata: Omit<ConversationMetadata, 'created' | 'lastModified'> & {
        created: string;
        lastModified: string;
    };
    contextProvided: string[];
}

// ===== SCHEMAS =====

const ConversationBuilderConfigSchema = z.object({
    model: z.string(),
    formatter: z.any().optional(),
    trackContext: z.boolean().optional().default(true),
    deduplicateContext: z.boolean().optional().default(true),
});

// ===== CONVERSATION BUILDER =====

/**
 * ConversationBuilder manages multi-turn conversations with full lifecycle support.
 *
 * Features:
 * - Initialize from RiotPrompt prompts
 * - Add messages of any type (system, user, assistant, tool)
 * - Handle tool calls and results
 * - Inject dynamic context
 * - Clone for parallel exploration
 * - Serialize/deserialize for persistence
 *
 * @example
 * ```typescript
 * // Create from prompt
 * const conversation = ConversationBuilder.create()
 *   .fromPrompt(prompt, 'gpt-4o')
 *   .build();
 *
 * // Add messages
 * conversation.addUserMessage('Analyze this code');
 *
 * // Handle tool calls
 * conversation.addAssistantWithToolCalls(null, toolCalls);
 * conversation.addToolResult(toolCallId, result);
 *
 * // Export
 * const messages = conversation.toMessages();
 * ```
 */
export class ConversationBuilder {
    private state: ConversationState;
    private config: ConversationBuilderConfig;
    private logger: any;

    private constructor(config: ConversationBuilderConfig, logger?: any) {
        this.config = ConversationBuilderConfigSchema.parse(config) as ConversationBuilderConfig;
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'ConversationBuilder');

        this.state = {
            messages: [],
            metadata: {
                model: this.config.model,
                created: new Date(),
                lastModified: new Date(),
                messageCount: 0,
                toolCallCount: 0,
            },
            contextProvided: new Set<string>(),
        };

        this.logger.debug('Created ConversationBuilder', { model: this.config.model });
    }

    /**
     * Create a new ConversationBuilder instance
     */
    static create(config?: Partial<ConversationBuilderConfig>, logger?: any): ConversationBuilder {
        const defaultConfig: ConversationBuilderConfig = {
            model: 'gpt-4o',
            trackContext: true,
            deduplicateContext: true,
            ...config,
        };

        return new ConversationBuilder(defaultConfig, logger);
    }

    /**
     * Initialize conversation from a RiotPrompt prompt
     */
    fromPrompt(prompt: Prompt, model?: Model): this {
        const targetModel = model || this.config.model;
        this.logger.debug('Initializing from prompt', { model: targetModel });

        // Use formatter (provided or create new one)
        const formatter = this.config.formatter || Formatter.create();
        const request = formatter.formatPrompt(targetModel, prompt);

        // Add all messages from formatted request
        request.messages.forEach(msg => {
            this.state.messages.push(msg as ConversationMessage);
        });

        this.updateMetadata();
        this.logger.debug('Initialized from prompt', { messageCount: this.state.messages.length });

        return this;
    }

    /**
     * Add a system message
     */
    addSystemMessage(content: string | Section<Instruction>): this {
        this.logger.debug('Adding system message');

        let messageContent: string;
        if (typeof content === 'string') {
            messageContent = content;
        } else {
            // Format section using formatter
            const formatter = this.config.formatter || Formatter.create();
            messageContent = formatter.format(content);
        }

        this.state.messages.push({
            role: 'system',
            content: messageContent,
        });

        this.updateMetadata();
        return this;
    }

    /**
     * Add a user message
     */
    addUserMessage(content: string | Section<Content>): this {
        this.logger.debug('Adding user message');

        let messageContent: string;
        if (typeof content === 'string') {
            messageContent = content;
        } else {
            // Format section using formatter
            const formatter = this.config.formatter || Formatter.create();
            messageContent = formatter.format(content);
        }

        this.state.messages.push({
            role: 'user',
            content: messageContent,
        });

        this.updateMetadata();
        return this;
    }

    /**
     * Add an assistant message
     */
    addAssistantMessage(content: string | null): this {
        this.logger.debug('Adding assistant message');

        this.state.messages.push({
            role: 'assistant',
            content: content || '',
        });

        this.updateMetadata();
        return this;
    }

    /**
     * Add an assistant message with tool calls
     */
    addAssistantWithToolCalls(content: string | null, toolCalls: ToolCall[]): this {
        this.logger.debug('Adding assistant message with tool calls', { toolCount: toolCalls.length });

        this.state.messages.push({
            role: 'assistant',
            content: content,
            tool_calls: toolCalls,
        });

        this.state.metadata.toolCallCount += toolCalls.length;
        this.updateMetadata();
        return this;
    }

    /**
     * Add a tool result message
     */
    addToolResult(toolCallId: string, content: string, toolName?: string): this {
        this.logger.debug('Adding tool result', { toolCallId, toolName });

        const message: ConversationMessage = {
            role: 'tool',
            tool_call_id: toolCallId,
            content: content,
        };

        if (toolName) {
            message.name = toolName;
        }

        this.state.messages.push(message);
        this.updateMetadata();
        return this;
    }

    /**
     * Alias for addToolResult (more intuitive naming)
     */
    addToolMessage(toolCallId: string, content: string, toolName?: string): this {
        return this.addToolResult(toolCallId, content, toolName);
    }

    /**
     * Inject context into the conversation
     * Can be added at the end or before the last message
     */
    injectContext(context: Array<{ content: string; title?: string; weight?: number }>, position: 'end' | 'before-last' = 'end'): this {
        this.logger.debug('Injecting context', { itemCount: context.length, position });

        // Filter out duplicates if deduplication is enabled
        const itemsToAdd: Array<{ content: string; title?: string; weight?: number }> = [];

        if (this.config.trackContext && this.config.deduplicateContext) {
            context.forEach(item => {
                const key = item.title || item.content.substring(0, 50);

                if (this.state.contextProvided.has(key)) {
                    this.logger.debug('Skipping duplicate context', { key });
                    return;
                }

                this.state.contextProvided.add(key);
                itemsToAdd.push(item);
            });
        } else {
            itemsToAdd.push(...context);

            // Track context if enabled
            if (this.config.trackContext) {
                context.forEach(item => {
                    const key = item.title || item.content.substring(0, 50);
                    this.state.contextProvided.add(key);
                });
            }
        }

        // Only add message if we have items to add
        if (itemsToAdd.length === 0) {
            return this;
        }

        // Format context as user message
        const contextMessages = itemsToAdd.map(item => {
            const title = item.title || 'Context';
            return `## ${title}\n\n${item.content}`;
        }).join('\n\n');

        const contextMessage: ConversationMessage = {
            role: 'user',
            content: contextMessages,
        };

        if (position === 'before-last' && this.state.messages.length > 0) {
            this.state.messages.splice(this.state.messages.length - 1, 0, contextMessage);
        } else {
            this.state.messages.push(contextMessage);
        }

        this.updateMetadata();
        return this;
    }

    /**
     * Inject system-level context
     */
    injectSystemContext(context: Section<Context> | string): this {
        this.logger.debug('Injecting system context');

        let messageContent: string;
        if (typeof context === 'string') {
            messageContent = context;
        } else {
            const formatter = this.config.formatter || Formatter.create();
            messageContent = formatter.format(context);
        }

        this.state.messages.push({
            role: 'system',
            content: messageContent,
        });

        this.updateMetadata();
        return this;
    }

    /**
     * Get the number of messages in the conversation
     */
    getMessageCount(): number {
        return this.state.messages.length;
    }

    /**
     * Get the last message in the conversation
     */
    getLastMessage(): ConversationMessage | undefined {
        return this.state.messages[this.state.messages.length - 1];
    }

    /**
     * Get all messages
     */
    getMessages(): ConversationMessage[] {
        return [...this.state.messages];
    }

    /**
     * Check if conversation has any tool calls
     */
    hasToolCalls(): boolean {
        return this.state.metadata.toolCallCount > 0;
    }

    /**
     * Get conversation metadata
     */
    getMetadata(): ConversationMetadata {
        return { ...this.state.metadata };
    }

    /**
     * Export messages in OpenAI format
     */
    toMessages(): ConversationMessage[] {
        return this.state.messages.map(msg => ({ ...msg }));
    }

    /**
     * Serialize conversation to JSON
     */
    toJSON(): string {
        const serialized: SerializedConversation = {
            messages: this.state.messages,
            metadata: {
                ...this.state.metadata,
                created: this.state.metadata.created.toISOString(),
                lastModified: this.state.metadata.lastModified.toISOString(),
            },
            contextProvided: Array.from(this.state.contextProvided),
        };

        return JSON.stringify(serialized, null, 2);
    }

    /**
     * Restore conversation from JSON
     */
    static fromJSON(json: string, config?: Partial<ConversationBuilderConfig>, logger?: any): ConversationBuilder {
        const parsed: SerializedConversation = JSON.parse(json);

        const builder = ConversationBuilder.create(
            {
                model: parsed.metadata.model,
                ...config,
            },
            logger
        );

        // Restore state
        builder.state.messages = parsed.messages;
        builder.state.metadata = {
            ...parsed.metadata,
            created: new Date(parsed.metadata.created),
            lastModified: new Date(parsed.metadata.lastModified),
        };
        builder.state.contextProvided = new Set(parsed.contextProvided);

        return builder;
    }

    /**
     * Clone the conversation for parallel exploration
     */
    clone(): ConversationBuilder {
        this.logger.debug('Cloning conversation');

        const cloned = ConversationBuilder.create(
            { ...this.config },
            this.logger
        );

        // Deep copy state
        cloned.state = {
            messages: this.state.messages.map(msg => ({ ...msg })),
            metadata: { ...this.state.metadata },
            contextProvided: new Set(this.state.contextProvided),
        };

        return cloned;
    }

    /**
     * Truncate conversation to last N messages
     */
    truncate(maxMessages: number): this {
        this.logger.debug('Truncating conversation', { maxMessages, current: this.state.messages.length });

        if (this.state.messages.length > maxMessages) {
            this.state.messages = this.state.messages.slice(-maxMessages);
            this.updateMetadata();
        }

        return this;
    }

    /**
     * Remove all messages of a specific type
     */
    removeMessagesOfType(role: 'system' | 'user' | 'assistant' | 'tool'): this {
        this.logger.debug('Removing messages of type', { role });

        this.state.messages = this.state.messages.filter(msg => msg.role !== role);
        this.updateMetadata();

        return this;
    }

    /**
     * Build and return the builder (for fluent API compatibility)
     */
    build(): this {
        return this;
    }

    /**
     * Update metadata after state changes
     */
    private updateMetadata(): void {
        this.state.metadata.messageCount = this.state.messages.length;
        this.state.metadata.lastModified = new Date();
    }
}

/**
 * Export the builder for use in other modules
 */
export default ConversationBuilder;

