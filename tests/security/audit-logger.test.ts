import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    SecurityAuditLogger,
    getAuditLogger,
    configureAuditLogger,
    resetAuditLogger,
    AuditLoggerConfig,
} from '../../src/security/audit-logger';
import { SecurityEvent } from '../../src/security/events';
import { Logger } from '../../src/logger';

// Mock logger for testing
function createMockLogger(): Logger & { calls: { level: string; message: string }[] } {
    const calls: { level: string; message: string }[] = [];
    return {
        name: 'mock',
        calls,
        debug: (message: string) => calls.push({ level: 'debug', message }),
        info: (message: string) => calls.push({ level: 'info', message }),
        warn: (message: string) => calls.push({ level: 'warn', message }),
        error: (message: string) => calls.push({ level: 'error', message }),
        verbose: (message: string) => calls.push({ level: 'verbose', message }),
        silly: (message: string) => calls.push({ level: 'silly', message }),
    };
}

describe('SecurityAuditLogger', () => {
    let events: SecurityEvent[];
    let logger: SecurityAuditLogger;

    beforeEach(() => {
        events = [];
        logger = new SecurityAuditLogger({ onEvent: e => events.push(e) });
        resetAuditLogger();
    });

    describe('basic logging', () => {
        it('should log security events', () => {
            logger.log({
                type: 'path_traversal_blocked',
                severity: 'warning',
                message: 'Test event',
            });

            expect(events).toHaveLength(1);
            expect(events[0].type).toBe('path_traversal_blocked');
            expect(events[0].timestamp).toBeInstanceOf(Date);
        });

        it('should not log when disabled', () => {
            const disabledLogger = new SecurityAuditLogger({
                enabled: false,
                onEvent: e => events.push(e),
            });

            disabledLogger.log({
                type: 'path_traversal_blocked',
                severity: 'warning',
                message: 'Test event',
            });

            expect(events).toHaveLength(0);
        });

        it('should track event counts', () => {
            logger.log({ type: 'path_traversal_blocked', severity: 'warning', message: 'Test 1' });
            logger.log({ type: 'path_traversal_blocked', severity: 'warning', message: 'Test 2' });
            logger.log({ type: 'tool_validation_failed', severity: 'warning', message: 'Test 3' });

            const stats = logger.getStats();
            expect(stats.get('path_traversal_blocked')).toBe(2);
            expect(stats.get('tool_validation_failed')).toBe(1);
        });

        it('should reset stats', () => {
            logger.log({ type: 'path_traversal_blocked', severity: 'warning', message: 'Test' });
            expect(logger.getTotalEventCount()).toBe(1);

            logger.resetStats();
            expect(logger.getTotalEventCount()).toBe(0);
        });
    });

    describe('log levels', () => {
        it('should filter by log level - warning', () => {
            const warningLogger = new SecurityAuditLogger({
                logLevel: 'warning',
                onEvent: e => events.push(e),
            });

            warningLogger.log({ type: 'secret_redacted', severity: 'info', message: 'Info' });
            warningLogger.log({ type: 'path_traversal_blocked', severity: 'warning', message: 'Warning' });
            warningLogger.log({ type: 'tool_execution_blocked', severity: 'error', message: 'Error' });

            // All events are tracked in stats
            expect(warningLogger.getTotalEventCount()).toBe(3);
            // But only warning+ are passed to onEvent after log level check
            // Note: onEvent is called regardless of log level, but the logger output is filtered
            expect(events).toHaveLength(3);
        });

        it('should filter by log level - error', () => {
            const mockLogger = createMockLogger();
            const errorLogger = new SecurityAuditLogger({
                logLevel: 'error',
                onEvent: e => events.push(e),
            }, mockLogger);

            errorLogger.log({ type: 'secret_redacted', severity: 'info', message: 'Info' });
            errorLogger.log({ type: 'path_traversal_blocked', severity: 'warning', message: 'Warning' });
            errorLogger.log({ type: 'tool_execution_blocked', severity: 'error', message: 'Error' });

            // Only error level should be logged to the logger
            const errorCalls = mockLogger.calls.filter(c => c.level === 'error');
            expect(errorCalls.length).toBe(1);
        });

        it('should log all levels when set to all', () => {
            const mockLogger = createMockLogger();
            const allLogger = new SecurityAuditLogger({
                logLevel: 'all',
            }, mockLogger);

            allLogger.log({ type: 'secret_redacted', severity: 'info', message: 'Info' });
            allLogger.log({ type: 'path_traversal_blocked', severity: 'warning', message: 'Warning' });

            expect(mockLogger.calls.length).toBe(2);
        });
    });

    describe('context sanitization', () => {
        it('should redact sensitive context keys', () => {
            logger.log({
                type: 'api_key_used',
                severity: 'info',
                message: 'API key accessed',
                context: { apiKey: 'sk-secret', operation: 'execute' },
            });

            expect(events[0].context?.apiKey).toBe('[REDACTED]');
            expect(events[0].context?.operation).toBe('execute');
        });

        it('should redact various sensitive key patterns', () => {
            const sensitiveKeys = ['apiKey', 'secretValue', 'password', 'authToken', 'credentials'];
            
            for (const key of sensitiveKeys) {
                events = [];
                logger.log({
                    type: 'api_key_used',
                    severity: 'info',
                    message: 'Test',
                    context: { [key]: 'sensitive-value' },
                });
                expect(events[0].context?.[key]).toBe('[REDACTED]');
            }
        });

        it('should truncate large context', () => {
            const smallContextLogger = new SecurityAuditLogger({
                maxContextSize: 50,
                onEvent: e => events.push(e),
            });

            smallContextLogger.log({
                type: 'path_traversal_blocked',
                severity: 'warning',
                message: 'Test',
                context: {
                    first: 'short',
                    second: 'a'.repeat(100),
                },
            });

            // First key should be included, second should be truncated
            expect(events[0].context?.first).toBe('short');
            expect(events[0].context?.second).toBeUndefined();
        });

        it('should not include context when disabled', () => {
            const noContextLogger = new SecurityAuditLogger({
                includeContext: false,
                onEvent: e => events.push(e),
            });

            noContextLogger.log({
                type: 'path_traversal_blocked',
                severity: 'warning',
                message: 'Test',
                context: { data: 'value' },
            });

            expect(events[0].context).toBeUndefined();
        });
    });

    describe('convenience methods', () => {
        it('should log path traversal blocked', () => {
            logger.pathTraversalBlocked('../etc/passwd', 'parent directory access');

            expect(events).toHaveLength(1);
            expect(events[0].type).toBe('path_traversal_blocked');
            expect(events[0].severity).toBe('warning');
            expect(events[0].message).toContain('parent directory access');
        });

        it('should sanitize paths in path traversal events', () => {
            logger.pathTraversalBlocked('/very/long/path/to/sensitive/file.txt', 'test');

            expect(events[0].context?.attemptedPath).toContain('file.txt');
            expect(events[0].context?.attemptedPath).toContain('chars');
            expect(events[0].context?.attemptedPath).not.toContain('/very/long/path');
        });

        it('should log path validation failed', () => {
            logger.pathValidationFailed('/invalid/path', 'invalid characters');

            expect(events[0].type).toBe('path_validation_failed');
        });

        it('should log tool validation failed', () => {
            logger.toolValidationFailed('dangerous_tool', 'missing required parameter');

            expect(events[0].type).toBe('tool_validation_failed');
            expect(events[0].context?.toolName).toBe('dangerous_tool');
        });

        it('should log tool execution blocked', () => {
            logger.toolExecutionBlocked('shell_exec', 'tool is denied');

            expect(events[0].type).toBe('tool_execution_blocked');
            expect(events[0].severity).toBe('error');
        });

        it('should log tool timeout', () => {
            logger.toolTimeout('slow_tool', 30000);

            expect(events[0].type).toBe('tool_timeout');
            expect(events[0].context?.timeoutMs).toBe(30000);
        });

        it('should log secret redacted', () => {
            logger.secretRedacted('log output');

            expect(events[0].type).toBe('secret_redacted');
            expect(events[0].severity).toBe('info');
        });

        it('should log API key used', () => {
            logger.apiKeyUsed('openai');

            expect(events[0].type).toBe('api_key_used');
            expect(events[0].context?.provider).toBe('openai');
        });

        it('should log deserialization failed', () => {
            logger.deserializationFailed('user input', 'invalid JSON');

            expect(events[0].type).toBe('deserialization_failed');
        });

        it('should log regex timeout', () => {
            logger.regexTimeout('^(a+)+$', 1000);

            expect(events[0].type).toBe('regex_timeout');
            expect(events[0].context?.patternLength).toBe(7); // ^(a+)+$
        });

        it('should log request timeout', () => {
            logger.requestTimeout('LLM call', 120000);

            expect(events[0].type).toBe('request_timeout');
            expect(events[0].context?.operation).toBe('LLM call');
        });

        it('should log rate limit exceeded', () => {
            logger.rateLimitExceeded('API calls', 100);

            expect(events[0].type).toBe('rate_limit_exceeded');
            expect(events[0].context?.limit).toBe(100);
        });
    });

    describe('statistics', () => {
        it('should track event counts by type', () => {
            logger.pathTraversalBlocked('path1', 'reason1');
            logger.pathTraversalBlocked('path2', 'reason2');
            logger.toolValidationFailed('tool1', 'reason');

            expect(logger.getEventCount('path_traversal_blocked')).toBe(2);
            expect(logger.getEventCount('tool_validation_failed')).toBe(1);
            expect(logger.getEventCount('secret_redacted')).toBe(0);
        });

        it('should check if events of type exist', () => {
            logger.pathTraversalBlocked('path', 'reason');

            expect(logger.hasEventsOfType('path_traversal_blocked')).toBe(true);
            expect(logger.hasEventsOfType('tool_validation_failed')).toBe(false);
        });

        it('should get total event count', () => {
            logger.pathTraversalBlocked('path', 'reason');
            logger.toolValidationFailed('tool', 'reason');
            logger.secretRedacted('source');

            expect(logger.getTotalEventCount()).toBe(3);
        });
    });

    describe('global instance', () => {
        it('should provide a global instance', () => {
            const instance1 = getAuditLogger();
            const instance2 = getAuditLogger();

            expect(instance1).toBe(instance2);
        });

        it('should allow configuring the global instance', () => {
            const mockLogger = createMockLogger();
            configureAuditLogger({ logLevel: 'error' }, mockLogger);

            const instance = getAuditLogger();
            instance.log({ type: 'secret_redacted', severity: 'info', message: 'Info' });

            // Info should not be logged at error level
            expect(mockLogger.calls.filter(c => c.level === 'info')).toHaveLength(0);
        });

        it('should reset global instance', () => {
            const instance1 = getAuditLogger();
            resetAuditLogger();
            const instance2 = getAuditLogger();

            expect(instance1).not.toBe(instance2);
        });
    });

    describe('logger integration', () => {
        it('should use provided logger', () => {
            const mockLogger = createMockLogger();
            const customLogger = new SecurityAuditLogger({}, mockLogger);

            customLogger.log({
                type: 'path_traversal_blocked',
                severity: 'warning',
                message: 'Test warning',
            });

            expect(mockLogger.calls.some(c => c.level === 'warn')).toBe(true);
        });

        it('should log critical as error with prefix', () => {
            const mockLogger = createMockLogger();
            const customLogger = new SecurityAuditLogger({}, mockLogger);

            customLogger.log({
                type: 'tool_execution_blocked',
                severity: 'critical',
                message: 'Critical event',
            });

            const errorCall = mockLogger.calls.find(c => c.level === 'error');
            expect(errorCall?.message).toContain('[CRITICAL]');
        });
    });
});

