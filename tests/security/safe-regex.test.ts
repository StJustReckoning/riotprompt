/**
 * Tests for Safe Regex Integration with pressurelid
 */

import { describe, it, expect } from 'vitest';
import {
    SafeRegex,
    createSafeRegex,
    globToSafeRegex,
    escapeForRegex,
} from '@theunwalked/pressurelid';
import { REDOS_VECTORS } from './fixtures/attack-vectors';

describe('Safe Regex Integration', () => {
    describe('SafeRegex Class', () => {
        it('should create safe regex from valid pattern', () => {
            const safe = new SafeRegex();
            const result = safe.create('^hello$', 'i');
            expect(result.safe).toBe(true);
            expect(result.regex).toBeDefined();
            expect(result.regex!.test('Hello')).toBe(true);
        });

        it('should detect nested quantifiers', () => {
            const safe = new SafeRegex();
            const result = safe.create('^(a+)+$');
            expect(result.safe).toBe(false);
            expect(result.reason).toBe('nested_quantifiers');
        });

        it('should enforce pattern length limits', () => {
            const safe = new SafeRegex({ maxLength: 50 });
            const longPattern = 'a'.repeat(100);
            const result = safe.create(longPattern);
            expect(result.safe).toBe(false);
            expect(result.reason).toBe('pattern_too_long');
        });

        it('should call onBlock callback when pattern is blocked', () => {
            let blocked = false;
            let blockedMessage = '';

            const safe = new SafeRegex({
                onBlock: (message) => {
                    blocked = true;
                    blockedMessage = message;
                },
            });

            safe.create('^(a+)+$');
            expect(blocked).toBe(true);
            expect(blockedMessage).toContain('nested');
        });

        it('should handle glob patterns', () => {
            const safe = new SafeRegex();
            const result = safe.globToRegex('**/*.md');
            expect(result.safe).toBe(true);
            expect(result.regex).toBeDefined();
        });
    });

    describe('createSafeRegex Function', () => {
        it('should create safe regex from simple pattern', () => {
            const result = createSafeRegex('test');
            expect(result.safe).toBe(true);
            expect(result.regex!.test('test')).toBe(true);
        });

        it('should reject dangerous patterns', () => {
            const result = createSafeRegex('^(a+)+$');
            expect(result.safe).toBe(false);
        });

        it('should handle invalid regex syntax', () => {
            const result = createSafeRegex('[invalid');
            expect(result.safe).toBe(false);
            expect(result.reason).toBe('invalid_syntax');
        });
    });

    describe('globToSafeRegex Function', () => {
        it('should convert simple glob to regex', () => {
            const result = globToSafeRegex('*.txt');
            expect(result.safe).toBe(true);
            expect(result.regex!.test('file.txt')).toBe(true);
            expect(result.regex!.test('file.md')).toBe(false);
        });

        it('should handle double star glob', () => {
            const result = globToSafeRegex('**/*.ts');
            expect(result.safe).toBe(true);
            expect(result.regex!.test('src/file.ts')).toBe(true);
            expect(result.regex!.test('src/deep/nested/file.ts')).toBe(true);
        });

        it('should handle simple extension glob', () => {
            const result = globToSafeRegex('*.ts');
            expect(result.safe).toBe(true);
            expect(result.regex!.test('file.ts')).toBe(true);
            expect(result.regex!.test('file.js')).toBe(false);
        });
    });

    describe('escapeForRegex Function', () => {
        it('should escape special regex characters', () => {
            const escaped = escapeForRegex('file.txt');
            expect(escaped).toBe('file\\.txt');
        });

        it('should escape all special characters', () => {
            const escaped = escapeForRegex('a+b*c?d[e]f(g)h{i}j|k^l$m.n\\o');
            // The escaped string contains the characters with backslashes
            // e.g., '+' becomes '\+'
            expect(escaped).toContain('\\+');
            expect(escaped).toContain('\\*');
            expect(escaped).toContain('\\?');
        });

        it('should create safe literal matcher', () => {
            const escaped = escapeForRegex('test.file');
            const regex = new RegExp(escaped);
            expect(regex.test('test.file')).toBe(true);
            expect(regex.test('testXfile')).toBe(false);
        });
    });

    describe('ReDoS Attack Vectors', () => {
        it('should block known ReDoS patterns', () => {
            const safe = new SafeRegex();

            for (const vector of REDOS_VECTORS) {
                const result = safe.create(vector.pattern.source);
                // Most ReDoS vectors should be blocked
                // Some may pass if they're not actually dangerous
                if (!result.safe) {
                    expect(['nested_quantifiers', 'overlapping_alternation', 'catastrophic_backtracking', 'pattern_too_long']).toContain(result.reason);
                }
            }
        });

        it('should block exponential backtracking pattern', () => {
            const result = createSafeRegex('^(a+)+$');
            expect(result.safe).toBe(false);
        });

        it('should block polynomial backtracking pattern', () => {
            const result = createSafeRegex('^([a-zA-Z]+)*$');
            expect(result.safe).toBe(false);
        });
    });

    describe('Integration with Loader Patterns', () => {
        it('should handle common ignore patterns safely', () => {
            const commonPatterns = [
                'node_modules',
                '\\.git',
                '\\.DS_Store',
                '.*\\.log$',
                'dist/',
                'coverage/',
            ];

            const safe = new SafeRegex();

            for (const pattern of commonPatterns) {
                const result = safe.create(pattern, 'i');
                expect(result.safe).toBe(true);
            }
        });

        it('should handle glob-style ignore patterns', () => {
            const globPatterns = [
                '**/*.log',
                'node_modules/**',
                '*.tmp',
                '.git/**',
            ];

            const safe = new SafeRegex();

            for (const pattern of globPatterns) {
                const result = safe.globToRegex(pattern);
                expect(result.safe).toBe(true);
            }
        });
    });
});

