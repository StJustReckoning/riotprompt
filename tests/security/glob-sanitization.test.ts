/**
 * Tests for glob pattern sanitization
 */

import { describe, it, expect } from 'vitest';
import {
    sanitizeGlobPattern,
    isGlobSafe,
    validateGlobPattern,
} from '../../src/security/path-guard';

describe('sanitizeGlobPattern', () => {
    it('should remove parent directory traversal', () => {
        expect(sanitizeGlobPattern('../../../etc/*')).toBe('etc/*');
        expect(sanitizeGlobPattern('foo/../bar/*')).toBe('foo/bar/*');
        expect(sanitizeGlobPattern('..\\..\\windows\\*')).toBe('windows\\*');
    });

    it('should remove absolute path starters (Unix)', () => {
        expect(sanitizeGlobPattern('/etc/passwd')).toBe('etc/passwd');
        expect(sanitizeGlobPattern('///absolute/path/*')).toBe('absolute/path/*');
    });

    it('should remove absolute path starters (Windows)', () => {
        expect(sanitizeGlobPattern('C:\\Windows\\*')).toBe('Windows\\*');
        expect(sanitizeGlobPattern('D:/data/*')).toBe('data/*');
    });

    it('should remove home directory references', () => {
        expect(sanitizeGlobPattern('~/secrets/*')).toBe('secrets/*');
        expect(sanitizeGlobPattern('~/.ssh/*')).toBe('.ssh/*');
    });

    it('should remove variable expansion', () => {
        // Leading slash is also removed after variable expansion
        expect(sanitizeGlobPattern('${HOME}/secrets/*')).toBe('secrets/*');
        expect(sanitizeGlobPattern('foo/${VAR}/bar')).toBe('foo//bar');
    });

    it('should remove command substitution', () => {
        // Leading slash is also removed after command substitution
        expect(sanitizeGlobPattern('$(whoami)/data/*')).toBe('data/*');
        expect(sanitizeGlobPattern('`id`/secrets/*')).toBe('secrets/*');
    });

    it('should handle safe patterns unchanged', () => {
        expect(sanitizeGlobPattern('src/**/*.ts')).toBe('src/**/*.ts');
        expect(sanitizeGlobPattern('*.md')).toBe('*.md');
        expect(sanitizeGlobPattern('docs/*.txt')).toBe('docs/*.txt');
    });

    it('should handle complex malicious patterns', () => {
        const malicious = '../../../${HOME}/.ssh/$(cat /etc/passwd)';
        const sanitized = sanitizeGlobPattern(malicious);
        
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('${');
        expect(sanitized).not.toContain('$(');
    });
});

describe('isGlobSafe', () => {
    it('should return true for safe patterns', () => {
        expect(isGlobSafe('src/**/*.ts')).toBe(true);
        expect(isGlobSafe('*.md')).toBe(true);
        expect(isGlobSafe('docs/*.txt')).toBe(true);
        expect(isGlobSafe('test/fixtures/**/*')).toBe(true);
    });

    it('should return false for parent directory traversal', () => {
        expect(isGlobSafe('../etc/*')).toBe(false);
        expect(isGlobSafe('foo/../bar')).toBe(false);
    });

    it('should return false for absolute paths', () => {
        expect(isGlobSafe('/etc/passwd')).toBe(false);
        expect(isGlobSafe('C:\\Windows')).toBe(false);
    });

    it('should return false for home directory', () => {
        expect(isGlobSafe('~/.ssh/*')).toBe(false);
    });

    it('should return false for variable expansion', () => {
        expect(isGlobSafe('${HOME}/*')).toBe(false);
    });
});

describe('validateGlobPattern', () => {
    it('should validate safe patterns', () => {
        const result = validateGlobPattern('src/**/*.ts');
        
        expect(result.safe).toBe(true);
        expect(result.sanitized).toBe('src/**/*.ts');
        expect(result.warnings).toHaveLength(0);
    });

    it('should detect dangerous patterns', () => {
        const result = validateGlobPattern('../etc/*');
        
        expect(result.safe).toBe(false);
        expect(result.sanitized).toBeUndefined();
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should sanitize when requested', () => {
        const result = validateGlobPattern('../etc/*', { sanitize: true });
        
        expect(result.safe).toBe(false);
        expect(result.sanitized).toBe('etc/*');
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should detect multiple dangerous patterns', () => {
        const result = validateGlobPattern('../${HOME}/~/.ssh/*');
        
        expect(result.safe).toBe(false);
        expect(result.warnings.length).toBeGreaterThan(1);
    });
});

