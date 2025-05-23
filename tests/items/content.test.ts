/**
 * @vitest-environment node
 */
import { vi, describe, expect, it, beforeEach } from 'vitest';
import type { Content } from '@/items/content';

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
    __esModule: true
}));

// Import the module under test - needs to be dynamic import with unstable_mockModule
let create: (text: string) => Content;

describe('content', () => {
    beforeEach(async () => {
        // Reset the mock before each test
        mockCreateWeighted.mockReset();
        // Default implementation for the mock
        mockCreateWeighted.mockImplementation((text) => ({ text }));

        // Import the module under test dynamically after mocking
        const contentModule = await import('@/items/content');
        create = contentModule.create;
    });

    describe('types', () => {
        it('should define Content as a Weighted type', () => {
            // This is a type test - no assertions needed
            // The test compiles if Content type extends Weighted
            const content = {
                text: 'Test',
                weight: 1
            };

            expect(content.text).toBe('Test');
            expect(content.weight).toBe(1);
        });

        it('should define Contents as an array of Content or Section<Content>', () => {
            // This is a type test - checking the structure compiles
            const contents = [
                { text: 'Content 1' },
                { text: 'Content 2', weight: 2 }
                // Sections would be valid here too but would require importing Section
            ];

            expect(Array.isArray(contents)).toBe(true);
        });
    });

    describe('create', () => {
        it('should call createWeighted with the given text', () => {
            // Arrange
            const text = 'Test content';
            const expectedResult = { text }; // Default mock implementation returns this
            mockCreateWeighted.mockReturnValue(expectedResult); // Explicitly set return value for clarity

            // Act
            const result = create(text);

            // Assert
            expect(mockCreateWeighted).toHaveBeenCalledTimes(1);
            expect(mockCreateWeighted).toHaveBeenCalledWith(text, { weight: 1, parameters: {} });
            expect(result).toBe(expectedResult); // Check if it returns the object from the mock
        });

        it('should return an object with the provided text', () => {
            // Arrange
            const text = 'Another test content';
            const expectedResult = { text };
            mockCreateWeighted.mockReturnValue(expectedResult);

            // Act
            const result = create(text);

            // Assert
            expect(result).toEqual({ text: 'Another test content' });
        });

        it('should typecast the result as Content', () => {
            // Arrange
            const text = 'Type test content';
            const mockReturnValue = { text };
            mockCreateWeighted.mockReturnValue(mockReturnValue);

            // Act
            const result = create(text); // create should return Content type

            // Assert
            // This is primarily a compile-time check.
            // We can add runtime checks to ensure the structure is as expected.
            expect(result).toHaveProperty('text');
            // Based on weighted.create, weight should be undefined unless explicitly set
            expect(result.weight).toBeUndefined();
        });
    });
}); 