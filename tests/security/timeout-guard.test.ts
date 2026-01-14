/**
 * Tests for TimeoutGuard - Request Timeout Protection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    TimeoutGuard,
    TimeoutError,
    isTimeoutError,
    getTimeoutGuard,
    configureTimeoutGuard,
    resetTimeoutGuard,
} from '../../src/security/timeout-guard';
import { resetAuditLogger, SecurityAuditLogger } from '../../src/security/audit-logger';

describe('TimeoutGuard', () => {
    let guard: TimeoutGuard;
    let mockAuditLogger: SecurityAuditLogger;

    beforeEach(() => {
        resetAuditLogger();
        resetTimeoutGuard();
        mockAuditLogger = new SecurityAuditLogger({
            enabled: true,
            logLevel: 'warning',
        });
        vi.spyOn(mockAuditLogger, 'requestTimeout');
        guard = new TimeoutGuard({}, mockAuditLogger);
    });

    afterEach(() => {
        resetTimeoutGuard();
    });

    describe('withTimeout', () => {
        it('should allow fast operations to complete', async () => {
            const fastPromise = Promise.resolve('done');
            const result = await guard.withTimeout(fastPromise, 1000, 'test');
            expect(result).toBe('done');
        });

        it('should timeout slow operations', async () => {
            const slowPromise = new Promise(resolve => setTimeout(resolve, 5000));

            await expect(guard.withTimeout(slowPromise, 50, 'test'))
                .rejects.toThrow(TimeoutError);
        });

        it('should include operation name in error', async () => {
            const slowPromise = new Promise(resolve => setTimeout(resolve, 5000));

            try {
                await guard.withTimeout(slowPromise, 50, 'my-operation');
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(TimeoutError);
                expect((error as TimeoutError).operation).toBe('my-operation');
                expect((error as TimeoutError).message).toContain('my-operation');
            }
        });

        it('should include timeout duration in error', async () => {
            const slowPromise = new Promise(resolve => setTimeout(resolve, 5000));

            try {
                await guard.withTimeout(slowPromise, 50, 'test');
                expect.fail('Should have thrown');
            } catch (error) {
                expect((error as TimeoutError).timeoutMs).toBe(50);
                expect((error as TimeoutError).message).toContain('50ms');
            }
        });

        it('should log timeout events', async () => {
            const slowPromise = new Promise(resolve => setTimeout(resolve, 5000));

            try {
                await guard.withTimeout(slowPromise, 50, 'test');
            } catch {
                // Expected
            }

            expect(mockAuditLogger.requestTimeout).toHaveBeenCalledWith('test', 50);
        });

        it('should propagate errors from the promise', async () => {
            const errorPromise = Promise.reject(new Error('Original error'));

            await expect(guard.withTimeout(errorPromise, 1000, 'test'))
                .rejects.toThrow('Original error');
        });

        it('should pass through when disabled', async () => {
            const disabledGuard = new TimeoutGuard({ enabled: false }, mockAuditLogger);
            const slowPromise = new Promise(resolve => setTimeout(() => resolve('done'), 100));

            const result = await disabledGuard.withTimeout(slowPromise, 10, 'test');
            expect(result).toBe('done');
        });

        it('should pass through with zero timeout', async () => {
            const slowPromise = new Promise(resolve => setTimeout(() => resolve('done'), 100));

            const result = await guard.withTimeout(slowPromise, 0, 'test');
            expect(result).toBe('done');
        });
    });

    describe('withLLMTimeout', () => {
        it('should use LLM timeout configuration', async () => {
            const customGuard = new TimeoutGuard({ llmTimeout: 50 }, mockAuditLogger);
            const slowPromise = new Promise(resolve => setTimeout(resolve, 5000));

            await expect(customGuard.withLLMTimeout(slowPromise, 'llm-test'))
                .rejects.toThrow(TimeoutError);
        });

        it('should allow fast LLM calls', async () => {
            const fastPromise = Promise.resolve({ content: 'response' });
            const result = await guard.withLLMTimeout(fastPromise, 'llm-test');
            expect(result).toEqual({ content: 'response' });
        });
    });

    describe('withToolTimeout', () => {
        it('should use tool timeout configuration', async () => {
            const customGuard = new TimeoutGuard({ toolTimeout: 50 }, mockAuditLogger);
            const slowPromise = new Promise(resolve => setTimeout(resolve, 5000));

            await expect(customGuard.withToolTimeout(slowPromise, 'my-tool'))
                .rejects.toThrow(TimeoutError);
        });

        it('should include tool name in operation', async () => {
            const customGuard = new TimeoutGuard({ toolTimeout: 50 }, mockAuditLogger);
            const slowPromise = new Promise(resolve => setTimeout(resolve, 5000));

            try {
                await customGuard.withToolTimeout(slowPromise, 'my-tool');
            } catch (error) {
                expect((error as TimeoutError).operation).toBe('tool:my-tool');
            }
        });
    });

    describe('withFileTimeout', () => {
        it('should use file timeout configuration', async () => {
            const customGuard = new TimeoutGuard({ fileTimeout: 50 }, mockAuditLogger);
            const slowPromise = new Promise(resolve => setTimeout(resolve, 5000));

            await expect(customGuard.withFileTimeout(slowPromise, 'read-file'))
                .rejects.toThrow(TimeoutError);
        });
    });

    describe('createAbortController', () => {
        it('should create an AbortController', () => {
            const { controller, cleanup } = guard.createAbortController(1000, 'test');
            expect(controller).toBeInstanceOf(AbortController);
            expect(controller.signal.aborted).toBe(false);
            cleanup();
        });

        it('should abort after timeout', async () => {
            const { controller, cleanup } = guard.createAbortController(50, 'test');

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(controller.signal.aborted).toBe(true);
            cleanup();
        });

        it('should cleanup prevent abort', async () => {
            const { controller, cleanup } = guard.createAbortController(100, 'test');
            cleanup();

            await new Promise(resolve => setTimeout(resolve, 150));

            expect(controller.signal.aborted).toBe(false);
        });
    });

    describe('getTimeout', () => {
        it('should return correct timeout for each type', () => {
            const customGuard = new TimeoutGuard({
                defaultTimeout: 1000,
                llmTimeout: 2000,
                toolTimeout: 3000,
                fileTimeout: 4000,
            });

            expect(customGuard.getTimeout('default')).toBe(1000);
            expect(customGuard.getTimeout('llm')).toBe(2000);
            expect(customGuard.getTimeout('tool')).toBe(3000);
            expect(customGuard.getTimeout('file')).toBe(4000);
        });
    });

    describe('Enable/Disable', () => {
        it('should report enabled status', () => {
            expect(guard.isEnabled()).toBe(true);
        });

        it('should allow toggling enabled status', () => {
            guard.setEnabled(false);
            expect(guard.isEnabled()).toBe(false);
        });

        it('should get configuration', () => {
            const config = guard.getConfig();
            expect(config.enabled).toBe(true);
            expect(config.defaultTimeout).toBeDefined();
        });
    });

    describe('Global Instance', () => {
        it('should provide global instance', () => {
            const g1 = getTimeoutGuard();
            const g2 = getTimeoutGuard();
            expect(g1).toBe(g2);
        });

        it('should allow configuration', () => {
            configureTimeoutGuard({ llmTimeout: 5000 });
            const g = getTimeoutGuard();
            expect(g.getTimeout('llm')).toBe(5000);
        });

        it('should reset properly', () => {
            configureTimeoutGuard({ llmTimeout: 5000 });
            resetTimeoutGuard();
            const g = getTimeoutGuard();
            expect(g.getTimeout('llm')).toBe(120000); // Default
        });
    });
});

describe('TimeoutError', () => {
    it('should have isTimeout property', () => {
        const error = new TimeoutError('test', 'op', 100);
        expect(error.isTimeout).toBe(true);
    });

    it('should have operation property', () => {
        const error = new TimeoutError('test', 'my-op', 100);
        expect(error.operation).toBe('my-op');
    });

    it('should have timeoutMs property', () => {
        const error = new TimeoutError('test', 'op', 500);
        expect(error.timeoutMs).toBe(500);
    });

    it('should have correct name', () => {
        const error = new TimeoutError('test');
        expect(error.name).toBe('TimeoutError');
    });
});

describe('isTimeoutError', () => {
    it('should return true for TimeoutError instances', () => {
        const error = new TimeoutError('test');
        expect(isTimeoutError(error)).toBe(true);
    });

    it('should return true for objects with isTimeout property', () => {
        const error = { isTimeout: true, message: 'test' };
        expect(isTimeoutError(error)).toBe(true);
    });

    it('should return false for regular errors', () => {
        const error = new Error('test');
        expect(isTimeoutError(error)).toBe(false);
    });

    it('should return false for null', () => {
        expect(isTimeoutError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
        expect(isTimeoutError(undefined)).toBe(false);
    });
});

