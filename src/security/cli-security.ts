/**
 * RiotPrompt - CLI Security
 *
 * Provides security validation for CLI inputs using the existing
 * security infrastructure.
 */

import { z } from 'zod';
import { PathGuard, type PathSecurityConfig } from './path-guard';
import { getAuditLogger, SecurityAuditLogger } from './audit-logger';

/**
 * CLI Security configuration
 */
export interface CLISecurityConfig {
    /** Enable CLI security validation */
    enabled: boolean;
    /** Path security configuration */
    paths: Partial<PathSecurityConfig>;
    /** Allowed file extensions for input files */
    allowedExtensions: string[];
    /** Maximum string length for inputs */
    maxStringLength: number;
    /** Allow null bytes in strings */
    allowNullBytes: boolean;
    /** Allow control characters in strings */
    allowControlChars: boolean;
}

/**
 * Default CLI security configuration
 */
export const DEFAULT_CLI_SECURITY: CLISecurityConfig = {
    enabled: true,
    paths: {
        enabled: true,
        allowAbsolute: false,
        allowSymlinks: false,
        denyPatterns: [
            '\\.\\.',        // Parent directory
            '~',             // Home directory expansion
            '\\$\\{',        // Variable expansion
            '\\$\\(',        // Command substitution
        ],
    },
    allowedExtensions: ['.md', '.json', '.xml', '.yaml', '.yml', '.txt'],
    maxStringLength: 10000,
    allowNullBytes: false,
    allowControlChars: false,
};

/**
 * String validation result
 */
export interface StringValidationResult {
    valid: boolean;
    sanitized?: string;
    error?: string;
    violation?: string;
}

/**
 * CLIValidator provides security validation for CLI inputs.
 *
 * Features:
 * - Path validation with traversal prevention
 * - String sanitization
 * - Extension filtering
 * - Audit logging
 *
 * @example
 * ```typescript
 * const validator = new CLIValidator();
 *
 * // Validate a path argument
 * const pathResult = validator.validatePath('../../../etc/passwd');
 * if (!pathResult.valid) {
 *   console.error(pathResult.error);
 *   process.exit(1);
 * }
 *
 * // Validate a string argument
 * const stringResult = validator.validateString(userInput);
 * ```
 */
export class CLIValidator {
    private config: CLISecurityConfig;
    private pathGuard: PathGuard;
    private auditLogger: SecurityAuditLogger;

    constructor(config: Partial<CLISecurityConfig> = {}) {
        this.config = {
            ...DEFAULT_CLI_SECURITY,
            ...config,
            paths: { ...DEFAULT_CLI_SECURITY.paths, ...config.paths },
        };
        this.pathGuard = new PathGuard(this.config.paths);
        this.auditLogger = getAuditLogger();
    }

    /**
     * Validate a path argument
     *
     * @param inputPath - The path to validate
     * @param options - Additional validation options
     * @returns Validation result
     */
    validatePath(inputPath: string, options: {
        checkExtension?: boolean;
        operation?: string;
    } = {}): { valid: boolean; normalizedPath?: string; error?: string } {
        if (!this.config.enabled) {
            return { valid: true, normalizedPath: inputPath };
        }

        // First, validate with PathGuard
        const pathResult = this.pathGuard.validate(inputPath, options.operation || 'cli');
        if (!pathResult.valid) {
            return pathResult;
        }

        // Check extension if requested
        if (options.checkExtension && this.config.allowedExtensions.length > 0) {
            const ext = inputPath.toLowerCase().split('.').pop();
            const hasAllowedExt = this.config.allowedExtensions.some(
                allowed => inputPath.toLowerCase().endsWith(allowed)
            );

            if (!hasAllowedExt) {
                this.auditLogger.log({
                    type: 'path_traversal_blocked',
                    severity: 'warning',
                    message: `Invalid file extension: .${ext}`,
                    context: { attemptedPath: inputPath },
                });
                return {
                    valid: false,
                    error: `Invalid file extension. Allowed: ${this.config.allowedExtensions.join(', ')}`,
                };
            }
        }

        return pathResult;
    }

