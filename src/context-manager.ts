import crypto from 'crypto';
import { DEFAULT_LOGGER, wrapLogger } from "./logger";

// ===== TYPE DEFINITIONS =====

/**
 * Dynamic content item with enhanced tracking and lifecycle
 */
export interface DynamicContentItem {
    content: string;
    title?: string;
    weight?: number;

    // Unique identifier for deduplication
    id?: string;

    // Category for grouping
    category?: string;

    // Source of context
    source?: string;

    // Priority level
    priority?: 'high' | 'medium' | 'low';

    // Timestamp
    timestamp?: Date;
}

/**
 * Tracked context item with metadata
 */
export interface TrackedContextItem extends DynamicContentItem {
    id: string;
    hash: string;
    position: number;
    injectedAt: Date;
}

/**
 * Context statistics
 */
export interface ContextStats {
    totalItems: number;
    byCategory: Map<string, number>;
    byPriority: Map<string, number>;
    bySource: Map<string, number>;
    oldestTimestamp?: Date;
    newestTimestamp?: Date;
}

/**
 * ContextManager tracks and manages dynamically injected context.
 *
 * Features:
 * - Track all injected context with metadata
 * - Deduplication by ID, hash, or content
 * - Category-based organization
 * - Query context state
 * - Context statistics
 *
 * @example
 * ```typescript
 * const manager = new ContextManager();
 *
 * // Track injected context
 * manager.track({
 *   id: 'file:main.ts',
 *   content: fileContent,
 *   title: 'Main File',
 *   category: 'source-code'
 * }, 5);
 *
 * // Check for duplicates
 * if (manager.hasContext('file:main.ts')) {
 *   console.log('Already provided');
 * }
 *
 * // Query by category
 * const sourceFiles = manager.getByCategory('source-code');
 * ```
 */
export class ContextManager {
    private items: Map<string, TrackedContextItem>;
    private hashes: Set<string>;
    private logger: any;

    constructor(logger?: any) {
        this.items = new Map();
        this.hashes = new Set();
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'ContextManager');
    }

    /**
     * Track a context item
     */
    track(item: DynamicContentItem, position: number): void {
        const id = item.id || this.generateId();
        const hash = this.hashContent(item.content);

        const trackedItem: TrackedContextItem = {
            ...item,
            id,
            hash,
            position,
            injectedAt: new Date(),
            timestamp: item.timestamp || new Date(),
            priority: item.priority || 'medium',
        };

        this.items.set(id, trackedItem);
        this.hashes.add(hash);

        this.logger.debug('Tracked context item', { id, category: item.category, position });
    }

    /**
     * Check if context with given ID exists
     */
    hasContext(id: string): boolean {
        return this.items.has(id);
    }

    /**
     * Check if content with given hash exists
     */
    hasContentHash(content: string): boolean {
        const hash = this.hashContent(content);
        return this.hashes.has(hash);
    }

    /**
     * Check if similar content exists (fuzzy match)
     */
    hasSimilarContent(content: string): boolean {
        const normalized = this.normalizeContent(content);

        for (const item of this.items.values()) {
            const itemNormalized = this.normalizeContent(item.content || '');

            // Exact match
            if (normalized === itemNormalized) {
                return true;
            }

            // Substring match (one contains the other)
            if (normalized.includes(itemNormalized) || itemNormalized.includes(normalized)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get context item by ID
     */
    get(id: string): TrackedContextItem | undefined {
        return this.items.get(id);
    }

    /**
     * Get all tracked context items
     */
    getAll(): TrackedContextItem[] {
        return Array.from(this.items.values());
    }

    /**
     * Get context items by category
     */
    getByCategory(category: string): TrackedContextItem[] {
        return this.getAll().filter(item => item.category === category);
    }

    /**
     * Get context items by priority
     */
    getByPriority(priority: 'high' | 'medium' | 'low'): TrackedContextItem[] {
        return this.getAll().filter(item => item.priority === priority);
    }

    /**
     * Get context items by source
     */
    getBySource(source: string): TrackedContextItem[] {
        return this.getAll().filter(item => item.source === source);
    }

    /**
     * Get all categories
     */
    getCategories(): string[] {
        const categories = new Set<string>();
        this.items.forEach(item => {
            if (item.category) {
                categories.add(item.category);
            }
        });
        return Array.from(categories).sort();
    }

    /**
     * Get context statistics
     */
    getStats(): ContextStats {
        const byCategory = new Map<string, number>();
        const byPriority = new Map<string, number>();
        const bySource = new Map<string, number>();
        let oldestTimestamp: Date | undefined;
        let newestTimestamp: Date | undefined;

        this.items.forEach(item => {
            // Category stats
            if (item.category) {
                byCategory.set(item.category, (byCategory.get(item.category) || 0) + 1);
            }

            // Priority stats
            const priority = item.priority || 'medium';
            byPriority.set(priority, (byPriority.get(priority) || 0) + 1);

            // Source stats
            if (item.source) {
                bySource.set(item.source, (bySource.get(item.source) || 0) + 1);
            }

            // Timestamp stats
            if (item.timestamp) {
                if (!oldestTimestamp || item.timestamp < oldestTimestamp) {
                    oldestTimestamp = item.timestamp;
                }
                if (!newestTimestamp || item.timestamp > newestTimestamp) {
                    newestTimestamp = item.timestamp;
                }
            }
        });

        return {
            totalItems: this.items.size,
            byCategory,
            byPriority,
            bySource,
            oldestTimestamp,
            newestTimestamp,
        };
    }

    /**
     * Remove context item by ID
     */
    remove(id: string): boolean {
        const item = this.items.get(id);
        if (item) {
            this.items.delete(id);
            this.hashes.delete(item.hash);
            this.logger.debug('Removed context item', { id });
            return true;
        }
        return false;
    }

    /**
     * Clear all tracked context
     */
    clear(): void {
        this.items.clear();
        this.hashes.clear();
        this.logger.debug('Cleared all context');
    }

    /**
     * Generate unique ID for context item
     */
    private generateId(): string {
        return `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Hash content for deduplication
     */
    private hashContent(content: string): string {
        return crypto
            .createHash('sha256')
            .update(content)
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Normalize content for comparison
     */
    private normalizeContent(content: string): string {
        return content.replace(/\s+/g, ' ').trim().toLowerCase();
    }
}

export default ContextManager;

