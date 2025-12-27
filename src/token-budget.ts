import { encoding_for_model, Tiktoken, TiktokenModel } from 'tiktoken';
import type { ConversationMessage } from './conversation';
import { Model } from './chat';
import { DEFAULT_LOGGER, wrapLogger } from './logger';
import { getEncoding } from './model-config';

// ===== TYPE DEFINITIONS =====

/**
 * Token usage information
 */
export interface TokenUsage {
    used: number;
    max: number;
    remaining: number;
    percentage: number;
}

/**
 * Compression statistics
 */
export interface CompressionStats {
    messagesBefore: number;
    messagesAfter: number;
    tokensBefore: number;
    tokensAfter: number;
    tokensSaved: number;
    strategy: CompressionStrategy;
}

/**
 * Compression strategy
 */
export type CompressionStrategy = 'priority-based' | 'fifo' | 'summarize' | 'adaptive';

/**
 * Token budget configuration
 */
export interface TokenBudgetConfig {
    // Hard limits
    max: number;
    reserveForResponse: number;
    warningThreshold?: number;  // Default: 0.8 (80%)

    // Compression strategy
    strategy: CompressionStrategy;

    // Behavior when budget exceeded
    onBudgetExceeded: 'compress' | 'error' | 'warn' | 'truncate';

    // What to preserve
    preserveRecent?: number;
    preserveSystem?: boolean;  // Default: true
    preserveHighPriority?: boolean;  // Default: true

    // Monitoring
    onWarning?: (usage: TokenUsage) => void;
    onCompression?: (stats: CompressionStats) => void;
}

// ===== TOKEN COUNTER =====

/**
 * TokenCounter counts tokens using tiktoken for accurate model-specific counting.
 *
 * Features:
 * - Model-specific token counting
 * - Message overhead calculation
 * - Tool call token estimation
 * - Response token estimation
 *
 * @example
 * ```typescript
 * const counter = new TokenCounter('gpt-4o');
 *
 * const tokens = counter.count('Hello, world!');
 * console.log(`Text uses ${tokens} tokens`);
 *
 * const messageTokens = counter.countMessage({
 *   role: 'user',
 *   content: 'What is the weather?'
 * });
 * ```
 */
export class TokenCounter {
    private encoder: Tiktoken;
    private model: Model;
    private logger: any;

    constructor(model: Model, logger?: any) {
        this.model = model;
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'TokenCounter');

        // Map RiotPrompt models to Tiktoken models
        const tiktokenModel = this.mapToTiktokenModel(model);
        this.encoder = encoding_for_model(tiktokenModel);

        this.logger.debug('Created TokenCounter', { model });
    }

    /**
     * Count tokens in text
     */
    count(text: string): number {
        if (!text) return 0;
        return this.encoder.encode(text).length;
    }

    /**
     * Count tokens in a single message
     */
    countMessage(message: ConversationMessage): number {
        let tokens = 4;  // Base overhead per message

        // Content tokens
        if (message.content) {
            tokens += this.count(message.content);
        }

        // Role tokens
        tokens += 1;

        // Tool call tokens
        if (message.tool_calls) {
            for (const toolCall of message.tool_calls) {
                tokens += this.count(JSON.stringify(toolCall));
                tokens += 3;  // Tool call overhead
            }
        }

        // Tool result tokens
        if (message.tool_call_id) {
            tokens += this.count(message.tool_call_id);
            tokens += 2;  // Tool result overhead
        }

        return tokens;
    }

    /**
     * Count tokens in entire conversation
     */
    countConversation(messages: ConversationMessage[]): number {
        let total = 3;  // Conversation start overhead

        for (const message of messages) {
            total += this.countMessage(message);
        }

        return total;
    }

    /**
     * Count with additional overhead estimation
     */
    countWithOverhead(
        messages: ConversationMessage[],
        includeToolOverhead: boolean = false
    ): number {
        let total = this.countConversation(messages);

        // Add tool definition overhead if tools are present
        if (includeToolOverhead) {
            const hasTools = messages.some(m => m.tool_calls && m.tool_calls.length > 0);
            if (hasTools) {
                total += 100;  // Estimated tool definition overhead
            }
        }

        return total;
    }

    /**
     * Estimate tokens needed for response
     */
    estimateResponseTokens(messages: ConversationMessage[]): number {
        // Heuristic: average response is about 20% of input
        const inputTokens = this.countConversation(messages);
        return Math.max(500, Math.floor(inputTokens * 0.2));
    }

    /**
     * Map RiotPrompt model to Tiktoken model using model registry
     */
    private mapToTiktokenModel(model: Model): TiktokenModel {
        const encoding = getEncoding(model);

        // Map our encoding types to tiktoken models
        switch (encoding) {
            case 'gpt-4o':
            case 'o200k_base':
                return 'gpt-4o';
            case 'cl100k_base':
                return 'gpt-3.5-turbo';
            default:
                return 'gpt-4o';
        }
    }

    /**
     * Free encoder resources
     */
    dispose(): void {
        this.encoder.free();
    }
}