    /**
     * Validate a string argument
     *
     * @param input - The string to validate
     * @returns Validation result with sanitized string
     */
    validateString(input: string): StringValidationResult {
        if (!this.config.enabled) {
            return { valid: true, sanitized: input };
        }

        // Check length
        if (input.length > this.config.maxStringLength) {
            return {
                valid: false,
                error: `String too long (max ${this.config.maxStringLength} characters)`,
                violation: 'length',
            };
        }

        // Check for null bytes
        if (!this.config.allowNullBytes && input.includes('\0')) {
            this.auditLogger.log({
                type: 'path_validation_failed',
                severity: 'warning',
                message: 'Null byte detected in input',
            });
            return {
                valid: false,
                error: 'Input contains invalid characters (null byte)',
                violation: 'null_byte',
            };
        }

        // Check for control characters (except common whitespace)
        // Note: null bytes are handled separately above
        if (!this.config.allowControlChars) {
            // eslint-disable-next-line no-control-regex
            const controlCharRegex = /[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/;
            if (controlCharRegex.test(input)) {
                this.auditLogger.log({
                    type: 'path_validation_failed',
                    severity: 'warning',
                    message: 'Control character detected in input',
                });
                return {
                    valid: false,
                    error: 'Input contains invalid control characters',
                    violation: 'control_char',
                };
            }
        }

        return { valid: true, sanitized: input };
    }

    /**
     * Validate a numeric argument
     *
     * @param input - The number to validate
     * @param options - Validation options
     * @returns Validation result
     */
    validateNumber(input: number, options: {
        min?: number;
        max?: number;
        integer?: boolean;
        allowNaN?: boolean;
        allowInfinity?: boolean;
    } = {}): { valid: boolean; error?: string } {
        if (!this.config.enabled) {
            return { valid: true };
        }

        // Check NaN
        if (Number.isNaN(input)) {
            if (!options.allowNaN) {
                return { valid: false, error: 'Value cannot be NaN' };
            }
            // If NaN is allowed, skip other checks since they don't apply
            return { valid: true };
        }

        // Check Infinity (only for non-NaN values)
        if (!options.allowInfinity && !Number.isFinite(input)) {
            return { valid: false, error: 'Value cannot be infinite' };
        }

        // Check integer
        if (options.integer && !Number.isInteger(input)) {
            return { valid: false, error: 'Value must be an integer' };
        }

        // Check min
        if (options.min !== undefined && input < options.min) {
            return { valid: false, error: `Value must be at least ${options.min}` };
        }

        // Check max
        if (options.max !== undefined && input > options.max) {
            return { valid: false, error: `Value must be at most ${options.max}` };
        }

        return { valid: true };
    }

    /**
     * Create a Zod schema for secure path validation
     */
    securePathSchema(options: {
        checkExtension?: boolean;
    } = {}) {
        return z.string().refine(
            (val: string) => this.validatePath(val, options).valid,
            { message: 'Invalid path' }
        );
    }

    /**
     * Create a Zod schema for secure string validation
     */
    secureStringSchema() {
        return z.string().refine(
            (val: string) => this.validateString(val).valid,
            { message: 'Invalid string' }
        );
    }

    /**
     * Create a Zod schema for secure number validation
     */
    secureNumberSchema(options: {
        min?: number;
        max?: number;
        integer?: boolean;
    } = {}) {
        return z.number().refine(
            (val: number) => this.validateNumber(val, options).valid,
            { message: 'Invalid number' }
        );
    }

    /**
     * Get the underlying PathGuard
     */
    getPathGuard(): PathGuard {
        return this.pathGuard;
    }

    /**
     * Add a base path for path validation
     */
    addBasePath(basePath: string): void {
        this.pathGuard.addBasePath(basePath);
    }
}

/**
 * Create a CLI validator with RiotPrompt defaults
 */
export function createRiotPromptValidator(basePaths?: string[]): CLIValidator {
    const validator = new CLIValidator({
        paths: {
            basePaths: basePaths || [process.cwd()],
        },
    });
    return validator;
}

// Global instance
let globalCLIValidator: CLIValidator | null = null;

/**
 * Get the global CLI validator
 */
export function getCLIValidator(): CLIValidator {
    if (!globalCLIValidator) {
        globalCLIValidator = new CLIValidator();
    }
    return globalCLIValidator;
}

/**
 * Configure the global CLI validator
 */
export function configureCLIValidator(config: Partial<CLISecurityConfig>): void {
    globalCLIValidator = new CLIValidator(config);
}

/**
 * Reset the global CLI validator
 */
export function resetCLIValidator(): void {
    globalCLIValidator = null;
}

