/**
 * Security module for RiotPrompt
 * 
 * Provides security configuration, types, and utilities for:
 * - Path validation and traversal prevention
 * - Tool execution sandboxing
 * - Secret redaction
 * - Secure logging
 * - Request timeouts
 * 
 * @packageDocumentation
 */

// Types and schemas
export {
    PathSecurityConfigSchema,
    ToolSecurityConfigSchema,
    SecretSecurityConfigSchema,
    LogSecurityConfigSchema,
    TimeoutConfigSchema,
    SecurityConfigSchema,
} from './types';

export type {
    PathSecurityConfig,
    ToolSecurityConfig,
    SecretSecurityConfig,
    LogSecurityConfig,
    TimeoutConfig,
    SecurityConfig,
} from './types';

// Default configurations
export {
    SECURE_DEFAULTS,
    PERMISSIVE_DEFAULTS,
    mergeSecurityConfig,
} from './defaults';

// Security events
export type {
    SecurityEventType,
    SecurityEvent,
} from './events';

// Audit logging
export {
    SecurityAuditLogger,
    getAuditLogger,
    configureAuditLogger,
    resetAuditLogger,
} from './audit-logger';

export type {
    AuditLoggerConfig,
} from './audit-logger';

// Path security
export {
    PathGuard,
    getPathGuard,
    configurePathGuard,
    resetPathGuard,
    // Glob pattern utilities
    sanitizeGlobPattern,
    isGlobSafe,
    validateGlobPattern,
} from './path-guard';

export type {
    PathValidationResult,
    GlobValidationResult,
} from './path-guard';

// CLI security
export {
    CLIValidator,
    getCLIValidator,
    configureCLIValidator,
    resetCLIValidator,
    createRiotPromptValidator,
    DEFAULT_CLI_SECURITY,
} from './cli-security';

export type {
    CLISecurityConfig,
    StringValidationResult,
} from './cli-security';

// Timeout protection
export {
    TimeoutGuard,
    TimeoutError,
    isTimeoutError,
    getTimeoutGuard,
    configureTimeoutGuard,
    resetTimeoutGuard,
} from './timeout-guard';

// Serialization security
export {
    SCHEMA_VERSION,
    SERIALIZATION_LIMITS,
    ToolCallSchema,
    ConversationMessageSchema,
    ConversationMetadataSchema,
    SerializedConversationSchema,
    SerializedPromptSchema,
    LoggedConversationSchema,
    validateConversation,
    validateLoggedConversation,
    safeJsonParse,
} from './serialization-schemas';

export type {
    SerializedConversation,
    SerializedPrompt,
    LoggedConversation as SerializedLoggedConversation,
} from './serialization-schemas';

// Rate limiting
export {
    NoOpRateLimiter,
    MemoryRateLimiter,
    createRateLimiter,
    createNoOpRateLimiter,
    getRateLimiter,
    configureRateLimiter,
    resetRateLimiter,
} from './rate-limiter';

export type {
    RateLimiter,
    RateLimiterConfig,
} from './rate-limiter';
