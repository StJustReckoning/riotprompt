/**
 * Tests for rate limiter implementations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    NoOpRateLimiter,
    MemoryRateLimiter,
    createRateLimiter,
    createNoOpRateLimiter,
    getRateLimiter,
    configureRateLimiter,
    resetRateLimiter,
} from '../../src/security/rate-limiter';

describe('NoOpRateLimiter', () => {
    it('should always allow requests', async () => {
        const limiter = new NoOpRateLimiter();
        
        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(true);
    });

    it('should return max safe integer for remaining', async () => {
        const limiter = new NoOpRateLimiter();
        
        expect(await limiter.remaining('user1')).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle reset without error', async () => {
        const limiter = new NoOpRateLimiter();
        
        await expect(limiter.reset('user1')).resolves.toBeUndefined();
    });
});

describe('MemoryRateLimiter', () => {
    let limiter: MemoryRateLimiter;

    afterEach(() => {
        if (limiter) {
            limiter.destroy();
        }
    });

    it('should allow requests within limit', async () => {
        limiter = new MemoryRateLimiter({
            windowMs: 60000,
            maxRequests: 3,
        });

        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(true);
    });

    it('should block requests exceeding limit', async () => {
        limiter = new MemoryRateLimiter({
            windowMs: 60000,
            maxRequests: 2,
        });

        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(false);
    });

    it('should track different keys separately', async () => {
        limiter = new MemoryRateLimiter({
            windowMs: 60000,
            maxRequests: 1,
        });

        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user2')).toBe(true);
        expect(await limiter.check('user1')).toBe(false);
        expect(await limiter.check('user2')).toBe(false);
    });

    it('should return correct remaining count', async () => {
        limiter = new MemoryRateLimiter({
            windowMs: 60000,
            maxRequests: 3,
        });

        expect(await limiter.remaining('user1')).toBe(3);
        await limiter.check('user1');
        expect(await limiter.remaining('user1')).toBe(2);
        await limiter.check('user1');
        expect(await limiter.remaining('user1')).toBe(1);
        await limiter.check('user1');
        expect(await limiter.remaining('user1')).toBe(0);
    });

    it('should reset rate limit for a key', async () => {
        limiter = new MemoryRateLimiter({
            windowMs: 60000,
            maxRequests: 1,
        });

        await limiter.check('user1');
        expect(await limiter.check('user1')).toBe(false);
        
        await limiter.reset('user1');
        expect(await limiter.check('user1')).toBe(true);
    });

    it('should reset window after expiration', async () => {
        vi.useFakeTimers();
        
        limiter = new MemoryRateLimiter({
            windowMs: 1000,
            maxRequests: 1,
        });

        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(false);

        // Advance time past the window
        vi.advanceTimersByTime(1001);

        expect(await limiter.check('user1')).toBe(true);
        
        vi.useRealTimers();
    });

    it('should clean up expired entries', async () => {
        vi.useFakeTimers();
        
        limiter = new MemoryRateLimiter({
            windowMs: 1000,
            maxRequests: 1,
        });

        await limiter.check('user1');
        await limiter.check('user2');

        // Advance time past the window to trigger cleanup
        vi.advanceTimersByTime(1001);

        // Both should be allowed again after cleanup
        expect(await limiter.remaining('user1')).toBe(1);
        expect(await limiter.remaining('user2')).toBe(1);
        
        vi.useRealTimers();
    });
});

describe('Global Rate Limiter', () => {
    afterEach(() => {
        resetRateLimiter();
    });

    it('should return no-op limiter by default', async () => {
        const limiter = getRateLimiter();
        
        // Should always allow
        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(true);
    });

    it('should configure global limiter', async () => {
        configureRateLimiter({
            windowMs: 60000,
            maxRequests: 1,
        });

        const limiter = getRateLimiter();
        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(false);
    });

    it('should reset to no-op limiter', async () => {
        configureRateLimiter({
            windowMs: 60000,
            maxRequests: 1,
        });

        resetRateLimiter();

        const limiter = getRateLimiter();
        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(true);
    });
});

describe('Factory Functions', () => {
    it('should create memory rate limiter', async () => {
        const limiter = createRateLimiter({
            windowMs: 60000,
            maxRequests: 2,
        });

        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(false);

        // Clean up
        if (limiter instanceof MemoryRateLimiter) {
            limiter.destroy();
        }
    });

    it('should create no-op rate limiter', async () => {
        const limiter = createNoOpRateLimiter();

        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(true);
        expect(await limiter.check('user1')).toBe(true);
    });
});

