/**
 * RiotPrompt - Timeout Guard
 *
 * Implements request timeouts for LLM calls and other external operations
 * to prevent resource exhaustion and improve reliability.
 */

import { TimeoutConfig } from './types';
import { getAuditLogger, SecurityAuditLogger } from './audit-logger';

/**
 * Default timeout configuration
 */
const DEFAULT_CONFIG: TimeoutConfig = {
    enabled: true,
    defaultTimeout: 30000,      // 30 seconds
    llmTimeout: 120000,         // 2 minutes
    toolTimeout: 30000,         // 30 seconds
    fileTimeout: 5000,          // 5 seconds
};

/**
 * Custom timeout error for identification
 */
export class TimeoutError extends Error {
    readonly isTimeout = true;
    readonly operation: string;
    readonly timeoutMs: number;

    constructor(message: string, operation: string = 'unknown', timeoutMs: number = 0) {
        super(message);
        this.name = 'TimeoutError';
        this.operation = operation;
        this.timeoutMs = timeoutMs;
    }
}

/**
 * TimeoutGuard provides timeout protection for async operations.
 *
 * Features:
 * - Configurable timeouts per operation type
 * - AbortController integration
 * - Audit logging of timeouts
 * - Custom TimeoutError for identification
 *
 * @example
 * ```typescript
 * const guard = new TimeoutGuard({ llmTimeout: 60000 });
 *
 * // Wrap an LLM call
 * const response = await guard.withLLMTimeout(
 *   client.chat.completions.create({ ... }),
 *   'openai-chat'
 * );
 *
 * // Wrap any promise
 * const result = await guard.withTimeout(
 *   fetchData(),
 *   5000,
 *   'fetch-data'
 * );
 * ```
 */
export class TimeoutGuard {
    private config: TimeoutConfig;
    private auditLogger: SecurityAuditLogger;

    constructor(config: Partial<TimeoutConfig> = {}, auditLogger?: SecurityAuditLogger) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.auditLogger = auditLogger || getAuditLogger();
    }

    /**
     * Wrap a promise with timeout
     *
     * @param promise - The promise to wrap
     * @param timeoutMs - Timeout in milliseconds
     * @param operation - Operation name for logging
     * @returns The result of the promise
     * @throws TimeoutError if the operation times out
     */
    async withTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        operation: string
    ): Promise<T> {
        if (!this.config.enabled || timeoutMs <= 0) {
            return promise;
        }

        return new Promise<T>((resolve, reject) => {
            let settled = false;

            const timeoutId = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    this.auditLogger.requestTimeout(operation, timeoutMs);
                    reject(new TimeoutError(
                        `Operation "${operation}" timed out after ${timeoutMs}ms`,
                        operation,
                        timeoutMs
                    ));
                }
            }, timeoutMs);

            promise
                .then((result) => {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timeoutId);
                        resolve(result);
                    }
                })
                .catch((error) => {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timeoutId);
                        reject(error);
                    }
                });
        });
    }

    /**
     * Wrap an LLM call with appropriate timeout
     *
     * @param promise - The LLM call promise
     * @param operation - Operation name for logging
     * @returns The result of the LLM call
     */
    async withLLMTimeout<T>(promise: Promise<T>, operation: string = 'llm-call'): Promise<T> {
        return this.withTimeout(promise, this.config.llmTimeout, operation);
    }

    /**
     * Wrap a tool execution with appropriate timeout
     *
     * @param promise - The tool execution promise
     * @param toolName - Name of the tool
     * @returns The result of the tool execution
     */
    async withToolTimeout<T>(promise: Promise<T>, toolName: string): Promise<T> {
        return this.withTimeout(promise, this.config.toolTimeout, `tool:${toolName}`);
    }

    /**
     * Wrap a file operation with appropriate timeout
     *
     * @param promise - The file operation promise
     * @param operation - Operation name for logging
     * @returns The result of the file operation
     */
    async withFileTimeout<T>(promise: Promise<T>, operation: string = 'file-operation'): Promise<T> {
        return this.withTimeout(promise, this.config.fileTimeout, operation);
    }

    /**
     * Create an AbortController with timeout
     *
     * @param timeoutMs - Timeout in milliseconds
     * @param operation - Operation name for logging
     * @returns AbortController that will abort after timeout
     */
    createAbortController(timeoutMs: number, operation: string): { controller: AbortController; cleanup: () => void } {
        const controller = new AbortController();

        const timeoutId = setTimeout(() => {
            if (!controller.signal.aborted) {
                this.auditLogger.requestTimeout(operation, timeoutMs);
                controller.abort(new TimeoutError(
                    `Operation "${operation}" timed out`,
                    operation,
                    timeoutMs
                ));
            }
        }, timeoutMs);

        const cleanup = () => {
            clearTimeout(timeoutId);
        };

        return { controller, cleanup };
    }

    /**
     * Get timeout for a specific operation type
     *
     * @param type - The operation type
     * @returns Timeout in milliseconds
     */
    getTimeout(type: 'default' | 'llm' | 'tool' | 'file'): number {
        switch (type) {
            case 'llm': return this.config.llmTimeout;
            case 'tool': return this.config.toolTimeout;
            case 'file': return this.config.fileTimeout;
            default: return this.config.defaultTimeout;
        }
    }

    /**
     * Check if timeout protection is enabled
     */
    isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Enable or disable timeout protection
     */
    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
    }

    /**
     * Get the current configuration
     */
    getConfig(): TimeoutConfig {
        return { ...this.config };
    }
}

/**
 * Check if an error is a TimeoutError
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
    return error instanceof TimeoutError || (
        error !== null &&
        typeof error === 'object' &&
        'isTimeout' in error &&
        (error as { isTimeout: boolean }).isTimeout === true
    );
}

// Global instance
let globalTimeoutGuard: TimeoutGuard | null = null;

/**
 * Get the global TimeoutGuard instance
 */
export function getTimeoutGuard(): TimeoutGuard {
    if (!globalTimeoutGuard) {
        globalTimeoutGuard = new TimeoutGuard();
    }
    return globalTimeoutGuard;
}

/**
 * Configure the global TimeoutGuard
 */
export function configureTimeoutGuard(config: Partial<TimeoutConfig>): void {
    globalTimeoutGuard = new TimeoutGuard(config);
}

/**
 * Reset the global TimeoutGuard
 */
export function resetTimeoutGuard(): void {
    globalTimeoutGuard = null;
}

