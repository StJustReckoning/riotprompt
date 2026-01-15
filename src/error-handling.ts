/**
 * Error Handling Utilities
 * 
 * Provides centralized error sanitization using @theunwalked/spotclean
 * to prevent information disclosure in error messages.
 * 
 * @packageDocumentation
 */

import {
    sanitize as spotcleanSanitize,
    createSafeError as spotcleanCreateSafeError,
    configureErrorSanitizer,
    configurePathSanitizer,
    configureSecretGuard,
    withErrorHandling as spotcleanWithErrorHandling,
    type ErrorSanitizerConfig,
    type SanitizedErrorResult,
    type Logger as SpotcleanLogger,
    type ErrorHandlingOptions,
} from '@theunwalked/spotclean';

// Re-export spotclean types and functions for convenience
export {
    configureErrorSanitizer,
    configurePathSanitizer,
    configureSecretGuard,
    type ErrorSanitizerConfig,
    type SanitizedErrorResult,
    type ErrorHandlingOptions,
};

/**
 * Initialize error handling with secure defaults.
 * Call this at application startup.
 */
export function initializeErrorHandling(options: {
    basePaths?: string[];
    environment?: 'production' | 'development' | 'test';
} = {}): void {
    const isProduction = options.environment === 'production' || 
        process.env.NODE_ENV === 'production';

    // Configure the error sanitizer
    configureErrorSanitizer({
        enabled: true,
        environment: isProduction ? 'production' : 'development',
        includeCorrelationId: true,
        sanitizeStackTraces: isProduction,
        maxMessageLength: 500,
    });

    // Configure path sanitization
    configurePathSanitizer({
        enabled: true,
        basePaths: options.basePaths || [process.cwd()],
        redactSystemPaths: isProduction,
    });

    // Configure secret guard with kjerneverk-specific patterns
    configureSecretGuard({
        enabled: true,
        redactionText: '[REDACTED]',
        preservePartial: false,
        preserveLength: 0,
        customPatterns: [
            // OpenAI API keys
            { name: 'openai', pattern: /sk-[a-zA-Z0-9]{20,}/g, description: 'OpenAI API key' },
            { name: 'openai-proj', pattern: /sk-proj-[a-zA-Z0-9_-]+/g, description: 'OpenAI project key' },
            // Anthropic API keys
            { name: 'anthropic', pattern: /sk-ant-[a-zA-Z0-9_-]+/g, description: 'Anthropic API key' },
            // Gemini API keys
            { name: 'gemini', pattern: /AIza[a-zA-Z0-9_-]{35}/g, description: 'Google Gemini API key' },
        ],
    });
}

/**
 * Sanitize an error for safe external exposure.
 * 
 * @param error - The error to sanitize
 * @param context - Optional context for debugging
 * @returns Sanitized error result with external and internal details
 */
export function sanitize(error: unknown, context?: Record<string, unknown>): SanitizedErrorResult {
    const err = error instanceof Error ? error : new Error(String(error));
    return spotcleanSanitize(err, context);
}

/**
 * Create a safe error that can be thrown externally.
 * 
 * @param error - The error to make safe
 * @param context - Optional context for debugging
 * @returns New Error with sanitized message
 */
export function createSafeError(error: unknown, context?: Record<string, unknown>): Error & { correlationId?: string } {
    const err = error instanceof Error ? error : new Error(String(error));
    return spotcleanCreateSafeError(err, context);
}

/**
 * Wrap an async function with automatic error handling.
 * 
 * @param fn - The async function to wrap
 * @param options - Error handling options
 * @returns Wrapped function that sanitizes errors
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options?: ErrorHandlingOptions
): T {
    return spotcleanWithErrorHandling(fn, options);
}

/**
 * Handle an error by logging internally and throwing a sanitized version.
 * 
 * @param error - The error that occurred
 * @param context - Optional context for debugging
 * @param logger - Optional logger for internal logging
 */
export function handleError(
    error: unknown,
    context?: Record<string, unknown>,
    logger?: SpotcleanLogger
): never {
    const { external, internal } = sanitize(error, context);

    // Log internal details
    if (logger) {
        logger.error('Error occurred', {
            correlationId: internal.correlationId,
            message: internal.originalMessage,
            context: internal.context,
            timestamp: internal.timestamp,
        });
    } else if (process.env.NODE_ENV !== 'production') {
        // Fallback to console in development
        // eslint-disable-next-line no-console
        console.error('Error occurred', {
            correlationId: internal.correlationId,
            message: internal.originalMessage,
            context: internal.context,
        });
    }

    // Throw sanitized error
    const safeError = new Error(external.message) as Error & { correlationId?: string };
    safeError.correlationId = external.correlationId;
    throw safeError;
}

/**
 * Format an error for display to users.
 * Returns a user-friendly message with optional correlation ID.
 * 
 * @param error - The error to format
 * @returns User-friendly error string
 */
export function formatErrorForDisplay(error: unknown): string {
    const { external } = sanitize(error);
    
    if (external.correlationId) {
        return `${external.message}\nReference: ${external.correlationId}`;
    }
    
    return external.message;
}

