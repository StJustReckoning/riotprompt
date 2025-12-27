import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import type { ConversationMessage, ToolCall } from "./conversation";

// ===== TYPE DEFINITIONS =====

/**
 * Log format
 */
export type LogFormat = 'json' | 'markdown' | 'jsonl';

/**
 * Log configuration
 */
export interface LogConfig {
    enabled: boolean;
    outputPath?: string;
    format?: LogFormat;
    filenameTemplate?: string;
    includeMetadata?: boolean;
    includePrompt?: boolean;
    redactSensitive?: boolean;
    redactPatterns?: RegExp[];
    onSaved?: (path: string) => void;
    onError?: (error: Error) => void;
}

/**
 * Logged conversation structure
 */
export interface LoggedConversation {
    id: string;
    metadata: ConversationLogMetadata;
    prompt?: PromptSnapshot;
    messages: LoggedMessage[];
    summary: ConversationSummary;
}

/**
 * Conversation metadata for logging
 */
export interface ConversationLogMetadata {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    model: string;
    template?: string;
    userContext?: Record<string, any>;
}

/**
 * Snapshot of prompt configuration
 */
export interface PromptSnapshot {
    persona?: string;
    instructions?: string;
    content?: string[];
    context?: string[];
}

/**
 * Logged message with metadata
 */
export interface LoggedMessage {
    index: number;
    timestamp: string;
    role: string;
    content: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    metadata?: MessageLogMetadata;
}

/**
 * Message metadata for logging
 */
export interface MessageLogMetadata {
    tokens?: number;
    source?: string;
    latency?: number;
    tool?: string;
    duration?: number;
    success?: boolean;
    [key: string]: any;
}

/**
 * Conversation summary
 */
export interface ConversationSummary {
    totalMessages: number;
    totalTokens?: number;
    toolCallsExecuted: number;
    iterations: number;
    finalOutput?: string;
    success: boolean;
}

/**
 * Tool call log entry
 */
export interface ToolCallLog {
    callId: string;
    toolName: string;
    timestamp: string;
    iteration: number;
    arguments: any;
    result: any;
    duration: number;
    success: boolean;
    error?: string;
}

// ===== CONVERSATION LOGGER =====

/**
 * ConversationLogger logs conversations to various formats.
 *
 * Features:
 * - Multiple formats (JSON, Markdown, JSONL)
 * - Automatic timestamping
 * - Metadata tracking
 * - Sensitive data redaction
 * - Streaming support (JSONL)
 *
 * @example
 * ```typescript
 * const logger = new ConversationLogger({
 *   enabled: true,
 *   outputPath: 'logs/conversations',
 *   format: 'json',
 *   includeMetadata: true
 * });
 *
 * logger.onConversationStart({ model: 'gpt-4o', startTime: new Date() });
 * logger.onMessageAdded(message);
 * const path = await logger.save();
 * ```
 */
export class ConversationLogger {
    private config: Required<LogConfig>;
    private conversationId: string;
    private metadata: ConversationLogMetadata;
    private messages: LoggedMessage[];
    private toolCalls: ToolCallLog[];
    private startTime: Date;
    private logger: any;
    private messageIndex: number;

    constructor(config: LogConfig, logger?: any) {
        this.config = {
            outputPath: 'logs/conversations',
            format: 'json',
            filenameTemplate: 'conversation-{timestamp}',
            includeMetadata: true,
            includePrompt: false,
            redactSensitive: false,
            redactPatterns: [],
            onSaved: () => {},
            onError: () => {},
            ...config,
        } as Required<LogConfig>;

        this.conversationId = this.generateId();
        this.messages = [];
        this.toolCalls = [];
        this.startTime = new Date();
        this.messageIndex = 0;
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'ConversationLogger');

