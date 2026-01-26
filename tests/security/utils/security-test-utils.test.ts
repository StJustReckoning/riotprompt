import { describe, it, expect, beforeEach } from 'vitest';
import {
    SecurityEventCapture,
    runWithSecurityTimeout,
    expectSecurityError,
    expectNoSecurityError,
    measureExecutionTime,
    measureAsyncExecutionTime,
    assertExecutionTime,
    createMockSecurityEvent,
    assertNoSensitiveData,
    testAttackVectors,
} from './security-test-utils';
import { PATH_TRAVERSAL_VECTORS, REDOS_VECTORS, DOS_VECTORS } from '../fixtures/attack-vectors';

describe('SecurityEventCapture', () => {
    let capture: SecurityEventCapture;

    beforeEach(() => {
        capture = new SecurityEventCapture();
    });

    it('should capture security events', () => {
        capture.capture({
            type: 'path_traversal_blocked',
            timestamp: new Date(),
            severity: 'warning',
            message: 'test'
        });
        expect(capture.getEvents()).toHaveLength(1);
    });

    it('should filter events by type', () => {
        capture.capture(createMockSecurityEvent('path_traversal_blocked'));
        capture.capture(createMockSecurityEvent('tool_validation_failed'));
        capture.capture(createMockSecurityEvent('path_traversal_blocked'));

        const pathEvents = capture.getEventsByType('path_traversal_blocked');
        expect(pathEvents).toHaveLength(2);
    });

    it('should filter events by severity', () => {
        capture.capture(createMockSecurityEvent('path_traversal_blocked', { severity: 'warning' }));
        capture.capture(createMockSecurityEvent('tool_validation_failed', { severity: 'error' }));
        capture.capture(createMockSecurityEvent('secret_redacted', { severity: 'info' }));

        const warnings = capture.getEventsBySeverity('warning');
        expect(warnings).toHaveLength(1);
    });

    it('should clear events', () => {
        capture.capture(createMockSecurityEvent('path_traversal_blocked'));
        capture.clear();
        expect(capture.getEvents()).toHaveLength(0);
    });

    it('should validate event presence with expectEventOfType', () => {
        capture.capture(createMockSecurityEvent('path_traversal_blocked'));
        expect(() => capture.expectEventOfType('path_traversal_blocked')).not.toThrow();
    });

    it('should throw when expected event not found', () => {
        expect(() => capture.expectEventOfType('path_traversal_blocked')).toThrow(
            'Expected security event of type "path_traversal_blocked"'
        );
    });

    it('should validate no events with expectNoEvents', () => {
        expect(() => capture.expectNoEvents()).not.toThrow();
    });

    it('should throw when events exist but none expected', () => {
        capture.capture(createMockSecurityEvent('path_traversal_blocked'));
        expect(() => capture.expectNoEvents()).toThrow('Expected no security events');
    });

    it('should validate event count', () => {
        capture.capture(createMockSecurityEvent('path_traversal_blocked'));
        capture.capture(createMockSecurityEvent('tool_validation_failed'));
        expect(() => capture.expectEventCount(2)).not.toThrow();
        expect(() => capture.expectEventCount(1)).toThrow('Expected 1 security events but captured 2');
    });

    it('should check event presence with hasEventOfType', () => {
        capture.capture(createMockSecurityEvent('path_traversal_blocked'));
        expect(capture.hasEventOfType('path_traversal_blocked')).toBe(true);
        expect(capture.hasEventOfType('tool_validation_failed')).toBe(false);
    });
});

describe('runWithSecurityTimeout', () => {
    it('should resolve for fast operations', async () => {
        const result = await runWithSecurityTimeout(() => 'success', 1000);
        expect(result).toBe('success');
    });

    it('should resolve for fast async operations', async () => {
        const result = await runWithSecurityTimeout(async () => {
            await new Promise(r => setTimeout(r, 10));
            return 'async success';
        }, 1000);
        expect(result).toBe('async success');
    });

    it('should timeout on slow operations', async () => {
        await expect(
            runWithSecurityTimeout(() => new Promise(r => setTimeout(r, 5000)), 50)
        ).rejects.toThrow('Security timeout: operation exceeded 50ms');
    });

    it('should propagate errors from the function', async () => {
        await expect(
            runWithSecurityTimeout(() => {
                throw new Error('test error');
            }, 1000)
        ).rejects.toThrow('test error');
    });
});

describe('expectSecurityError', () => {
    it('should pass when function throws', async () => {
        await expectSecurityError(() => {
            throw new Error('security violation');
        });
    });

    it('should fail when function does not throw', async () => {
        await expect(
            expectSecurityError(() => 'no error')
        ).rejects.toThrow('Expected function to throw a security error');
    });

    it('should validate error message with string', async () => {
        await expectSecurityError(() => {
            throw new Error('path traversal detected');
        }, 'path traversal');
    });

    it('should fail when error message does not match string', async () => {
        await expect(
            expectSecurityError(() => {
                throw new Error('wrong error');
            }, 'path traversal')
        ).rejects.toThrow('Expected error message to include "path traversal"');
    });

    it('should validate error message with regex', async () => {
        await expectSecurityError(() => {
            throw new Error('Error code: SEC-001');
        }, /SEC-\d{3}/);
    });
});

