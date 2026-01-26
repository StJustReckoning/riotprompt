/**
 * Rate Limiter Interfaces
 * 
 * Provides interfaces and basic implementations for rate limiting.
 * Production applications should use dedicated rate limiting libraries
 * (e.g., rate-limiter-flexible, express-rate-limit) for distributed systems.
 * 
 * @packageDocumentation
 */

/**
 * Rate limiter interface
 * Implementation is left to users (use your preferred library)
 */
export interface RateLimiter {
    /**
     * Check if request is allowed
     * @param key - Unique identifier for the rate limit bucket (e.g., user ID, IP)
     * @returns true if allowed, false if rate limited
     */
    check(key: string): Promise<boolean>;

    /**
     * Get remaining requests in the current window
     * @param key - Unique identifier for the rate limit bucket
     * @returns Number of remaining requests
     */
    remaining(key: string): Promise<number>;

    /**
     * Reset rate limit for a key
     * @param key - Unique identifier for the rate limit bucket
     */
    reset(key: string): Promise<void>;
}

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
    /** Time window in milliseconds */
    windowMs: number;
    /** Maximum requests allowed in the window */
    maxRequests: number;
    /** Optional function to generate keys from context */
    keyGenerator?: (context: unknown) => string;
}

/**
 * No-op rate limiter that always allows requests
 * Use this as a default when rate limiting is not needed
 */
export class NoOpRateLimiter implements RateLimiter {
    async check(_key: string): Promise<boolean> {
        return true;
    }

    async remaining(_key: string): Promise<number> {
        return Number.MAX_SAFE_INTEGER;
    }

    async reset(_key: string): Promise<void> {
        // No-op
    }
}

interface RateLimitRecord {
    count: number;
    resetAt: number;
}

/**
 * Simple in-memory rate limiter
 * 
 * **Warning**: This implementation is NOT suitable for production use in
 * distributed systems. Use a Redis-backed solution for production.
 * 
 * @example
 * ```typescript
 * const limiter = new MemoryRateLimiter({
 *   windowMs: 60000,  // 1 minute
 *   maxRequests: 100, // 100 requests per minute
 * });
 * 
 * if (await limiter.check('user-123')) {
 *   // Process request
 * } else {
 *   // Rate limited
 * }
 * ```
 */
export class MemoryRateLimiter implements RateLimiter {
    private requests: Map<string, RateLimitRecord> = new Map();
    private config: RateLimiterConfig;
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor(config: RateLimiterConfig) {
        this.config = config;
        
        // Periodically clean up expired entries
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, config.windowMs);
    }

    async check(key: string): Promise<boolean> {
        const now = Date.now();
        const record = this.requests.get(key);

        // No record or expired - create new window
        if (!record || record.resetAt < now) {
            this.requests.set(key, { count: 1, resetAt: now + this.config.windowMs });
            return true;
        }

        // Check if limit exceeded
        if (record.count >= this.config.maxRequests) {
            return false;
        }

        // Increment count
        record.count++;
        return true;
    }

    async remaining(key: string): Promise<number> {
        const record = this.requests.get(key);
        if (!record || record.resetAt < Date.now()) {
            return this.config.maxRequests;
        }
        return Math.max(0, this.config.maxRequests - record.count);
    }

    async reset(key: string): Promise<void> {
        this.requests.delete(key);
    }

    /**
     * Clean up expired entries to prevent memory leaks
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, record] of this.requests.entries()) {
            if (record.resetAt < now) {
                this.requests.delete(key);
            }
        }
    }

    /**
     * Stop the cleanup interval (call when done with the limiter)
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.requests.clear();
    }
}

/**
 * Create a rate limiter with the given configuration
 * 
 * @param config - Rate limiter configuration
 * @returns Rate limiter instance
 */
export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
    return new MemoryRateLimiter(config);
}

/**
 * Create a no-op rate limiter that always allows requests
 * 
 * @returns No-op rate limiter instance
 */
export function createNoOpRateLimiter(): RateLimiter {
    return new NoOpRateLimiter();
}

// Global rate limiter instance
let globalRateLimiter: RateLimiter | null = null;

/**
 * Get the global rate limiter instance
 * Returns a no-op limiter if not configured
 */
export function getRateLimiter(): RateLimiter {
    if (!globalRateLimiter) {
        globalRateLimiter = new NoOpRateLimiter();
    }
    return globalRateLimiter;
}

/**
 * Configure the global rate limiter
 * 
 * @param config - Rate limiter configuration
 */
export function configureRateLimiter(config: RateLimiterConfig): void {
    // Clean up existing limiter if it's a MemoryRateLimiter
    if (globalRateLimiter instanceof MemoryRateLimiter) {
        globalRateLimiter.destroy();
    }
    globalRateLimiter = new MemoryRateLimiter(config);
}

/**
 * Reset the global rate limiter to the default no-op implementation
 */
export function resetRateLimiter(): void {
    if (globalRateLimiter instanceof MemoryRateLimiter) {
        globalRateLimiter.destroy();
    }
    globalRateLimiter = null;
}

