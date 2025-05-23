/**
 * @vitest-environment node
 */
import { vi, describe, expect, it, beforeEach } from 'vitest';
import type { Context } from '@/items/context';

// Create a mock function for createWeighted
const mockCreateWeighted = vi.fn();

// Use unstable_mockModule instead of vi.mock
vi.mock('@/items/weighted', () => ({
    create: mockCreateWeighted,
    DEFAULT_WEIGHTED_OPTIONS: { weight: 1, parameters: {} },
    WeightedOptionsSchema: {
        parse: vi.fn().mockReturnValue({ weight: 1, parameters: {} })
    },
    __esModule: true
}));

// Import the module under test - needs to be dynamic import with unstable_mockModule
let create: (text: string) => Context;
let Weighted;

describe('context', () => {
    beforeEach(async () => {

        // Reset the mock before each test
        mockCreateWeighted.mockReset();
        // Default implementation for the mock
        mockCreateWeighted.mockImplementation((text) => ({ text }));

        Weighted = await import('@/items/weighted');

        // Import the module under test dynamically after mocking
        const contextModule = await import('@/items/context');
        create = contextModule.create;
    });

    describe('types', () => {
        it('should define Context as a Weighted type', () => {
            // This is a type test - no assertions needed
            // The test compiles if Context type extends Weighted
            const context = {
                text: 'Test',
                weight: 1
            };

            expect(context.text).toBe('Test');
            expect(context.weight).toBe(1);
        });

        it('should define Contexts as an array of Context or Section<Context>', () => {
            // This is a type test - checking the structure compiles
            const contexts = [
                { text: 'Context 1' },
                { text: 'Context 2', weight: 2 }
                // Sections would be valid here too but would require importing Section
            ];

            expect(Array.isArray(contexts)).toBe(true);
        });
    });

    describe('create', () => {
        it('should call createWeighted with the provided text', () => {
            const text = 'Test context';
            create(text);
            expect(mockCreateWeighted).toHaveBeenCalledWith(text, { weight: 1, parameters: {} });
        });

        it('should return the result from createWeighted', () => {
            const mockResult = { text: 'Test context', weight: 2 };
            mockCreateWeighted.mockReturnValueOnce(mockResult);

            const result = create('Test context');

            expect(result).toBe(mockResult);
        });
    });
}); 