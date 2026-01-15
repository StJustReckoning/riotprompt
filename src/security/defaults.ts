import { 
    SecurityConfig, 
    SecurityConfigSchema,
    PathSecurityConfig,
    ToolSecurityConfig,
    SecretSecurityConfig,
    LogSecurityConfig,
    TimeoutConfig,
} from './types';

/**
 * Deep partial type for recursive partial objects
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * User configuration with all fields optional (including nested)
 */
export type UserSecurityConfig = {
    paths?: Partial<PathSecurityConfig>;
    tools?: Partial<ToolSecurityConfig>;
    secrets?: Partial<SecretSecurityConfig>;
    logging?: Partial<LogSecurityConfig>;
    timeouts?: Partial<TimeoutConfig>;
};

/**
 * Secure default configuration
 * All security features enabled by default
 */
export const SECURE_DEFAULTS: SecurityConfig = SecurityConfigSchema.parse({});

/**
 * Permissive configuration for development/testing
 * Security features disabled for convenience
 */
export const PERMISSIVE_DEFAULTS: SecurityConfig = {
    paths: { 
        enabled: false, 
        basePaths: [], 
        allowAbsolute: true, 
        allowSymlinks: true, 
        denyPatterns: [] 
    },
    tools: { 
        enabled: false, 
        validateParams: false, 
        sandboxExecution: false, 
        maxExecutionTime: 0, 
        maxConcurrentCalls: 0, 
        deniedTools: [] 
    },
    secrets: { 
        enabled: false, 
        redactInLogs: false, 
        redactInErrors: false, 
        patterns: [], 
        customPatterns: [] 
    },
    logging: { 
        enabled: false, 
        auditSecurityEvents: false, 
        sanitizeStackTraces: false, 
        maxContentLength: Number.MAX_SAFE_INTEGER 
    },
    timeouts: { 
        enabled: false, 
        defaultTimeout: 0, 
        llmTimeout: 0, 
        toolTimeout: 0, 
        fileTimeout: 0 
    },
};

/**
 * Merge user configuration with defaults
 */
export function mergeSecurityConfig(
    userConfig: UserSecurityConfig | undefined,
    defaults: SecurityConfig = SECURE_DEFAULTS
): SecurityConfig {
    if (!userConfig) return defaults;
  
    // Deep merge each section
    const merged: SecurityConfig = {
        paths: mergeSection(defaults.paths, userConfig.paths),
        tools: mergeSection(defaults.tools, userConfig.tools),
        secrets: mergeSection(defaults.secrets, userConfig.secrets),
        logging: mergeSection(defaults.logging, userConfig.logging),
        timeouts: mergeSection(defaults.timeouts, userConfig.timeouts),
    };
  
    return merged;
}

/**
 * Helper to merge a single section
 */
function mergeSection<T extends Record<string, unknown>>(
    defaultSection: T,
    userSection: Partial<T> | undefined
): T {
    if (!userSection) return defaultSection;
    return { ...defaultSection, ...userSection };
}
