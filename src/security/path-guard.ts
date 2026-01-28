/**
 * RiotPrompt - Path Security Guard
 *
 * Implements path validation to prevent directory traversal attacks
 * in file operations.
 */

import path from 'path';
import { PathSecurityConfig } from './types';
import { getAuditLogger, SecurityAuditLogger } from './audit-logger';

// Re-export PathSecurityConfig for external use
export type { PathSecurityConfig };

/**
 * Result of path validation
 */
export interface PathValidationResult {
    valid: boolean;
    normalizedPath?: string;
    error?: string;
    violation?: string;
}

/**
 * PathGuard provides security validation for file paths.
 *
 * Features:
 * - Directory traversal prevention
 * - Base path restriction
 * - Pattern-based blocking
 * - Null byte detection
 * - Audit logging
 *
 * @example
 * ```typescript
 * const guard = new PathGuard({ basePaths: ['/app/data'] });
 *
 * const result = guard.validate('../../../etc/passwd');
 * // { valid: false, error: 'Path contains forbidden pattern' }
 *
 * const safePath = guard.validateOrThrow('subdir/file.txt');
 * // '/app/data/subdir/file.txt'
 * ```
 */
export class PathGuard {
    private config: PathSecurityConfig;
    private auditLogger: SecurityAuditLogger;
    private basePaths: string[];

    constructor(config: Partial<PathSecurityConfig> = {}, auditLogger?: SecurityAuditLogger) {
        this.config = {
            enabled: true,
            basePaths: [],
            allowAbsolute: false,
            allowSymlinks: false,
            denyPatterns: [
                '\\.\\.',        // Parent directory
                '~',             // Home directory expansion
                '\\$\\{',        // Variable expansion
                '\\$\\(',        // Command substitution
            ],
            ...config,
        };

        // Normalize base paths
        this.basePaths = this.config.basePaths.map(p => path.resolve(p));
        this.auditLogger = auditLogger || getAuditLogger();
    }

    /**
     * Validate and normalize a file path
     *
     * @param inputPath - The path to validate
     * @param operation - The operation being performed (for audit logging)
     * @returns Validation result with normalized path if valid
     */
    validate(inputPath: string, _operation: string = 'access'): PathValidationResult {
        if (!this.config.enabled) {
            return { valid: true, normalizedPath: inputPath };
        }

        // Check for null bytes (path truncation attack)
        if (inputPath.includes('\0')) {
            this.auditLogger.pathTraversalBlocked(inputPath, 'Null byte detected');
            return {
                valid: false,
                error: 'Path contains invalid characters',
                violation: 'null_byte',
            };
        }

        // Check for denied patterns
        for (const pattern of this.config.denyPatterns) {
            try {
                const regex = new RegExp(pattern, 'i');
                if (regex.test(inputPath)) {
                    this.auditLogger.pathTraversalBlocked(inputPath, `Matched deny pattern: ${pattern}`);
                    return {
                        valid: false,
                        error: 'Path contains forbidden pattern',
                        violation: pattern,
                    };
                }
            } catch {
                // Invalid regex pattern, skip
            }
        }

        // Check absolute path handling
        const isAbsolute = path.isAbsolute(inputPath);
        if (isAbsolute && !this.config.allowAbsolute) {
            this.auditLogger.pathTraversalBlocked(inputPath, 'Absolute paths not allowed');
            return {
                valid: false,
                error: 'Absolute paths are not allowed',
                violation: 'absolute_path',
            };
        }

        // Normalize the path
        let normalizedPath: string;
        try {
            if (isAbsolute) {
                normalizedPath = path.normalize(inputPath);
            } else if (this.basePaths.length > 0) {
                // Resolve relative to first base path
                normalizedPath = path.resolve(this.basePaths[0], inputPath);
            } else {
                normalizedPath = path.resolve(inputPath);
            }
        } catch {
            return {
                valid: false,
                error: 'Invalid path format',
            };
        }

        // Verify path is within allowed base paths
        if (this.basePaths.length > 0) {
            const isWithinBase = this.basePaths.some(basePath =>
                normalizedPath.startsWith(basePath + path.sep) || normalizedPath === basePath
            );

            if (!isWithinBase) {
                this.auditLogger.pathTraversalBlocked(inputPath, 'Path escapes allowed directories');
                return {
                    valid: false,
                    error: 'Path is outside allowed directories',
                    violation: 'directory_escape',
                };
            }
        }

        // Check for path traversal after normalization
        // Only check if the path is NOT within any allowed base path
        // (the isWithinBase check above already handles this for absolute paths)

        return {
            valid: true,
            normalizedPath,
        };
    }

    /**
     * Validate and return the path, throwing on failure
     *
     * @param inputPath - The path to validate
     * @param operation - The operation being performed
     * @returns The normalized path
     * @throws Error if validation fails
     */
    validateOrThrow(inputPath: string, operation: string = 'access'): string {
        const result = this.validate(inputPath, operation);
        if (!result.valid) {
            throw new Error(`Path validation failed: ${result.error}`);
        }
        return result.normalizedPath!;
    }

    /**
     * Add a base path at runtime
     *
     * @param basePath - The base path to add
     */
    addBasePath(basePath: string): void {
        const normalized = path.resolve(basePath);
        if (!this.basePaths.includes(normalized)) {
            this.basePaths.push(normalized);
        }
    }

    /**
     * Remove a base path
     *
     * @param basePath - The base path to remove
     */
    removeBasePath(basePath: string): void {
        const normalized = path.resolve(basePath);
        const index = this.basePaths.indexOf(normalized);
        if (index !== -1) {
            this.basePaths.splice(index, 1);
        }
    }

