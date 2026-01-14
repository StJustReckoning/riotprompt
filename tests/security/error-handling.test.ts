/**
 * Tests for error handling integration with @theunwalked/spotclean
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    initializeErrorHandling,
    sanitize,
    createSafeError,
    formatErrorForDisplay,
    configureErrorSanitizer,
} from '../../src/error-handling';

describe('Error Handling', () => {
    beforeEach(() => {
        // Configure for production-like behavior in tests
        configureErrorSanitizer({
            enabled: true,
            environment: 'production',
            includeCorrelationId: true,
            sanitizeStackTraces: true,
            maxMessageLength: 500,
        });
    });

    describe('sanitize', () => {
        it('should sanitize errors and return external/internal details', () => {
            const error = new Error('Something went wrong');
            const result = sanitize(error);

            expect(result.external).toBeDefined();
            expect(result.internal).toBeDefined();
            expect(result.internal.correlationId).toBeDefined();
            expect(result.internal.originalMessage).toBe('Something went wrong');
        });

        it('should not leak secrets in error messages', () => {
            const error = new Error('Failed to connect with key sk-1234567890abcdefghij');
            const result = sanitize(error);

            expect(result.external.message).not.toContain('sk-1234567890abcdefghij');
        });

        it('should not leak file paths in production errors', () => {
            const error = new Error('Failed to read /home/deploy/app/config/secrets.yaml');
            const result = sanitize(error);

            // In production, paths should be sanitized
            expect(result.external.message).not.toContain('/home/deploy');
        });

        it('should preserve correlation ID for debugging', () => {
            const error = new Error('Something went wrong');
            const result = sanitize(error);

            expect(result.external.correlationId).toBeDefined();
            expect(result.internal.correlationId).toBe(result.external.correlationId);
        });

        it('should handle non-Error objects', () => {
            const result = sanitize('string error' as unknown);

            expect(result.external).toBeDefined();
            expect(result.internal.originalMessage).toBe('string error');
        });

        it('should include context in internal details', () => {
            const error = new Error('Test error');
            const result = sanitize(error, { operation: 'test', userId: 123 });

            expect(result.internal.context).toEqual({ operation: 'test', userId: 123 });
        });
    });

    describe('createSafeError', () => {
        it('should create a new Error with sanitized message', () => {
            const originalError = new Error('Sensitive: sk-abcdefghijklmnopqrst');
            const safeError = createSafeError(originalError);

            expect(safeError).toBeInstanceOf(Error);
            expect(safeError.message).not.toContain('sk-abcdefghijklmnopqrst');
        });

        it('should include correlation ID on the error', () => {
            const originalError = new Error('Test error');
            const safeError = createSafeError(originalError);

            expect(safeError.correlationId).toBeDefined();
        });

        it('should handle non-Error objects', () => {
            const safeError = createSafeError('string error' as unknown);

            expect(safeError).toBeInstanceOf(Error);
        });
    });

    describe('formatErrorForDisplay', () => {
        it('should format error with correlation ID', () => {
            const error = new Error('Test error');
            const formatted = formatErrorForDisplay(error);

            expect(formatted).toContain('Reference:');
        });

        it('should not leak sensitive information', () => {
            const error = new Error('API key sk-secret123456789012345 is invalid');
            const formatted = formatErrorForDisplay(error);

            expect(formatted).not.toContain('sk-secret123456789012345');
        });
    });

    describe('initializeErrorHandling', () => {
        it('should configure error handling with defaults', () => {
            // Should not throw
            expect(() => initializeErrorHandling()).not.toThrow();
        });

        it('should accept custom base paths', () => {
            expect(() => initializeErrorHandling({
                basePaths: ['/custom/path'],
                environment: 'development',
            })).not.toThrow();
        });
    });

    describe('development mode', () => {
        beforeEach(() => {
            configureErrorSanitizer({
                enabled: true,
                environment: 'development',
                includeCorrelationId: true,
                sanitizeStackTraces: false,
                maxMessageLength: 500,
            });
        });

        it('should show more details in development', () => {
            const error = new Error('Detailed error message');
            const result = sanitize(error);

            // Development shows more details
            expect(result.external.message).toContain('Detailed error message');
        });
    });

    describe('API key patterns', () => {
        beforeEach(() => {
            initializeErrorHandling({ environment: 'production' });
        });

        it('should redact OpenAI API keys', () => {
            const error = new Error('Error with key sk-abcdefghijklmnopqrstuvwxyz');
            const result = sanitize(error);

            expect(result.external.message).not.toContain('sk-abcdefghijklmnopqrstuvwxyz');
        });

        it('should redact OpenAI project keys', () => {
            const error = new Error('Error with key sk-proj-abc123_def456-ghi789');
            const result = sanitize(error);

            expect(result.external.message).not.toContain('sk-proj-abc123_def456-ghi789');
        });

        it('should redact Anthropic API keys', () => {
            const error = new Error('Error with key sk-ant-abc123-def456');
            const result = sanitize(error);

            expect(result.external.message).not.toContain('sk-ant-abc123-def456');
        });

        it('should redact Gemini API keys', () => {
            const error = new Error('Error with key AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456');
            const result = sanitize(error);

            expect(result.external.message).not.toContain('AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456');
        });
    });

    describe('connection string patterns', () => {
        beforeEach(() => {
            initializeErrorHandling({ environment: 'production' });
        });

        it('should redact database connection strings', () => {
            const error = new Error('Failed to connect to postgres://admin:secret@db.local:5432');
            const result = sanitize(error);

            expect(result.external.message).not.toContain('secret');
            expect(result.external.message).not.toContain('postgres://');
        });
    });
});

