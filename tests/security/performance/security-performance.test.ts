/**
 * Security Performance Tests
 * 
 * Measures the performance impact of security features.
 */

import { describe, it, expect } from 'vitest';
import { PathGuard } from '../../../src/security/path-guard';
import { CLIValidator } from '../../../src/security/cli-security';
import { TimeoutGuard } from '../../../src/security/timeout-guard';
import { sanitize, initializeErrorHandling } from '../../../src/error-handling';
import { maskSensitive } from '../../../src/logging-config';

describe('Security Performance Tests', () => {
    describe('Path Validation Performance', () => {
        it('should validate paths quickly', () => {
            const guard = new PathGuard({
                enabled: true,
                basePaths: ['/app/prompts'],
                allowAbsolute: false,
            });

            const iterations = 10000;
            const testPath = 'subdir/nested/file.txt';

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                guard.validate(testPath);
            }
            const duration = performance.now() - start;

            const avgMs = duration / iterations;
            // Should be very fast - less than 0.1ms per validation
            expect(avgMs).toBeLessThan(0.1);
            
            // Log for visibility
            console.log(`Path validation: ${avgMs.toFixed(4)}ms per operation`);
        });

        it('should handle complex paths efficiently', () => {
            const guard = new PathGuard({
                enabled: true,
                basePaths: ['/app/prompts', '/app/context', '/app/templates'],
                allowAbsolute: false,
                denyPatterns: ['\\.\\.',  '~', '\\$\\{', '\\$\\(', '\\.git', 'node_modules'],
            });

            const iterations = 5000;
            const complexPath = 'deeply/nested/directory/structure/with/many/levels/file.md';

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                guard.validate(complexPath);
            }
            const duration = performance.now() - start;

            const avgMs = duration / iterations;
            expect(avgMs).toBeLessThan(0.5);
            
            console.log(`Complex path validation: ${avgMs.toFixed(4)}ms per operation`);
        });
    });

    describe('String Validation Performance', () => {
        it('should validate strings quickly', () => {
            const validator = new CLIValidator({
                enabled: true,
                paths: { enabled: true, basePaths: [], allowAbsolute: false, allowSymlinks: false, denyPatterns: [] },
                strings: { enabled: true, maxLength: 10000, allowNullBytes: false, allowControlChars: false },
                numbers: { enabled: true, allowNaN: false, allowInfinity: false },
            });

            const iterations = 10000;
            const testString = 'This is a typical user input string for testing purposes.';

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                validator.validateString(testString);
            }
            const duration = performance.now() - start;

            const avgMs = duration / iterations;
            expect(avgMs).toBeLessThan(0.05);
            
            console.log(`String validation: ${avgMs.toFixed(4)}ms per operation`);
        });
    });

    describe('Secret Masking Performance', () => {
        it('should mask secrets quickly', () => {
            const iterations = 5000;
            const testContent = `
                This is a test message with an API key sk-1234567890abcdefghijklmnop
                and a password: secret123 and an email user@example.com
                and a Bearer token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
            `;

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                maskSensitive(testContent);
            }
            const duration = performance.now() - start;

            const avgMs = duration / iterations;
            // Masking is more expensive but should still be reasonable
            expect(avgMs).toBeLessThan(1);
            
            console.log(`Secret masking: ${avgMs.toFixed(4)}ms per operation`);
        });
    });

    describe('Error Sanitization Performance', () => {
        it('should sanitize errors quickly', () => {
            initializeErrorHandling({ environment: 'production' });

            const iterations = 5000;
            const testError = new Error('Failed with key sk-secret1234567890abcdefghij at /home/user/app/config.json');

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                sanitize(testError);
            }
            const duration = performance.now() - start;

            const avgMs = duration / iterations;
            expect(avgMs).toBeLessThan(0.5);
            
            console.log(`Error sanitization: ${avgMs.toFixed(4)}ms per operation`);
        });
    });

    describe('Timeout Guard Performance', () => {
        it('should have minimal overhead for fast operations', async () => {
            const guard = new TimeoutGuard({
                enabled: true,
                defaultTimeout: 30000,
                llmTimeout: 120000,
                toolTimeout: 30000,
                fileTimeout: 5000,
            });

            const iterations = 1000;
            const fastOperation = () => Promise.resolve('result');

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                await guard.withTimeout(fastOperation(), 30000, 'test');
            }
            const duration = performance.now() - start;

            const avgMs = duration / iterations;
            // Timeout wrapper should add minimal overhead
            expect(avgMs).toBeLessThan(1);
            
            console.log(`Timeout wrapper: ${avgMs.toFixed(4)}ms per operation`);
        });
    });

    describe('Combined Security Stack Performance', () => {
        it('should handle typical request with all security checks', () => {
            const pathGuard = new PathGuard({
                enabled: true,
                basePaths: ['/app'],
                allowAbsolute: false,
            });

            const validator = new CLIValidator({
                enabled: true,
                paths: { enabled: true, basePaths: ['/app'], allowAbsolute: false, allowSymlinks: false, denyPatterns: [] },
                strings: { enabled: true, maxLength: 10000, allowNullBytes: false, allowControlChars: false },
                numbers: { enabled: true, allowNaN: false, allowInfinity: false },
            });

            initializeErrorHandling({ environment: 'production' });

            const iterations = 1000;

            const start = performance.now();
            for (let i = 0; i < iterations; i++) {
                // Simulate a typical request with multiple security checks
                pathGuard.validate('prompts/user-prompt.md');
                validator.validateString('User input text');
                validator.validateNumber(42);
                maskSensitive('Log message with potential secrets');
            }
            const duration = performance.now() - start;

            const avgMs = duration / iterations;
            // Full security stack should still be fast
            expect(avgMs).toBeLessThan(2);
            
            console.log(`Full security stack: ${avgMs.toFixed(4)}ms per request`);
        });
    });

    describe('Memory Usage', () => {
        it('should not leak memory during repeated operations', () => {
            const guard = new PathGuard({
                enabled: true,
                basePaths: ['/app'],
                allowAbsolute: false,
            });

            // Warm up
            for (let i = 0; i < 100; i++) {
                guard.validate('test/path.txt');
            }

            // Force GC if available
            if (global.gc) {
                global.gc();
            }

            const initialMemory = process.memoryUsage().heapUsed;

            // Run many iterations
            for (let i = 0; i < 100000; i++) {
                guard.validate('test/path.txt');
            }

            // Force GC if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryGrowth = finalMemory - initialMemory;

            // Memory growth should be minimal (less than 10MB)
            // Note: This is a rough check; actual memory behavior depends on GC
            expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
            
            console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
        });
    });
});

