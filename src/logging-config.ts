/**
 * RiotPrompt - Secure Logging Configuration
 * 
 * Integrates @fjell/logging for comprehensive sensitive data masking
 * and structured logging across the library.
 */

import Logging, { 
    maskWithConfig, 
    type MaskingConfig,
    generateCorrelationId 
} from '@fjell/logging';
import type { Logger } from './logger';

// Get library logger
export const RiotPromptLogger = Logging.getLogger('@theunwalked/riotprompt');

/**
 * Secure logging configuration options
 */
export interface SecureLoggingOptions {
  /** Enable masking (defaults to true in production) */
  enabled?: boolean;
  /** Mask API keys (OpenAI, Anthropic, AWS, etc.) */
  maskApiKeys?: boolean;
  /** Mask passwords and secrets */
  maskPasswords?: boolean;
  /** Mask email addresses */
  maskEmails?: boolean;
  /** Mask Social Security Numbers */
  maskSSNs?: boolean;
  /** Mask private keys */
  maskPrivateKeys?: boolean;
  /** Mask JWT tokens */
  maskJWTs?: boolean;
  /** Mask large base64 blobs */
  maskBase64Blobs?: boolean;
  /** Maximum object depth for masking */
  maxDepth?: number;
}

/**
 * Configure secure logging defaults for RiotPrompt
 * 
 * @param options - Configuration options
 * @returns MaskingConfig for use with maskWithConfig
 * 
 * @example
 * ```typescript
 * const config = configureSecureLogging({ maskEmails: false });
 * const masked = maskWithConfig(content, config);
 * ```
 */
export function configureSecureLogging(options: SecureLoggingOptions = {}): MaskingConfig {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        enabled: options.enabled ?? isProduction,
        maskApiKeys: options.maskApiKeys ?? true,
        maskPasswords: options.maskPasswords ?? true,
        maskEmails: options.maskEmails ?? true,
        maskSSNs: options.maskSSNs ?? true,
        maskPrivateKeys: options.maskPrivateKeys ?? true,
        maskJWTs: options.maskJWTs ?? true,
        maskBase64Blobs: options.maskBase64Blobs ?? true,
        maskBearerTokens: true,
        maskGenericSecrets: true,
        maxDepth: options.maxDepth ?? 8,
    };
}

/**
 * Default masking configuration with all protections enabled
 */
export const DEFAULT_MASKING_CONFIG: MaskingConfig = {
    enabled: true,
    maskApiKeys: true,
    maskPasswords: true,
    maskEmails: true,
    maskSSNs: true,
    maskPrivateKeys: true,
    maskJWTs: true,
    maskBase64Blobs: true,
    maskBearerTokens: true,
    maskGenericSecrets: true,
    maxDepth: 8,
};

/**
 * Permissive masking configuration for development/debugging
 */
export const DEVELOPMENT_MASKING_CONFIG: MaskingConfig = {
    enabled: false,
    maskApiKeys: false,
    maskPasswords: false,
    maskEmails: false,
    maskSSNs: false,
    maskPrivateKeys: false,
    maskJWTs: false,
    maskBase64Blobs: false,
    maskBearerTokens: false,
    maskGenericSecrets: false,
    maxDepth: 8,
};

/**
 * Mask a string with default secure settings
 * 
 * @param content - Content to mask
 * @param config - Optional custom masking config
 * @returns Masked content
 * 
 * @example
 * ```typescript
 * const masked = maskSensitive('API key: sk-abc123xyz');
 * // Output: "API key: ****"
 * ```
 */
export function maskSensitive(content: string, config?: MaskingConfig): string {
    return maskWithConfig(content, config ?? DEFAULT_MASKING_CONFIG);
}

/**
 * Execute a function with a correlated logger for request tracking
 * 
 * @param fn - Function to execute with correlated logger
 * @param baseLogger - Base logger to correlate
 * @returns Promise with result and correlation ID
 * 
 * @example
 * ```typescript
 * const { result, correlationId } = await executeWithCorrelation(
 *   async (logger) => {
 *     logger.info('Processing request');
 *     return processData();
 *   },
 *   myLogger
 * );
 * ```
 */
export async function executeWithCorrelation<T>(
    fn: (logger: Logger, correlationId: string) => Promise<T>,
    baseLogger: Logger,
): Promise<{ result: T; correlationId: string }> {
    const correlationId = generateCorrelationId();
  
    // Create a correlated wrapper that matches our Logger interface
    const correlatedLogger: Logger = {
        name: `${baseLogger.name}:${correlationId}`,
        debug: (msg, ...args) => baseLogger.debug(`[${correlationId}] ${msg}`, ...args),
        info: (msg, ...args) => baseLogger.info(`[${correlationId}] ${msg}`, ...args),
        warn: (msg, ...args) => baseLogger.warn(`[${correlationId}] ${msg}`, ...args),
        error: (msg, ...args) => baseLogger.error(`[${correlationId}] ${msg}`, ...args),
        verbose: (msg, ...args) => baseLogger.verbose(`[${correlationId}] ${msg}`, ...args),
        silly: (msg, ...args) => baseLogger.silly(`[${correlationId}] ${msg}`, ...args),
    };

    const result = await fn(correlatedLogger, correlationId);
    return { result, correlationId };
}

// Re-export useful Fjell utilities
export { 
    maskWithConfig, 
    createCorrelatedLogger, 
    generateCorrelationId,
    type MaskingConfig 
} from '@fjell/logging';