        this.metadata = {
            startTime: this.startTime,
            model: 'unknown',
        };
    }

    /**
     * Start conversation logging
     */
    onConversationStart(metadata: Partial<ConversationLogMetadata>): void {
        this.metadata = {
            ...this.metadata,
            ...metadata,
            startTime: this.startTime,
        };

        this.logger.debug('Conversation logging started', { id: this.conversationId });
    }

    /**
     * Log a message
     */
    onMessageAdded(message: ConversationMessage, metadata?: MessageLogMetadata): void {
        let content = message.content;

        // Redact sensitive data if enabled
        if (this.config.redactSensitive && content && typeof content === 'string') {
            content = this.redactContent(content);
        }

        const loggedMessage: LoggedMessage = {
            index: this.messageIndex++,
            timestamp: new Date().toISOString(),
            role: message.role,
            content,
            tool_calls: message.tool_calls,
            tool_call_id: message.tool_call_id,
            metadata,
        };

        this.messages.push(loggedMessage);

        // For JSONL format, append immediately
        if (this.config.format === 'jsonl') {
            this.appendToJSONL(loggedMessage).catch(this.config.onError);
        }
    }

    /**
     * Log a tool call
     */
    onToolCall(
        callId: string,
        toolName: string,
        iteration: number,
        args: any,
        result: any,
        duration: number,
        success: boolean,
        error?: string
    ): void {
        this.toolCalls.push({
            callId,
            toolName,
            timestamp: new Date().toISOString(),
            iteration,
            arguments: args,
            result,
            duration,
            success,
            error,
        });
    }

    /**
     * End conversation logging
     */
    onConversationEnd(_summary: ConversationSummary): void {
        this.metadata.endTime = new Date();
        this.metadata.duration = this.metadata.endTime.getTime() - this.startTime.getTime();

        this.logger.debug('Conversation logging ended', {
            messages: this.messages.length,
            duration: this.metadata.duration
        });
    }

    /**
     * Save conversation to disk
     */
    async save(): Promise<string> {
        if (!this.config.enabled) {
            return '';
        }

        try {
            const outputPath = await this.getOutputPath();

            switch (this.config.format) {
                case 'json':
                    await this.saveAsJSON(outputPath);
                    break;
                case 'markdown':
                    await this.saveAsMarkdown(outputPath);
                    break;
                case 'jsonl':
                    // Already saved during execution
                    break;
            }

            this.config.onSaved(outputPath);
            this.logger.info('Conversation saved', { path: outputPath });

            return outputPath;
        } catch (error) {
            this.config.onError(error as Error);
            this.logger.error('Failed to save conversation', { error });
            throw error;
        }
    }

    /**
     * Get logged conversation object
     */
    getConversation(): LoggedConversation {
        return {
            id: this.conversationId,
            metadata: this.metadata,
            messages: this.messages,
            summary: {
                totalMessages: this.messages.length,
                toolCallsExecuted: this.toolCalls.length,
                iterations: 0,  // Would need to be tracked externally
                success: true,
            },
        };
    }

    /**
     * Generate unique conversation ID
     */
    private generateId(): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = Math.random().toString(36).substring(2, 8);
        return `conv-${timestamp}-${random}`;
    }

    /**
     * Get output file path
     */
    private async getOutputPath(): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = this.config.filenameTemplate
            .replace('{timestamp}', timestamp)
            .replace('{id}', this.conversationId)
            .replace('{template}', this.metadata.template || 'default');

        const ext = this.config.format === 'markdown' ? '.md' : '.json';
        const fullPath = path.join(this.config.outputPath, filename + ext);

        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        return fullPath;
    }

    /**
     * Save as JSON
     */
    private async saveAsJSON(outputPath: string): Promise<void> {
        const data: LoggedConversation = {
            id: this.conversationId,
            metadata: this.metadata,
            messages: this.messages,
            summary: {
                totalMessages: this.messages.length,
                toolCallsExecuted: this.toolCalls.length,
                iterations: 0,
                success: true,
            },
        };

        await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    }

    /**
     * Save as Markdown
     */
    private async saveAsMarkdown(outputPath: string): Promise<void> {
        let markdown = `# Conversation Log\n\n`;
        markdown += `**ID**: ${this.conversationId}\n`;
        markdown += `**Started**: ${this.metadata.startTime.toISOString()}\n`;
        if (this.metadata.duration) {
            markdown += `**Duration**: ${(this.metadata.duration / 1000).toFixed(1)}s\n`;
        }
        markdown += `**Model**: ${this.metadata.model}\n`;
        if (this.metadata.template) {
            markdown += `**Template**: ${this.metadata.template}\n`;
        }
        markdown += `\n## Conversation\n\n`;

        for (const msg of this.messages) {
            const time = new Date(msg.timestamp).toLocaleTimeString();
            markdown += `### Message ${msg.index + 1} (${time}) - ${msg.role}\n\n`;

            if (msg.content) {
                markdown += `\`\`\`\n${msg.content}\n\`\`\`\n\n`;
            }

            if (msg.tool_calls) {
                markdown += `**Tool Calls:**\n`;
                for (const call of msg.tool_calls) {
                    markdown += `- ${call.function.name}: \`${call.function.arguments}\`\n`;
                }
                markdown += `\n`;
            }

            if (msg.metadata) {
                markdown += `*Metadata: ${JSON.stringify(msg.metadata)}*\n\n`;
            }
        }

        markdown += `## Summary\n\n`;
        markdown += `- **Total Messages**: ${this.messages.length}\n`;
        markdown += `- **Tool Calls**: ${this.toolCalls.length}\n`;

        await fs.writeFile(outputPath, markdown, 'utf-8');
    }

    /**
     * Append to JSONL file (streaming)
     */
    private async appendToJSONL(message: LoggedMessage): Promise<void> {
        const outputPath = await this.getOutputPath();
        const line = JSON.stringify(message) + '\n';
        await fs.appendFile(outputPath, line, 'utf-8');
    }

    /**
     * Redact sensitive content
     */
    private redactContent(content: string): string {
        let redacted = content;

        // Apply custom patterns
        for (const pattern of this.config.redactPatterns) {
            redacted = redacted.replace(pattern, '[REDACTED]');
        }

        // Default patterns
        const defaultPatterns = [
            /api[_-]?key[\s:="']+[\w-]+/gi,
            /password[\s:="']+[\w-]+/gi,
            /Bearer\s+[\w-]+/gi,
            /sk-[a-zA-Z0-9]{48}/g,
        ];

        for (const pattern of defaultPatterns) {
            redacted = redacted.replace(pattern, '[REDACTED]');
        }

        return redacted;
    }
}

// ===== CONVERSATION REPLAYER =====

/**
 * Replay options
 */
export interface ReplayOptions {
    model?: string;
    maxIterations?: number;
    retryFailedTools?: boolean;
    toolTimeout?: number;
    expectSimilarOutput?: boolean;
}

/**
 * Replay result
 */
export interface ReplayResult {
    success: boolean;
    conversation: LoggedConversation;
    errors?: Error[];
}

/**
 * Comparison result
 */
export interface ComparisonResult {
    messageDiff: number;
    toolCallDiff: number;
    tokenDiff?: number;
    outputSimilarity: number;
    costSavings?: number;
}

/**
 * ConversationReplayer loads and replays logged conversations.
 *
 * Features:
 * - Load from various formats
 * - Replay conversations
 * - Compare replays with originals
 * - Export to different formats
 *
 * @example
 * ```typescript
 * const replayer = await ConversationReplayer.load('logs/conv.json');
 *
 * console.log('Messages:', replayer.messages.length);
 * console.log('Tool calls:', replayer.getToolCalls().length);
 *
 * const timeline = replayer.getTimeline();
 * console.log('Events:', timeline.length);
 * ```
 */
export class ConversationReplayer {
    private conversation: LoggedConversation;
    private logger: any;

    private constructor(conversation: LoggedConversation, logger?: any) {
        this.conversation = conversation;
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'ConversationReplayer');
    }

    /**
     * Load conversation from file
     */
    static async load(filePath: string, logger?: any): Promise<ConversationReplayer> {
        const wlogger = wrapLogger(logger || DEFAULT_LOGGER, 'ConversationReplayer');
        wlogger.debug('Loading conversation', { path: filePath });

        try {
            const content = await fs.readFile(filePath, 'utf-8');

            // Determine format by extension
            if (filePath.endsWith('.json')) {
                const data: LoggedConversation = JSON.parse(content);
                return new ConversationReplayer(data, logger);
            } else if (filePath.endsWith('.jsonl')) {
                const lines = content.trim().split('\n');
                const messages = lines.map(line => JSON.parse(line));

                const conversation: LoggedConversation = {
                    id: `replayer-${Date.now()}`,
                    metadata: {
                        startTime: new Date(),
                        model: 'unknown'
                    },
                    messages,
                    summary: {
                        totalMessages: messages.length,
                        toolCallsExecuted: 0,
                        iterations: 0,
                        success: true
                    }
                };

                return new ConversationReplayer(conversation, logger);
            } else {
                throw new Error(`Unsupported format: ${filePath}`);
            }
        } catch (error) {
            wlogger.error('Failed to load conversation', { path: filePath, error });
            throw error;
        }
    }

    /**
     * Load latest conversation from directory
     */
    static async loadLatest(directory: string, logger?: any): Promise<ConversationReplayer> {
        const files = await fs.readdir(directory);
        const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

        if (jsonFiles.length === 0) {
            throw new Error(`No conversation logs found in ${directory}`);
        }

        const latestPath = path.join(directory, jsonFiles[0]);
        return ConversationReplayer.load(latestPath, logger);
    }

    /**
     * Get all messages
     */
    get messages(): LoggedMessage[] {
        return this.conversation.messages;
    }

    /**
     * Get conversation metadata
     */
    getMetadata(): ConversationLogMetadata {
        return { ...this.conversation.metadata };
    }

    /**
     * Get tool calls
     */
    getToolCalls(): ToolCallLog[] {
        const toolCalls: ToolCallLog[] = [];

        for (const msg of this.conversation.messages) {
            if (msg.tool_calls) {
                for (const call of msg.tool_calls) {
                    toolCalls.push({
                        callId: call.id,
                        toolName: call.function.name,
                        timestamp: msg.timestamp,
                        iteration: 0,  // Would need to be calculated
                        arguments: JSON.parse(call.function.arguments),
                        result: null,  // Would need to find corresponding tool message
                        duration: 0,
                        success: true,
                    });
                }
            }
        }

        return toolCalls;
    }

    /**
     * Get message at index
     */
    getMessageAt(index: number): LoggedMessage | undefined {
        return this.conversation.messages[index];
    }

    /**
     * Get timeline of events
     */
    getTimeline(): TimelineEvent[] {
        const events: TimelineEvent[] = [];

        for (const msg of this.conversation.messages) {
            events.push({
                timestamp: msg.timestamp,
                iteration: 0,  // Would need iteration tracking
                type: 'message',
                description: `${msg.role} message`,
            });
        }

        return events;
    }

    /**
     * Export to format
     */
    async exportToFormat(format: LogFormat, outputPath: string): Promise<string> {
        this.logger.debug('Exporting to format', { format, path: outputPath });

        switch (format) {
            case 'json':
                await fs.writeFile(outputPath, JSON.stringify(this.conversation, null, 2), 'utf-8');
                break;
            case 'markdown':
                await this.exportMarkdown(outputPath);
                break;
            case 'jsonl': {
                const lines = this.messages.map(m => JSON.stringify(m)).join('\n');
                await fs.writeFile(outputPath, lines, 'utf-8');
                break;
            }
        }

        return outputPath;
    }

    /**
     * Export as markdown
     */
    private async exportMarkdown(outputPath: string): Promise<void> {
        let markdown = `# Conversation Log\n\n`;
        markdown += `**ID**: ${this.conversation.id}\n`;

        const startTime = typeof this.conversation.metadata.startTime === 'string'
            ? this.conversation.metadata.startTime
            : this.conversation.metadata.startTime.toISOString();

        markdown += `**Started**: ${startTime}\n\n`;

        for (const msg of this.conversation.messages) {
            markdown += `## ${msg.role.toUpperCase()} (${msg.index})\n\n`;
            if (msg.content) {
                markdown += `${msg.content}\n\n`;
            }
        }

        await fs.writeFile(outputPath, markdown, 'utf-8');
    }
}

/**
 * Timeline event interface
 */
interface TimelineEvent {
    timestamp: string;
    iteration: number;
    type: string;
    description: string;
    duration?: number;
    success?: boolean;
}

export default ConversationLogger;

