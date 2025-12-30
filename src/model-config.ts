/**
 * Model Configuration System
 *
 * Provides a flexible, user-configurable system for model detection and configuration
 * that doesn't hardcode model names.
 */

import { DEFAULT_LOGGER, wrapLogger } from "./logger";

// ===== TYPE DEFINITIONS =====

/**
 * Model role mapping for persona/system messages
 */
export type PersonaRole = 'system' | 'developer';

/**
 * Tokenizer encoding to use for token counting
 */
export type TokenizerEncoding = 'gpt-4o' | 'cl100k_base' | 'o200k_base';

/**
 * Configuration for a model or model family
 */
export interface ModelConfig {
    // Model identification
    pattern?: RegExp;           // Pattern to match model name
    exactMatch?: string;        // Exact model name match

    // Model characteristics
    personaRole: PersonaRole;   // Role to use for persona/system messages
    encoding: TokenizerEncoding; // Tokenizer encoding

    // Capabilities
    supportsToolCalls?: boolean;
    maxTokens?: number;

    // Metadata
    family?: string;            // Model family (e.g., 'gpt-4', 'o-series', 'claude')
    description?: string;
}

/**
 * Model registry for managing model configurations
 */
export class ModelRegistry {
    private configs: ModelConfig[];
    private cache: Map<string, ModelConfig>;
    private logger: any;

    constructor(logger?: any) {
        this.configs = [];
        this.cache = new Map();
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'ModelRegistry');

        // Register default configurations
        this.registerDefaults();
    }

    /**
     * Register default model configurations
     */
    private registerDefaults(): void {
        // Default fallback (Registered first so it ends up last with unshift)
        this.register({
            pattern: /.*/,  // Matches anything
            personaRole: 'system',
            encoding: 'gpt-4o',
            supportsToolCalls: true,
            family: 'unknown',
            description: 'Default fallback configuration'
        });

        // Claude family (uses 'system' role)
        this.register({
            pattern: /^claude/i,
            personaRole: 'system',
            encoding: 'cl100k_base',
            supportsToolCalls: true,
            family: 'claude',
            description: 'Claude family models'
        });

        // O-series models (uses 'developer' role)
        this.register({
            pattern: /^o\d+/i,  // Matches o1, o2, o3, o4, etc.
            personaRole: 'developer',
            encoding: 'gpt-4o',
            supportsToolCalls: true,
            family: 'o-series',
            description: 'O-series reasoning models'
        });

        // GPT-4 family (uses 'system' role)
        this.register({
            pattern: /^gpt-4/i,
            personaRole: 'system',
            encoding: 'gpt-4o',
            supportsToolCalls: true,
            family: 'gpt-4',
            description: 'GPT-4 family models'
        });

        this.logger.debug('Registered default model configurations');
    }

    /**
     * Register a model configuration
     * Configs are checked in registration order (first match wins)
     * New configs are added to the beginning of the list (high priority)
     */
    register(config: ModelConfig): void {
        // Validate config
        if (!config.pattern && !config.exactMatch) {
            throw new Error('Model config must have either pattern or exactMatch');
        }

        this.configs.unshift(config);
        this.cache.clear(); // Clear cache when new config is added

        this.logger.debug('Registered model config', {
            family: config.family,
            pattern: config.pattern?.source,
            exactMatch: config.exactMatch
        });
    }

    /**
     * Get configuration for a model
     */
    getConfig(model: string): ModelConfig {
        // Check cache first
        if (this.cache.has(model)) {
            return this.cache.get(model)!;
        }

        // Find matching config (first match wins)
        for (const config of this.configs) {
            if (config.exactMatch && config.exactMatch === model) {
                this.cache.set(model, config);
                return config;
            }

            if (config.pattern && config.pattern.test(model)) {
                this.cache.set(model, config);
                return config;
            }
        }

        // Should never happen due to default fallback, but just in case
        throw new Error(`No configuration found for model: ${model}`);
    }

    /**
     * Get persona role for a model
     */
    getPersonaRole(model: string): PersonaRole {
        return this.getConfig(model).personaRole;
    }

    /**
     * Get tokenizer encoding for a model
     */
    getEncoding(model: string): TokenizerEncoding {
        return this.getConfig(model).encoding;
    }

    /**
     * Check if model supports tool calls
     */
    supportsToolCalls(model: string): boolean {
        return this.getConfig(model).supportsToolCalls ?? true;
    }

    /**
     * Get model family
     */
    getFamily(model: string): string | undefined {
        return this.getConfig(model).family;
    }

    /**
     * Clear all registered configs and reset to defaults
     */
    reset(): void {
        this.configs = [];
        this.cache.clear();
        this.registerDefaults();
        this.logger.debug('Reset model configurations to defaults');
    }

    /**
     * Clear cache (useful if configs are modified)
     */
    clearCache(): void {
        this.cache.clear();
        this.logger.debug('Cleared model configuration cache');
    }

    /**
     * Get all registered configurations
     */
    getAllConfigs(): ModelConfig[] {
        return [...this.configs];
    }
}

// Global registry instance
let globalRegistry: ModelRegistry | null = null;

/**
 * Get the global model registry
 */
export function getModelRegistry(logger?: any): ModelRegistry {
    if (!globalRegistry) {
        globalRegistry = new ModelRegistry(logger);
    }
    return globalRegistry;
}

/**
 * Reset the global registry (useful for testing)
 */
export function resetModelRegistry(): void {
    globalRegistry = null;
}

/**
 * Helper functions using global registry
 */
export function getPersonaRole(model: string): PersonaRole {
    return getModelRegistry().getPersonaRole(model);
}

export function getEncoding(model: string): TokenizerEncoding {
    return getModelRegistry().getEncoding(model);
}

export function supportsToolCalls(model: string): boolean {
    return getModelRegistry().supportsToolCalls(model);
}

export function getModelFamily(model: string): string | undefined {
    return getModelRegistry().getFamily(model);
}

/**
 * Configure a custom model
 *
 * @example
 * ```typescript
 * // Add support for a new model family
 * configureModel({
 *   pattern: /^gemini/i,
 *   personaRole: 'system',
 *   encoding: 'cl100k_base',
 *   family: 'gemini'
 * });
 *
 * // Add specific model override
 * configureModel({
 *   exactMatch: 'custom-model-v1',
 *   personaRole: 'developer',
 *   encoding: 'gpt-4o'
 * });
 * ```
 */
export function configureModel(config: ModelConfig): void {
    getModelRegistry().register(config);
}

export default ModelRegistry;

