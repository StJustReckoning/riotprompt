import { z } from "zod";
import { Model } from "./chat";
import { ContextManager, type DynamicContentItem } from "./context-manager";
import { Content } from "./items/content";
import { Context } from "./items/context";
import { Instruction } from "./items/instruction";
import { Section } from "./items/section";
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import { Prompt } from "./prompt";
import * as Formatter from "./formatter";
import { TokenBudgetManager, type TokenBudgetConfig, type TokenUsage, type CompressionStrategy } from "./token-budget";

// ===== TYPE DEFINITIONS =====

/**
 * Options for injecting context
 */
export interface InjectOptions {
    // Where to inject
    position?: 'end' | 'before-last' | 'after-system' | number;

    // How to format
    format?: 'structured' | 'inline' | 'reference';

    // Deduplication
    deduplicate?: boolean;
    deduplicateBy?: 'id' | 'content' | 'hash';

    // Priority
    priority?: 'high' | 'medium' | 'low';
    weight?: number;

    // Metadata
    category?: string;
    source?: string;
}

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
    contextManager: ContextManager;
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
    private budgetManager?: TokenBudgetManager;

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
            contextManager: new ContextManager(logger),
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
     * Add a user message (with automatic budget management)
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

        const message: ConversationMessage = {
            role: 'user',
            content: messageContent,
        };

        // Check budget if enabled
        if (this.budgetManager) {
            if (!this.budgetManager.canAddMessage(message, this.state.messages)) {
                this.logger.warn('Budget exceeded, compressing conversation');
                this.state.messages = this.budgetManager.compress(this.state.messages);
            }
        }

        this.state.messages.push(message);

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
     * Inject context into the conversation with advanced options
     *
     * @param context - Array of content items to inject
     * @param options - Injection options (position, format, deduplication, etc.)
     */
    injectContext(context: DynamicContentItem[], options?: InjectOptions): this {
        const opts: Required<InjectOptions> = {
            position: 'end',
            format: 'structured',
            deduplicate: this.config.deduplicateContext ?? true,
            deduplicateBy: 'id',
            priority: 'medium',
            weight: 1.0,
            category: undefined as any,
            source: undefined as any,
            ...options,
        };

        this.logger.debug('Injecting context', { itemCount: context.length, options: opts });

        // Filter out duplicates if enabled
        const itemsToAdd: DynamicContentItem[] = [];

        for (const item of context) {
            const enrichedItem: DynamicContentItem = {
                ...item,
                priority: item.priority || opts.priority,
                weight: item.weight || opts.weight,
                category: item.category || opts.category,
                source: item.source || opts.source,
                timestamp: item.timestamp || new Date(),
            };

            // Check deduplication
            if (opts.deduplicate) {
                let skip = false;

                switch (opts.deduplicateBy) {
                    case 'id':
                        if (enrichedItem.id && this.state.contextManager.hasContext(enrichedItem.id)) {
                            this.logger.debug('Skipping duplicate context by ID', { id: enrichedItem.id });
                            skip = true;
                        }
                        break;
                    case 'hash':
                        if (this.state.contextManager.hasContentHash(enrichedItem.content)) {
                            this.logger.debug('Skipping duplicate context by hash');
                            skip = true;
                        }
                        break;
                    case 'content':
                        if (this.state.contextManager.hasSimilarContent(enrichedItem.content)) {
                            this.logger.debug('Skipping duplicate context by content');
                            skip = true;
                        }
                        break;
                }

                if (skip) {
                    continue;
                }
            }

            itemsToAdd.push(enrichedItem);
        }

        // Only proceed if we have items to add
        if (itemsToAdd.length === 0) {
            return this;
        }

        // Calculate position
        const position = this.calculatePosition(opts.position);

        // Format and inject
        for (const item of itemsToAdd) {
            const formatted = this.formatContextItem(item, opts.format);
            const contextMessage: ConversationMessage = {
                role: 'user',
                content: formatted,
            };

            this.state.messages.splice(position, 0, contextMessage);

            // Track in context manager
            this.state.contextManager.track(item, position);
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

        // Deep copy state (note: contextManager is already created in constructor)
        cloned.state.messages = this.state.messages.map(msg => ({ ...msg }));
        cloned.state.metadata = { ...this.state.metadata };
        cloned.state.contextProvided = new Set(this.state.contextProvided);

        // Copy context manager state
        const allContext = this.state.contextManager.getAll();
        allContext.forEach(item => {
            cloned.state.contextManager.track(item, item.position);
        });

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
     * Get the context manager
     */
    getContextManager(): ContextManager {
        return this.state.contextManager;
    }

    /**
     * Get conversation state (for conditional injection)
     */
    getState(): ConversationState {
        return {
            messages: [...this.state.messages],
            metadata: { ...this.state.metadata },
            contextProvided: new Set(this.state.contextProvided),
            contextManager: this.state.contextManager,
        };
    }

    /**
     * Configure token budget
     */
    withTokenBudget(config: TokenBudgetConfig): this {
        this.logger.debug('Configuring token budget', { max: config.max });
        this.budgetManager = new TokenBudgetManager(config, this.config.model, this.logger);
        return this;
    }

    /**
     * Get current token usage
     */
    getTokenUsage(): TokenUsage {
        if (!this.budgetManager) {
            return { used: 0, max: Infinity, remaining: Infinity, percentage: 0 };
        }
        return this.budgetManager.getCurrentUsage(this.state.messages);
    }

    /**
     * Manually compress conversation
     */
    compress(_strategy?: CompressionStrategy): this {
        if (this.budgetManager) {
            this.state.messages = this.budgetManager.compress(this.state.messages);
        }
        return this;
    }

    /**
     * Build and return the builder (for fluent API compatibility)
     */
    build(): this {
        return this;
    }

    /**
     * Calculate position for context injection
     */
    private calculatePosition(position: InjectOptions['position']): number {
        if (typeof position === 'number') {
            return Math.max(0, Math.min(position, this.state.messages.length));
        }

        switch (position) {
            case 'end':
                return this.state.messages.length;
            case 'before-last':
                return Math.max(0, this.state.messages.length - 1);
            case 'after-system': {
                // Find last system message (reverse search for compatibility)
                let lastSystemIdx = -1;
                for (let i = this.state.messages.length - 1; i >= 0; i--) {
                    if (this.state.messages[i].role === 'system') {
                        lastSystemIdx = i;
                        break;
                    }
                }
                return lastSystemIdx >= 0 ? lastSystemIdx + 1 : 0;
            }
            default:
                return this.state.messages.length;
        }
    }

    /**
     * Format context item based on format option
     */
    private formatContextItem(item: DynamicContentItem, format: 'structured' | 'inline' | 'reference'): string {
        switch (format) {
            case 'structured': {
                let result = `## ${item.title || 'Context'}\n\n${item.content}`;

                // Add metadata if available
                const metadata: string[] = [];
                if (item.source) {
                    metadata.push(`Source: ${item.source}`);
                }
                if (item.timestamp) {
                    metadata.push(`Timestamp: ${item.timestamp.toISOString()}`);
                }
                if (metadata.length > 0) {
                    result += `\n\n_${metadata.join(' | ')}_`;
                }

                return result;
            }

            case 'inline':
                return `Note: ${item.title ? `${item.title}: ` : ''}${item.content}`;

            case 'reference':
                return `[Context Reference: ${item.id || 'unknown'}]\nSee attached context${item.title ? ` for ${item.title}` : ''}`;

            default:
                return item.content;
        }
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

