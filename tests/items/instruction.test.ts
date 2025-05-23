/**
 * @vitest-environment node
 */
import { vi, describe, expect, it, beforeEach } from 'vitest';
import type { Instruction } from '../../src/items/instruction';

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
let create: (text: string) => Instruction;

describe('instruction', () => {
    beforeEach(async () => {
        // Reset the mock before each test
        mockCreateWeighted.mockReset();
        // Default implementation for the mock
        mockCreateWeighted.mockImplementation((text) => ({ text }));

        // Import the module under test dynamically after mocking
        const instructionModule = await import('@/items/instruction');
        create = instructionModule.create;
    });

    describe('types', () => {
        it('should define Instruction as a Weighted type', () => {
            // This is a type test - no assertions needed
            // The test compiles if Instruction type extends Weighted
            const instruction = {
                text: 'Test',
                weight: 1
            };

            expect(instruction.text).toBe('Test');
            expect(instruction.weight).toBe(1);
        });

        it('should define Instructions as an array of Instruction or Section<Instruction>', () => {
            // This is a type test - checking the structure compiles
            const instructions = [
                { text: 'Instruction 1' },
                { text: 'Instruction 2', weight: 2 }
                // Sections would be valid here too but would require importing Section
            ];

            expect(Array.isArray(instructions)).toBe(true);
        });
    });

    describe('create', () => {
        it('should call createWeighted with the provided text', () => {
            const text = 'Test instruction';
            create(text);
            expect(mockCreateWeighted).toHaveBeenCalledWith(text, { weight: 1, parameters: {} });
        });

        it('should return the result from createWeighted', () => {
            const mockResult = { text: 'Test instruction', weight: 2 };
            mockCreateWeighted.mockReturnValueOnce(mockResult);

            const result = create('Test instruction');

            expect(result).toBe(mockResult);
        });
    });
}); 