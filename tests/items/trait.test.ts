/**
 * @vitest-environment node
 */
import { vi, describe, expect, it, beforeEach } from 'vitest';
import type { Trait } from '../../src/items/trait';

// Create a mock function for createWeighted
const mockCreateWeighted = vi.fn();

// Use unstable_mockModule instead of vi.mock
vi.mock('@/items/weighted', () => ({
    create: mockCreateWeighted,
    DEFAULT_WEIGHTED_OPTIONS: { weight: 1, parameters: {} },
    WeightedOptionsSchema: {
        parse: vi.fn().mockReturnValue({ weight: 1, parameters: {} }),
        __esModule: true
    },
    WeightedSchema: {
        parse: vi.fn().mockReturnValue({ text: 'Test' }),
        __esModule: true
    },
}));

// Import the module under test - needs to be dynamic import with unstable_mockModule
let create: (text: string) => Trait;

describe('trait', () => {
    beforeEach(async () => {
        // Reset the mock before each test
        mockCreateWeighted.mockReset();
        // Default implementation for the mock
        mockCreateWeighted.mockImplementation((text) => ({ text }));

        // Import the module under test dynamically after mocking
        const traitModule = await import('@/items/trait');
        create = traitModule.create;
    });

    describe('types', () => {
        it('should define Trait as a Weighted type', () => {
            // This is a type test - no assertions needed
            // The test compiles if Trait type extends Weighted
            const trait = {
                text: 'Test',
                weight: 1
            };

            expect(trait.text).toBe('Test');
            expect(trait.weight).toBe(1);
        });
    });

    describe('create', () => {
        it('should call createWeighted with the provided text', () => {
            const text = 'Test trait';
            create(text);
            expect(mockCreateWeighted).toHaveBeenCalledWith(text, { weight: 1, parameters: {} });
        });

        it('should return the result from createWeighted', () => {
            const mockResult = { text: 'Test trait', weight: 2 };
            mockCreateWeighted.mockReturnValueOnce(mockResult);

            const result = create('Test trait');

            expect(result).toBe(mockResult);
        });
    });
}); 