    /**
     * Check if a path is within allowed directories
     *
     * @param testPath - The path to check
     * @returns True if the path is within allowed directories
     */
    isWithinAllowed(testPath: string): boolean {
        if (this.basePaths.length === 0) return true;

        const normalizedTest = path.resolve(testPath);
        return this.basePaths.some(basePath =>
            normalizedTest.startsWith(basePath + path.sep) || normalizedTest === basePath
        );
    }

    /**
     * Get the first base path (for relative resolution)
     *
     * @returns The first base path or undefined
     */
    getBasePath(): string | undefined {
        return this.basePaths[0];
    }

    /**
     * Get all configured base paths
     *
     * @returns Array of base paths
     */
    getBasePaths(): string[] {
        return [...this.basePaths];
    }

    /**
     * Check if path validation is enabled
     *
     * @returns True if enabled
     */
    isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Enable or disable path validation
     *
     * @param enabled - Whether to enable validation
     */
    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
    }
}

// Global instance
let globalPathGuard: PathGuard | null = null;

/**
 * Get the global PathGuard instance
 *
 * @returns The global PathGuard
 */
export function getPathGuard(): PathGuard {
    if (!globalPathGuard) {
        globalPathGuard = new PathGuard();
    }
    return globalPathGuard;
}

/**
 * Configure the global PathGuard
 *
 * @param config - Configuration options
 */
export function configurePathGuard(config: Partial<PathSecurityConfig>): void {
    globalPathGuard = new PathGuard(config);
}

/**
 * Reset the global PathGuard to default
 */
export function resetPathGuard(): void {
    globalPathGuard = null;
}

// ===== GLOB PATTERN SANITIZATION =====

/**
 * Dangerous patterns that should not appear in glob patterns
 */
const DANGEROUS_GLOB_PATTERNS = [
    /\.\.\//,           // Parent directory traversal
    /\.\.\\/,           // Windows parent directory
    /^\//,              // Absolute path (Unix)
    /^[a-zA-Z]:/,       // Absolute path (Windows)
    /^~/,               // Home directory
    /\$\{/,             // Variable expansion
    /\$\(/,             // Command substitution
    /`/,                // Backtick command substitution
];

/**
 * Sanitize a glob pattern by removing potentially dangerous sequences
 * 
 * @param pattern - The glob pattern to sanitize
 * @returns Sanitized glob pattern
 * 
 * @example
 * ```typescript
 * sanitizeGlobPattern('../../../etc/*')  // Returns 'etc/*'
 * sanitizeGlobPattern('/absolute/path/*') // Returns 'absolute/path/*'
 * sanitizeGlobPattern('~/secrets/*')      // Returns 'secrets/*'
 * ```
 */
export function sanitizeGlobPattern(pattern: string): string {
    let safe = pattern;
    
    // Remove parent directory references completely by filtering segments
    // Split by path separators, remove .. segments, then rejoin
    // This approach avoids the incomplete sanitization issue
    const parts = safe.split(/([/\\])/); // Split but keep separators
    const filtered: string[] = [];
    
    for (const part of parts) {
        // Keep separators as-is
        if (part === '/' || part === '\\') {
            filtered.push(part);
            continue;
        }
        
        // Skip parent directory references
        if (part === '..' || part.startsWith('..')) {
            continue;
        }
        
        // Keep other segments
        if (part) {
            filtered.push(part);
        }
    }
    
    safe = filtered.join('');
    
    // Clean up consecutive separators (but preserve them in general)
    safe = safe
        .replace(/\/\/+/g, '/')
        .replace(/\\\\+/g, '\\');
    
    // Remove absolute path starters
    safe = safe
        .replace(/^\/+/, '')
        .replace(/^[a-zA-Z]:[\\/]?/, '')
        // Remove home directory references
        .replace(/^~[\\/]?/, '')
        // Remove variable expansion
        .replace(/\$\{[^}]*\}/g, '')
        // Remove command substitution
        .replace(/\$\([^)]*\)/g, '')
        .replace(/`[^`]*`/g, '');

    // Remove any remaining dangerous characters at the start
    while (safe.startsWith('/') || safe.startsWith('\\')) {
        safe = safe.substring(1);
    }

    return safe;
}

/**
 * Check if a glob pattern is safe to use
 * 
 * @param pattern - The glob pattern to check
 * @returns true if safe, false if potentially dangerous
 * 
 * @example
 * ```typescript
 * isGlobSafe('src/**\/*.ts')        // true
 * isGlobSafe('../../../etc/passwd') // false
 * isGlobSafe('/etc/*')              // false
 * ```
 */
export function isGlobSafe(pattern: string): boolean {
    return !DANGEROUS_GLOB_PATTERNS.some(re => re.test(pattern));
}

/**
 * Result of glob pattern validation
 */
export interface GlobValidationResult {
    safe: boolean;
    sanitized?: string;
    warnings: string[];
}

/**
 * Validate and optionally sanitize a glob pattern
 * 
 * @param pattern - The glob pattern to validate
 * @param options - Validation options
 * @returns Validation result with sanitized pattern if requested
 */
export function validateGlobPattern(
    pattern: string,
    options: { sanitize?: boolean } = {}
): GlobValidationResult {
    const warnings: string[] = [];

    // Check for dangerous patterns
    for (const dangerousPattern of DANGEROUS_GLOB_PATTERNS) {
        if (dangerousPattern.test(pattern)) {
            warnings.push(`Pattern contains potentially dangerous sequence: ${dangerousPattern.source}`);
        }
    }

    const safe = warnings.length === 0;

    if (options.sanitize && !safe) {
        return {
            safe: false,
            sanitized: sanitizeGlobPattern(pattern),
            warnings,
        };
    }

    return {
        safe,
        sanitized: safe ? pattern : undefined,
        warnings,
    };
}