// ===== TOKEN BUDGET MANAGER =====

/**
 * TokenBudgetManager manages token budgets and compression strategies.
 *
 * Features:
 * - Monitor token usage
 * - Automatic compression when budget exceeded
 * - Multiple compression strategies
 * - Priority-based message retention
 * - Usage statistics and callbacks
 *
 * @example
 * ```typescript
 * const manager = new TokenBudgetManager({
 *   max: 8000,
 *   reserveForResponse: 1000,
 *   strategy: 'priority-based',
 *   onBudgetExceeded: 'compress'
 * }, 'gpt-4o');
 *
 * // Check if message can be added
 * if (manager.canAddMessage(message)) {
 *   messages.push(message);
 * } else {
 *   // Compress conversation
 *   messages = manager.compress(messages);
 *   messages.push(message);
 * }
 * ```
 */
export class TokenBudgetManager {
    private config: Required<TokenBudgetConfig>;
    private counter: TokenCounter;
    private logger: any;

    constructor(config: TokenBudgetConfig, model: Model, logger?: any) {
        this.config = {
            warningThreshold: 0.8,
            preserveRecent: 3,
            preserveSystem: true,
            preserveHighPriority: true,
            onWarning: () => {},
            onCompression: () => {},
            ...config,
        } as Required<TokenBudgetConfig>;

        this.counter = new TokenCounter(model, logger);
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'TokenBudgetManager');

