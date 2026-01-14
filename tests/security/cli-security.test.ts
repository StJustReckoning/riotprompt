/**
 * Tests for CLI Security Validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    CLIValidator,
    getCLIValidator,
    configureCLIValidator,
    resetCLIValidator,
    createRiotPromptValidator,
    DEFAULT_CLI_SECURITY,
} from '../../src/security/cli-security';
import { resetAuditLogger } from '../../src/security/audit-logger';

describe('CLIValidator', () => {
    let validator: CLIValidator;

    beforeEach(() => {
        resetAuditLogger();
        resetCLIValidator();
        validator = new CLIValidator();
    });

    afterEach(() => {
        resetCLIValidator();
    });

    describe('Path Validation', () => {
        it('should accept valid relative paths', () => {
            const result = validator.validatePath('prompts/test.md');
            expect(result.valid).toBe(true);
        });

        it('should reject path traversal attempts', () => {
            const result = validator.validatePath('../../../etc/passwd');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('forbidden pattern');
        });

        it('should reject home directory expansion', () => {
            const result = validator.validatePath('~/secret.txt');
            expect(result.valid).toBe(false);
        });

        it('should reject variable expansion', () => {
            const result = validator.validatePath('${HOME}/secret.txt');
            expect(result.valid).toBe(false);
        });

        it('should validate file extensions when requested', () => {
            const result = validator.validatePath('script.sh', { checkExtension: true });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('extension');
        });

        it('should accept allowed extensions', () => {
            const result = validator.validatePath('prompts/test.md', { checkExtension: true });
            expect(result.valid).toBe(true);
        });

        it('should pass through when disabled', () => {
            const disabledValidator = new CLIValidator({ enabled: false });
            const result = disabledValidator.validatePath('../../../etc/passwd');
            expect(result.valid).toBe(true);
        });
    });

    describe('String Validation', () => {
        it('should accept valid strings', () => {
            const result = validator.validateString('Hello, world!');
            expect(result.valid).toBe(true);
            expect(result.sanitized).toBe('Hello, world!');
        });

        it('should reject null bytes', () => {
            const result = validator.validateString('test\0string');
            expect(result.valid).toBe(false);
            expect(result.violation).toBe('null_byte');
        });

        it('should reject control characters', () => {
            const result = validator.validateString('test\x07string');
            expect(result.valid).toBe(false);
            expect(result.violation).toBe('control_char');
        });

        it('should allow common whitespace', () => {
            const result = validator.validateString('test\n\t string');
            expect(result.valid).toBe(true);
        });

        it('should reject strings that are too long', () => {
            const longString = 'a'.repeat(20000);
            const result = validator.validateString(longString);
            expect(result.valid).toBe(false);
            expect(result.violation).toBe('length');
        });

        it('should allow null bytes when configured', () => {
            const permissiveValidator = new CLIValidator({ 
                enabled: true,
                allowNullBytes: true,
                allowControlChars: false,
                maxStringLength: 10000,
                paths: {},
                allowedExtensions: [],
            });
            const result = permissiveValidator.validateString('test\0string');
            expect(result.valid).toBe(true);
        });
    });

    describe('Number Validation', () => {
        it('should accept valid numbers', () => {
            const result = validator.validateNumber(42);
            expect(result.valid).toBe(true);
        });

        it('should reject NaN by default', () => {
            const result = validator.validateNumber(NaN);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('NaN');
        });

        it('should reject Infinity by default', () => {
            const result = validator.validateNumber(Infinity);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('infinite');
        });

        it('should enforce minimum value', () => {
            const result = validator.validateNumber(5, { min: 10 });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('at least 10');
        });

        it('should enforce maximum value', () => {
            const result = validator.validateNumber(100, { max: 50 });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('at most 50');
        });

        it('should enforce integer constraint', () => {
            const result = validator.validateNumber(3.14, { integer: true });
            expect(result.valid).toBe(false);
            expect(result.error).toContain('integer');
        });

        it('should allow NaN when configured', () => {
            const result = validator.validateNumber(NaN, { allowNaN: true });
            expect(result.valid).toBe(true);
        });

        it('should allow Infinity when configured', () => {
            const result = validator.validateNumber(Infinity, { allowInfinity: true });
            expect(result.valid).toBe(true);
        });
    });

    describe('Zod Schema Integration', () => {
        it('should create secure path schema', () => {
            const schema = validator.securePathSchema();
            expect(() => schema.parse('valid/path.md')).not.toThrow();
            expect(() => schema.parse('../../../etc/passwd')).toThrow();
        });

        it('should create secure string schema', () => {
            const schema = validator.secureStringSchema();
            expect(() => schema.parse('valid string')).not.toThrow();
            expect(() => schema.parse('invalid\0string')).toThrow();
        });

        it('should create secure number schema', () => {
            const schema = validator.secureNumberSchema({ min: 0, max: 100 });
            expect(() => schema.parse(50)).not.toThrow();
            expect(() => schema.parse(150)).toThrow();
        });
    });

    describe('Base Path Management', () => {
        it('should add base paths', () => {
            validator.addBasePath('/app/data');
            const pathGuard = validator.getPathGuard();
            expect(pathGuard.getBasePaths().length).toBeGreaterThan(0);
        });
    });

    describe('Global Instance', () => {
        it('should provide global instance', () => {
            const v1 = getCLIValidator();
            const v2 = getCLIValidator();
            expect(v1).toBe(v2);
        });

        it('should allow configuration', () => {
            configureCLIValidator({ maxStringLength: 500 });
            const v = getCLIValidator();
            const result = v.validateString('a'.repeat(600));
            expect(result.valid).toBe(false);
        });

        it('should reset properly', () => {
            configureCLIValidator({ maxStringLength: 500 });
            resetCLIValidator();
            const v = getCLIValidator();
            const result = v.validateString('a'.repeat(600));
            // Default is 10000, so 600 should be valid
            expect(result.valid).toBe(true);
        });
    });

    describe('createRiotPromptValidator', () => {
        it('should create validator with cwd as base path', () => {
            const v = createRiotPromptValidator();
            const pathGuard = v.getPathGuard();
            expect(pathGuard.getBasePaths().length).toBeGreaterThan(0);
        });

        it('should accept custom base paths', () => {
            const v = createRiotPromptValidator(['/custom/path']);
            const pathGuard = v.getPathGuard();
            expect(pathGuard.getBasePaths()).toContain('/custom/path');
        });
    });

    describe('DEFAULT_CLI_SECURITY', () => {
        it('should have sensible defaults', () => {
            expect(DEFAULT_CLI_SECURITY.enabled).toBe(true);
            expect(DEFAULT_CLI_SECURITY.allowNullBytes).toBe(false);
            expect(DEFAULT_CLI_SECURITY.allowControlChars).toBe(false);
            expect(DEFAULT_CLI_SECURITY.allowedExtensions).toContain('.md');
            expect(DEFAULT_CLI_SECURITY.allowedExtensions).toContain('.json');
        });
    });
});

