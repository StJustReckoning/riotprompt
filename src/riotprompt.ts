/**
 * RiotPrompt - Structured Prompt Engineering for LLMs
 *
 * Agentic components (conversation management, tools, iteration strategies,
 * reflection, token budgets, recipes) are available in the separate
 * `@kjerneverk/agentic` package.
 *
 * @packageDocumentation
 */

// Export functions
export { create as createContent } from "./items/content";
export { create as createContext } from "./items/context";
export { create as createInstruction } from "./items/instruction";
export { create as createSection } from "./items/section";
export { create as createTrait } from "./items/trait";
export { create as createWeighted } from "./items/weighted";
export { create as createPrompt } from "./prompt";
export { create as createParameters } from "./items/parameters";

export * as Formatter from "./formatter";
export * as Parser from "./parser";
export * as Chat from "./chat";
export * as Loader from "./loader";
export * as Override from "./override";
export * as Builder from "./builder";

export * as Serializer from "./serializer";
export * as Writer from "./writer";
export * as Execution from "./execution/index";

// ===== SECURITY =====
export * as Security from "./security/index";

// ===== MODEL CONFIGURATION =====
export {
    ModelRegistry,
    getModelRegistry,
    resetModelRegistry,
    getPersonaRole,
    getEncoding,
    supportsToolCalls,
    getModelFamily,
    configureModel
} from "./model-config";

// Export types
export type { Content } from "./items/content";
export type { Context } from "./items/context";
export type { Instruction } from "./items/instruction";
export type { Parameters } from "./items/parameters";
export type { Section } from "./items/section";
export type { Trait } from "./items/trait";
export type { Weighted } from "./items/weighted";
export type { Prompt } from "./prompt";
export type { FormatOptions, SectionSeparator, SectionTitleProperty } from "./formatter";
export type { Model, Request } from "./chat";
export type { Logger } from "./logger";
export { DEFAULT_LOGGER, wrapLogger, createConsoleLogger } from "./logger";

// ===== SECURE LOGGING =====
export {
    configureSecureLogging,
    maskSensitive,
    executeWithCorrelation,
    DEFAULT_MASKING_CONFIG,
    DEVELOPMENT_MASKING_CONFIG,
    RiotPromptLogger,
    // Re-exports from @fjell/logging
    maskWithConfig,
    createCorrelatedLogger,
    generateCorrelationId
} from "./logging-config";
export type { SecureLoggingOptions, MaskingConfig } from "./logging-config";

// ===== SAFE REGEX =====
export { SafeRegex, createSafeRegex, globToSafeRegex, escapeForRegex } from '@utilarium/pressurelid';
export type { SafeRegexResult, SafeRegexConfig, SafeRegexReason } from '@utilarium/pressurelid';

// ===== ERROR HANDLING =====
export {
    initializeErrorHandling,
    sanitize as sanitizeError,
    createSafeError,
    withErrorHandling,
    handleError,
    formatErrorForDisplay,
    configureErrorSanitizer,
    configurePathSanitizer,
    configureSecretGuard,
} from './error-handling';
export type { ErrorSanitizerConfig, SanitizedErrorResult, ErrorHandlingOptions } from './error-handling';
export type {
    ModelConfig,
    PersonaRole,
    TokenizerEncoding
} from "./model-config";
export type {
    PathSecurityConfig,
    ToolSecurityConfig,
    SecretSecurityConfig,
    LogSecurityConfig,
    TimeoutConfig,
    SecurityConfig,
    SecurityEventType,
    SecurityEvent
} from "./security/index";
