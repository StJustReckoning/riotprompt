/**
 * End-to-End Security Tests
 * 
 * Tests that verify security across the full stack.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as Loader from '../../../src/loader';
import { ConversationLogger } from '../../../src/conversation-logger';
import { PathGuard, configurePathGuard, resetPathGuard } from '../../../src/security/path-guard';
import { CLIValidator, resetCLIValidator } from '../../../src/security/cli-security';
import { TimeoutGuard, TimeoutError } from '../../../src/security/timeout-guard';
import { sanitize, initializeErrorHandling } from '../../../src/error-handling';
import { PATH_TRAVERSAL_VECTORS, SENSITIVE_DATA_SAMPLES } from '../fixtures/attack-vectors';

describe('E2E Security Tests', () => {
    beforeEach(() => {
        resetPathGuard();
        resetCLIValidator();
    });

    describe('Full Stack Path Security', () => {
        it('should block path traversal through PathGuard', () => {
            const guard = new PathGuard({
                enabled: true,
                basePaths: ['/app/prompts'],
                allowAbsolute: false,
            });

            let blocked = 0;
            for (const vector of PATH_TRAVERSAL_VECTORS) {
                const result = guard.validate(vector);
                if (!result.valid) {
                    blocked++;
                }
            }

            // Should block most traversal attempts
            expect(blocked / PATH_TRAVERSAL_VECTORS.length).toBeGreaterThan(0.7);
        });

        it('should block path traversal through CLI validator', () => {
            const validator = new CLIValidator({
                enabled: true,
                paths: {
                    enabled: true,
                    basePaths: [process.cwd()],
                    allowAbsolute: false,
                    allowSymlinks: false,
                    denyPatterns: ['\\.\\.',  '~', '\\$\\{', '\\$\\('],
                },
                strings: { enabled: true, maxLength: 10000, allowNullBytes: false, allowControlChars: false },
                numbers: { enabled: true, allowNaN: false, allowInfinity: false },
            });

            let blocked = 0;
            for (const vector of PATH_TRAVERSAL_VECTORS) {
                const result = validator.validatePath(vector);
                if (!result.valid) {
                    blocked++;
                }
            }

            // Should block most traversal attempts
            expect(blocked / PATH_TRAVERSAL_VECTORS.length).toBeGreaterThan(0.7);
        });
    });

    describe('Full Stack Secret Protection', () => {
        it('should redact secrets through ConversationLogger', () => {
            const logger = new ConversationLogger({
                enabled: true,
                redactSensitive: true,
            });

            // Add messages with sensitive data
            for (const sample of SENSITIVE_DATA_SAMPLES) {
                logger.onMessageAdded({
                    role: 'user',
                    content: sample.input,
                });
            }

            const conversation = logger.getConversation();

            // Check that sensitive patterns are redacted
            for (const message of conversation.messages) {
                // API keys should be masked
                expect(message.content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
                expect(message.content).not.toMatch(/sk-ant-[a-zA-Z0-9_-]+/);
            }
        });

        it('should redact secrets in error messages', () => {
            initializeErrorHandling({ environment: 'production' });

            const errorWithSecret = new Error(
                'Failed to connect with key sk-secret1234567890abcdefghijklmnop'
            );

            const { external, internal } = sanitize(errorWithSecret);

            // External message should not contain the secret
            expect(external.message).not.toContain('sk-secret1234567890');
            // Correlation ID should be present
            expect(external.correlationId).toBeDefined();
            // Internal should have original for debugging
            expect(internal.originalMessage).toContain('sk-secret');
        });
    });

    describe('Full Stack Timeout Protection', () => {
        it('should timeout long-running operations', async () => {
            const guard = new TimeoutGuard({
                enabled: true,
                defaultTimeout: 100,
                llmTimeout: 100,
                toolTimeout: 100,
                fileTimeout: 100,
            });

            const slowOperation = new Promise(resolve => setTimeout(resolve, 5000));

            await expect(
                guard.withTimeout(slowOperation, 100, 'test-operation')
            ).rejects.toThrow(TimeoutError);
        });

        it('should allow fast operations to complete', async () => {
            const guard = new TimeoutGuard({
                enabled: true,
                defaultTimeout: 1000,
                llmTimeout: 1000,
                toolTimeout: 1000,
                fileTimeout: 1000,
            });

            const fastOperation = Promise.resolve('success');

            const result = await guard.withTimeout(fastOperation, 1000, 'test-operation');
            expect(result).toBe('success');
        });
    });

    describe('Full Stack Input Validation', () => {
        it('should validate string inputs', () => {
            const validator = new CLIValidator({
                enabled: true,
                paths: { enabled: true, basePaths: [], allowAbsolute: false, allowSymlinks: false, denyPatterns: [] },
                maxStringLength: 100,
                allowNullBytes: false,
                allowControlChars: false,
            });

            // Normal string should pass
            expect(validator.validateString('hello world').valid).toBe(true);

            // String with null byte should fail
            expect(validator.validateString('hello\x00world').valid).toBe(false);

            // String exceeding max length should fail
            expect(validator.validateString('a'.repeat(101)).valid).toBe(false);
        });

        it('should validate numeric inputs', () => {
            const validator = new CLIValidator({
                enabled: true,
                paths: { enabled: true, basePaths: [], allowAbsolute: false, allowSymlinks: false, denyPatterns: [] },
                maxStringLength: 10000,
                allowNullBytes: false,
                allowControlChars: false,
            });

            // Normal number should pass
            expect(validator.validateNumber(42).valid).toBe(true);

            // NaN should fail
            expect(validator.validateNumber(NaN).valid).toBe(false);

            // Infinity should fail
            expect(validator.validateNumber(Infinity).valid).toBe(false);
        });
    });

    describe('Security Configuration Integration', () => {
        it('should apply global PathGuard configuration', () => {
            configurePathGuard({
                enabled: true,
                basePaths: ['/allowed/path'],
                allowAbsolute: false,
            });

            const guard = new PathGuard({
                enabled: true,
                basePaths: ['/allowed/path'],
            });

            // Path within allowed should pass
            const validResult = guard.validate('subdir/file.txt');
            expect(validResult.valid).toBe(true);

            // Path traversal should fail
            const invalidResult = guard.validate('../etc/passwd');
            expect(invalidResult.valid).toBe(false);
        });
    });
});

