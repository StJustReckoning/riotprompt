/**
 * @vitest-environment node
 */
import { vi, describe, expect, it, beforeEach } from 'vitest';
import type { Weighted } from '../../src/items/weighted';

// Import the module under test - needs to be dynamic import
let create: <T extends Weighted>(text: string) => T;

describe('weighted', () => {
    beforeEach(async () => {
        // Import the module under test dynamically
        const weightedModule = await import('../../src/items/weighted');
        create = weightedModule.create;
    });

    describe('create', () => {
        it('should create a weighted item with the given text', () => {
            // Arrange
            const text = 'Test text';

            // Act
            const result = create<Weighted>(text);

            // Assert
            expect(result).toEqual({
                text: 'Test text',
            });
        });

        it('should not set a weight by default', () => {
            // Arrange
            const text = 'Test text';

            // Act
            const result = create<Weighted>(text);

            // Assert
            expect(result.weight).toBeUndefined();
        });

        it('should typecast the result as specified generic type', () => {
            // Arrange
            interface CustomWeighted extends Weighted {
                customProp?: string;
            }

            // Act
            const result = create<CustomWeighted>('Custom text');

            // Assert
            expect(result).toHaveProperty('text');
            // The result should be type-castable to CustomWeighted
            expect(result.customProp).toBeUndefined();
        });
    });
}); 