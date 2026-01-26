/**
 * RiotPrompt - Structured Prompt Engineering for LLMs
 *
 * Note: Many components are now available as separate packages for lighter installs:
 * - `execution` - Provider interfaces (no SDK deps)
 * - `execution-openai` - OpenAI provider
 * - `execution-anthropic` - Anthropic provider
 * - `execution-gemini` - Gemini provider
 * - `agentic` - Tool registry, context management
 *
 * This main package re-exports everything for backward compatibility.
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

// ===== RECIPES SYSTEM =====
export * as Recipes from "./recipes";
export { cook, recipe, registerTemplates, getTemplates, clearTemplates, generateToolGuidance } from "./recipes";

// ===== CONVERSATION MANAGEMENT =====
export { ConversationBuilder } from "./conversation";
export { ContextManager } from "./context-manager";
export { TokenCounter, TokenBudgetManager } from "./token-budget";
export { MessageBuilder, MessageTemplates } from "./message-builder";
export { ConversationLogger, ConversationReplayer } from "./conversation-logger";

// ===== TOOL INTEGRATION =====
export { ToolRegistry } from "./tools";

// ===== ITERATION STRATEGIES =====
export { StrategyExecutor, IterationStrategyFactory } from "./iteration-strategy";

// ===== OBSERVABILITY =====
export { MetricsCollector, ReflectionReportGenerator } from "./reflection";

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
export { SafeRegex, createSafeRegex, globToSafeRegex, escapeForRegex } from '@theunwalked/pressurelid';
export type { SafeRegexResult, SafeRegexConfig, SafeRegexReason } from '@theunwalked/pressurelid';

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
export type { RecipeConfig, ContentItem, TemplateConfig, ToolGuidanceConfig } from "./recipes";
export type {
    ConversationMessage,
    ConversationBuilderConfig,
    ConversationMetadata,
    ConversationState,
    InjectOptions,
    ToolCall
} from "./conversation";
export type {
    DynamicContentItem,
    TrackedContextItem,
    ContextStats
} from "./context-manager";
export type {
    TokenUsage,
    TokenBudgetConfig,
    CompressionStats,
    CompressionStrategy
} from "./token-budget";
export type {
    SemanticRole,
    MessageMetadata
} from "./message-builder";
export type {
    IterationStrategy,
    StrategyPhase,
    StrategyState,
    StrategyResult,
    StrategyContext,
    PhaseResult,
    ToolResult,
    LLMClient,
    ToolUsagePolicy,
    Insight
} from "./iteration-strategy";
export type {
    ReflectionReport,
    ReflectionConfig,
    AgenticExecutionMetrics,
    ToolExecutionMetric,
    ToolStats,
    Recommendation,
    ToolEffectivenessAnalysis,
    PerformanceInsights,
    QualityAssessment
} from "./reflection";
export type {
    LogConfig,
    LogFormat,
    LoggedConversation,
    ConversationLogMetadata,
    LoggedMessage,
    ToolCallLog,
    ConversationSummary,
    ReplayOptions,
    ReplayResult
} from "./conversation-logger";
export type {
    Tool,
    ToolParameter,
    ToolContext,
    ToolExample,
    ToolCost,
    OpenAITool,
    AnthropicTool,
    ToolDefinition,
    ToolUsageStats
} from "./tools";
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