        this.logger.debug('Created TokenBudgetManager', {
            max: this.config.max,
            strategy: this.config.strategy
        });
    }

    /**
     * Get current token usage
     */
    getCurrentUsage(messages: ConversationMessage[]): TokenUsage {
        const used = this.counter.countConversation(messages);
        const max = this.config.max;
        const remaining = Math.max(0, max - used - this.config.reserveForResponse);
        const percentage = (used / max) * 100;

        return { used, max, remaining, percentage };
    }

    /**
     * Get remaining tokens available
     */
    getRemainingTokens(messages: ConversationMessage[]): number {
        return this.getCurrentUsage(messages).remaining;
    }

    /**
     * Check if near token limit
     */
    isNearLimit(messages: ConversationMessage[], threshold?: number): boolean {
        const usage = this.getCurrentUsage(messages);
        const checkThreshold = threshold ?? this.config.warningThreshold;

        const isNear = usage.percentage >= (checkThreshold * 100);

        if (isNear) {
            this.config.onWarning?.(usage);
        }

        return isNear;
    }

    /**
     * Check if a message can be added without exceeding budget
     */
    canAddMessage(message: ConversationMessage, currentMessages: ConversationMessage[]): boolean {
        const currentTokens = this.counter.countConversation(currentMessages);
        const messageTokens = this.counter.countMessage(message);
        const total = currentTokens + messageTokens + this.config.reserveForResponse;

        return total <= this.config.max;
    }

    /**
     * Compress messages according to strategy
     */
    compress(messages: ConversationMessage[]): ConversationMessage[] {
        const before = messages.length;
        const tokensBefore = this.counter.countConversation(messages);
        const targetTokens = this.config.max - this.config.reserveForResponse;

        this.logger.debug('Compressing messages', {
            before,
            tokensBefore,
            targetTokens,
            strategy: this.config.strategy
        });

        // No compression needed
        if (tokensBefore <= targetTokens) {
            return messages;
        }

        let compressed: ConversationMessage[];

        switch (this.config.strategy) {
            case 'priority-based':
                compressed = this.compressByPriority(messages, targetTokens);
                break;
            case 'fifo':
                compressed = this.compressFIFO(messages, targetTokens);
                break;
            case 'adaptive':
                compressed = this.compressAdaptive(messages, targetTokens);
                break;
            case 'summarize':
                // For now, fall back to FIFO (summarization would require LLM call)
                compressed = this.compressFIFO(messages, targetTokens);
                break;
            default:
                compressed = this.compressFIFO(messages, targetTokens);
        }

        const tokensAfter = this.counter.countConversation(compressed);

        const stats: CompressionStats = {
            messagesBefore: before,
            messagesAfter: compressed.length,
            tokensBefore,
            tokensAfter,
            tokensSaved: tokensBefore - tokensAfter,
            strategy: this.config.strategy,
        };

        this.config.onCompression?.(stats);

        this.logger.info('Compressed conversation', stats);

        return compressed;
    }

    /**
     * Compress by priority (keep high-priority messages)
     */
    private compressByPriority(
        messages: ConversationMessage[],
        targetTokens: number
    ): ConversationMessage[] {
        // Calculate priority for each message
        const withPriority = messages.map((msg, idx) => ({
            message: msg,
            priority: this.calculatePriority(msg, idx, messages.length),
            tokens: this.counter.countMessage(msg),
            index: idx,
        }));

        // Sort by priority (descending)
        withPriority.sort((a, b) => b.priority - a.priority);

        // Keep highest priority messages that fit in budget
        const kept: typeof withPriority = [];
        let totalTokens = 0;

        for (const item of withPriority) {
            if (totalTokens + item.tokens <= targetTokens) {
                kept.push(item);
                totalTokens += item.tokens;
            }
        }

        // Sort back to original order
        kept.sort((a, b) => a.index - b.index);

        return kept.map(item => item.message);
    }

    /**
     * Compress using FIFO (remove oldest first) - optimized with Set
     */
    private compressFIFO(
        messages: ConversationMessage[],
        targetTokens: number
    ): ConversationMessage[] {
        const preserved: ConversationMessage[] = [];
        const preservedSet = new Set<ConversationMessage>();
        let totalTokens = 0;

        // Always preserve system messages if configured
        const systemMessages = messages.filter(m => m.role === 'system');
        if (this.config.preserveSystem) {
            for (const msg of systemMessages) {
                preserved.push(msg);
                preservedSet.add(msg);
                totalTokens += this.counter.countMessage(msg);
            }
        }

        // Preserve recent messages
        const recentCount = this.config.preserveRecent ?? 3;
        const recentMessages = messages.slice(-recentCount).filter(m => m.role !== 'system');
        for (const msg of recentMessages) {
            if (!preservedSet.has(msg)) {
                const tokens = this.counter.countMessage(msg);
                if (totalTokens + tokens <= targetTokens) {
                    preserved.push(msg);
                    preservedSet.add(msg);
                    totalTokens += tokens;
                }
            }
        }

        // Add older messages if space available
        const otherMessages = messages.filter(
            m => !preservedSet.has(m) && m.role !== 'system'
        );

        for (let i = otherMessages.length - 1; i >= 0; i--) {
            const msg = otherMessages[i];
            const tokens = this.counter.countMessage(msg);

            if (totalTokens + tokens <= targetTokens) {
                preserved.unshift(msg);
                preservedSet.add(msg);
                totalTokens += tokens;
            } else {
                break;
            }
        }

        // Sort to maintain conversation order - use Set for O(1) lookup
        return messages.filter(m => preservedSet.has(m));
    }

    /**
     * Adaptive compression based on conversation phase
     */
    private compressAdaptive(
        messages: ConversationMessage[],
        targetTokens: number
    ): ConversationMessage[] {
        const messageCount = messages.length;

        // Early phase: minimal compression (keep most messages)
        if (messageCount <= 5) {
            return this.compressFIFO(messages, targetTokens);
        }

        // Mid phase: moderate compression
        if (messageCount <= 15) {
            // Temporarily modify preserveRecent, then restore
            const originalPreserveRecent = this.config.preserveRecent;
            this.config.preserveRecent = 5;
            const result = this.compressFIFO(messages, targetTokens);
            this.config.preserveRecent = originalPreserveRecent;
            return result;
        }

        // Late phase: aggressive compression (priority-based)
        return this.compressByPriority(messages, targetTokens);
    }

    /**
     * Calculate message priority for compression
     */
    private calculatePriority(
        message: ConversationMessage,
        index: number,
        total: number
    ): number {
        let priority = 1.0;

        // System messages: highest priority
        if (message.role === 'system') {
            priority = 10.0;
        }

        // Recent messages: higher priority
        const recencyBonus = index / total;
        priority += recencyBonus * 2;

        // Tool results: moderate priority
        if (message.role === 'tool') {
            priority += 0.5;
        }

        // Messages with tool calls: keep for context
        if (message.tool_calls && message.tool_calls.length > 0) {
            priority += 0.8;
        }

        return priority;
    }

    /**
     * Truncate to exact number of messages
     */
    truncate(messages: ConversationMessage[], maxMessages: number): ConversationMessage[] {
        if (messages.length <= maxMessages) {
            return messages;
        }

        // Keep system messages + recent messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const otherMessages = messages.filter(m => m.role !== 'system');

        const recentOther = otherMessages.slice(-(maxMessages - systemMessages.length));

        return [...systemMessages, ...recentOther];
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.counter.dispose();
    }
}

export default TokenBudgetManager;