describe('expectNoSecurityError', () => {
    it('should pass when function does not throw', async () => {
        await expectNoSecurityError(() => 'success');
    });

    it('should fail when function throws', async () => {
        await expect(
            expectNoSecurityError(() => {
                throw new Error('unexpected error');
            })
        ).rejects.toThrow('Expected function not to throw but got: unexpected error');
    });
});

describe('measureExecutionTime', () => {
    it('should measure execution time', () => {
        const { result, durationMs } = measureExecutionTime(() => {
            let sum = 0;
            for (let i = 0; i < 1000; i++) sum += i;
            return sum;
        });
        expect(result).toBe(499500);
        expect(durationMs).toBeGreaterThanOrEqual(0);
        expect(durationMs).toBeLessThan(100); // Should be fast
    });
});

describe('measureAsyncExecutionTime', () => {
    it('should measure async execution time', async () => {
        const { result, durationMs } = await measureAsyncExecutionTime(async () => {
            await new Promise(r => setTimeout(r, 10));
            return 'done';
        });
        expect(result).toBe('done');
        // Allow some timing variance - setTimeout is not exact
        expect(durationMs).toBeGreaterThanOrEqual(8);
    });
});

describe('assertExecutionTime', () => {
    it('should pass for fast operations', () => {
        const result = assertExecutionTime(() => 'fast', 100);
        expect(result).toBe('fast');
    });

    it('should fail for slow operations', () => {
        expect(() => {
            assertExecutionTime(() => {
                const start = Date.now();
                while (Date.now() - start < 50) { /* busy wait */ }
                return 'slow';
            }, 10, 'Slow operation');
        }).toThrow(/Slow operation took .* exceeding limit of 10ms/);
    });
});

describe('createMockSecurityEvent', () => {
    it('should create a mock event with defaults', () => {
        const event = createMockSecurityEvent('path_traversal_blocked');
        expect(event.type).toBe('path_traversal_blocked');
        expect(event.severity).toBe('warning');
        expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should allow overrides', () => {
        const event = createMockSecurityEvent('tool_validation_failed', {
            severity: 'critical',
            message: 'Custom message',
        });
        expect(event.severity).toBe('critical');
        expect(event.message).toBe('Custom message');
    });
});

describe('assertNoSensitiveData', () => {
    it('should pass for clean strings', () => {
        expect(() => assertNoSensitiveData('This is a clean string')).not.toThrow();
    });

    it('should detect OpenAI API keys', () => {
        expect(() => assertNoSensitiveData('key: sk-abcdefghijklmnopqrstuvwxyz123456789012345678901234'))
            .toThrow('contains sensitive data');
    });

    it('should detect AWS keys', () => {
        expect(() => assertNoSensitiveData('aws_key: AKIAIOSFODNN7EXAMPLE'))
            .toThrow('contains sensitive data');
    });

    it('should detect Bearer tokens', () => {
        expect(() => assertNoSensitiveData('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9'))
            .toThrow('contains sensitive data');
    });

    it('should detect passwords', () => {
        expect(() => assertNoSensitiveData('password: supersecret123'))
            .toThrow('contains sensitive data');
    });

    it('should accept custom patterns', () => {
        expect(() => assertNoSensitiveData('custom-secret-123', [/custom-secret-\d+/]))
            .toThrow('contains sensitive data');
    });
});

describe('testAttackVectors', () => {
    it('should test multiple vectors expecting errors', async () => {
        const { passed, failed } = await testAttackVectors(
            ['bad1', 'bad2', 'bad3'],
            (vector) => {
                throw new Error(`Blocked: ${vector}`);
            },
            true // expect errors
        );
        expect(passed).toHaveLength(3);
        expect(failed).toHaveLength(0);
    });

    it('should track failures when errors expected but not thrown', async () => {
        const { passed, failed } = await testAttackVectors(
            ['safe1', 'safe2'],
            () => 'allowed',
            true // expect errors
        );
        expect(passed).toHaveLength(0);
        expect(failed).toHaveLength(2);
    });

    it('should work with expectError=false', async () => {
        const { passed, failed } = await testAttackVectors(
            ['safe1', 'safe2'],
            () => 'allowed',
            false // expect success
        );
        expect(passed).toHaveLength(2);
        expect(failed).toHaveLength(0);
    });
});

describe('Attack Vector Fixtures', () => {
    it('should have path traversal vectors', () => {
        expect(PATH_TRAVERSAL_VECTORS.length).toBeGreaterThan(0);
        expect(PATH_TRAVERSAL_VECTORS).toContain('../etc/passwd');
    });

    it('should have ReDoS vectors', () => {
        expect(REDOS_VECTORS.length).toBeGreaterThan(0);
        expect(REDOS_VECTORS[0]).toHaveProperty('pattern');
        expect(REDOS_VECTORS[0]).toHaveProperty('input');
    });

    it('should have DoS vectors', () => {
        expect(DOS_VECTORS.largeString.length).toBe(1_000_000);
        expect(typeof DOS_VECTORS.deepNesting).toBe('string');
        expect(typeof DOS_VECTORS.wideObject).toBe('string');
    });
});

