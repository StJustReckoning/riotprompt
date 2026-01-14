import { z } from 'zod';

// Path Security Configuration
export const PathSecurityConfigSchema = z.object({
    enabled: z.boolean().optional().default(true),
    basePaths: z.array(z.string()).optional().default([]),
    allowAbsolute: z.boolean().optional().default(false),
    allowSymlinks: z.boolean().optional().default(false),
    denyPatterns: z.array(z.string()).optional().default([
        '\\.\\.',        // Parent directory
        '~',             // Home directory expansion
        '\\$\\{',        // Variable expansion
    ]),
});

// Tool Security Configuration
export const ToolSecurityConfigSchema = z.object({
    enabled: z.boolean().optional().default(true),
    validateParams: z.boolean().optional().default(true),
    sandboxExecution: z.boolean().optional().default(false),
    allowedTools: z.array(z.string()).optional(),
    deniedTools: z.array(z.string()).optional().default([]),
    maxExecutionTime: z.number().optional().default(30000), // 30 seconds
    maxConcurrentCalls: z.number().optional().default(10),
});

// Secret Security Configuration
export const SecretSecurityConfigSchema = z.object({
    enabled: z.boolean().optional().default(true),
    redactInLogs: z.boolean().optional().default(true),
    redactInErrors: z.boolean().optional().default(true),
    patterns: z.array(z.instanceof(RegExp)).optional().default([
        /api[_-]?key[\s:="']+[\w-]+/gi,
        /password[\s:="']+[\w-]+/gi,
        /Bearer\s+[\w-]+/gi,
        /sk-[a-zA-Z0-9]{48,}/g,
        /AKIA[0-9A-Z]{16}/g,  // AWS Access Key
    ]),
    customPatterns: z.array(z.instanceof(RegExp)).optional().default([]),
});

// Logging Security Configuration
export const LogSecurityConfigSchema = z.object({
    enabled: z.boolean().optional().default(true),
    auditSecurityEvents: z.boolean().optional().default(true),
    sanitizeStackTraces: z.boolean().optional().default(true),
    maxContentLength: z.number().optional().default(10000),
});

// Timeout Configuration
export const TimeoutConfigSchema = z.object({
    enabled: z.boolean().optional().default(true),
    defaultTimeout: z.number().optional().default(30000),
    llmTimeout: z.number().optional().default(120000), // 2 minutes for LLM calls
    toolTimeout: z.number().optional().default(30000),
    fileTimeout: z.number().optional().default(5000),
});

// Helper to create default configs
export function createDefaultPathSecurityConfig(): PathSecurityConfig {
    return PathSecurityConfigSchema.parse({});
}

export function createDefaultToolSecurityConfig(): ToolSecurityConfig {
    return ToolSecurityConfigSchema.parse({});
}

export function createDefaultSecretSecurityConfig(): SecretSecurityConfig {
    return SecretSecurityConfigSchema.parse({});
}

export function createDefaultLogSecurityConfig(): LogSecurityConfig {
    return LogSecurityConfigSchema.parse({});
}

export function createDefaultTimeoutConfig(): TimeoutConfig {
    return TimeoutConfigSchema.parse({});
}

// Complete Security Configuration
export const SecurityConfigSchema = z.object({
    paths: PathSecurityConfigSchema.optional().default(createDefaultPathSecurityConfig),
    tools: ToolSecurityConfigSchema.optional().default(createDefaultToolSecurityConfig),
    secrets: SecretSecurityConfigSchema.optional().default(createDefaultSecretSecurityConfig),
    logging: LogSecurityConfigSchema.optional().default(createDefaultLogSecurityConfig),
    timeouts: TimeoutConfigSchema.optional().default(createDefaultTimeoutConfig),
});

// Type exports
export type PathSecurityConfig = z.infer<typeof PathSecurityConfigSchema>;
export type ToolSecurityConfig = z.infer<typeof ToolSecurityConfigSchema>;
export type SecretSecurityConfig = z.infer<typeof SecretSecurityConfigSchema>;
export type LogSecurityConfig = z.infer<typeof LogSecurityConfigSchema>;
export type TimeoutConfig = z.infer<typeof TimeoutConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
