import { SecurityEvent, SecurityEventType } from '../../../src/security/events';

/**
 * Capture security events during test execution
 */
export class SecurityEventCapture {
    private events: SecurityEvent[] = [];

    capture(event: SecurityEvent): void {
        this.events.push(event);
    }

    getEvents(): SecurityEvent[] {
        return [...this.events];
    }

    getEventsByType(type: SecurityEventType): SecurityEvent[] {
        return this.events.filter(e => e.type === type);
    }

    getEventsBySeverity(severity: SecurityEvent['severity']): SecurityEvent[] {
        return this.events.filter(e => e.severity === severity);
    }

    clear(): void {
        this.events = [];
    }

    expectEventOfType(type: SecurityEventType): void {
        const found = this.events.some(e => e.type === type);
        if (!found) {
            throw new Error(`Expected security event of type "${type}" but none was captured`);
        }
    }

    expectNoEvents(): void {
        if (this.events.length > 0) {
            const types = this.events.map(e => e.type).join(', ');
            throw new Error(`Expected no security events but captured ${this.events.length}: ${types}`);
        }
    }

    expectEventCount(count: number): void {
        if (this.events.length !== count) {
            throw new Error(`Expected ${count} security events but captured ${this.events.length}`);
        }
    }

    hasEventOfType(type: SecurityEventType): boolean {
        return this.events.some(e => e.type === type);
    }
}

/**
 * Run with timeout to catch infinite loops (ReDoS, etc.)
 */
export async function runWithSecurityTimeout<T>(
    fn: () => T | Promise<T>,
    timeoutMs: number = 1000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Security timeout: operation exceeded ${timeoutMs}ms`));
        }, timeoutMs);

        Promise.resolve(fn())
            .then(result => {
                clearTimeout(timeout);
                resolve(result);
            })
            .catch(error => {
                clearTimeout(timeout);
                reject(error);
            });
    });
}

/**
 * Assert that a function throws a security-related error
 */
export async function expectSecurityError(
    fn: () => unknown | Promise<unknown>,
    expectedMessage?: string | RegExp
): Promise<void> {
    let threw = false;
    let error: Error | null = null;

    try {
        await fn();
    } catch (e) {
        threw = true;
        error = e as Error;
    }

    if (!threw) {
        throw new Error('Expected function to throw a security error');
    }

    if (expectedMessage) {
        if (typeof expectedMessage === 'string') {
            if (!error?.message.includes(expectedMessage)) {
                throw new Error(`Expected error message to include "${expectedMessage}" but got "${error?.message}"`);
            }
        } else {
            if (!expectedMessage.test(error?.message || '')) {
                throw new Error(`Expected error message to match ${expectedMessage} but got "${error?.message}"`);
            }
        }
    }
}

/**
 * Assert that a function does NOT throw
 */
export async function expectNoSecurityError(
    fn: () => unknown | Promise<unknown>
): Promise<void> {
    try {
        await fn();
    } catch (e) {
        const error = e as Error;
        throw new Error(`Expected function not to throw but got: ${error.message}`);
    }
}

/**
 * Measure execution time for performance testing
 */
export function measureExecutionTime<T>(fn: () => T): { result: T; durationMs: number } {
    const start = performance.now();
    const result = fn();
    const durationMs = performance.now() - start;
    return { result, durationMs };
}

/**
 * Measure async execution time
 */
export async function measureAsyncExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    const result = await fn();
    const durationMs = performance.now() - start;
    return { result, durationMs };
}

/**
 * Assert execution time is under a threshold
 */
export function assertExecutionTime<T>(
    fn: () => T,
    maxMs: number,
    description?: string
): T {
    const { result, durationMs } = measureExecutionTime(fn);
    if (durationMs > maxMs) {
        throw new Error(
            `${description || 'Operation'} took ${durationMs.toFixed(2)}ms, exceeding limit of ${maxMs}ms`
        );
    }
    return result;
}

/**
 * Create a mock security event
 */
export function createMockSecurityEvent(
    type: SecurityEventType,
    overrides?: Partial<SecurityEvent>
): SecurityEvent {
    return {
        type,
        timestamp: new Date(),
        severity: 'warning',
        message: `Mock event: ${type}`,
        ...overrides,
    };
}

/**
 * Test that a value does not contain sensitive data
 */
export function assertNoSensitiveData(
    value: string,
    patterns: RegExp[] = [
        /sk-[a-zA-Z0-9]{48,}/g,           // OpenAI keys
        /AKIA[0-9A-Z]{16}/g,              // AWS keys
        /Bearer\s+[a-zA-Z0-9._-]+/gi,     // Bearer tokens
        /password[\s:="']+[^\s"']+/gi,    // Passwords
    ]
): void {
    for (const pattern of patterns) {
        if (pattern.test(value)) {
            throw new Error(`Value contains sensitive data matching pattern: ${pattern}`);
        }
    }
}

/**
 * Batch test multiple attack vectors
 */
export async function testAttackVectors<T>(
    vectors: string[],
    testFn: (vector: string) => T | Promise<T>,
    expectError: boolean = true
): Promise<{ passed: string[]; failed: string[] }> {
    const passed: string[] = [];
    const failed: string[] = [];

    for (const vector of vectors) {
        try {
            await testFn(vector);
            if (expectError) {
                failed.push(vector);
            } else {
                passed.push(vector);
            }
        } catch {
            if (expectError) {
                passed.push(vector);
            } else {
                failed.push(vector);
            }
        }
    }

    return { passed, failed };
}

