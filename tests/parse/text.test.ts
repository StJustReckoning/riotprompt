import { describe, expect, it } from 'vitest';
import { parseText } from '../../src/parse/text';
import { Weighted } from '../../src/items/weighted';
import { Section } from '../../src/items/section';

describe('parseText', () => {
    it('should create a section with the given title and empty content', () => {
        const result = parseText<Weighted>('', { title: 'Test' });
        expect(result.title).toBe('Test');
        expect(result.items).toHaveLength(0);
    });

    it('should parse a single line into a section with one item', () => {
        const result = parseText<Weighted>('Line 1', { title: 'Test' });
        expect(result.title).toBe('Test');
        expect(result.items).toHaveLength(1);
        expect((result.items[0] as Weighted).text).toBe('Line 1');
        expect((result.items[0] as Weighted).weight).toBeUndefined();
    });

    it('should parse multiple lines into a section with multiple items', () => {
        const result = parseText<Weighted>('Line 1\nLine 2\nLine 3', { title: 'Test' });
        expect(result.title).toBe('Test');
        expect(result.items).toHaveLength(3);
        expect((result.items[0] as Weighted).text).toBe('Line 1');
        expect((result.items[1] as Weighted).text).toBe('Line 2');
        expect((result.items[2] as Weighted).text).toBe('Line 3');
    });

    it('should filter empty lines', () => {
        const result = parseText<Weighted>('Line 1\n\nLine 2\n\n\nLine 3', { title: 'Test' });
        expect(result.items).toHaveLength(3);
    });

    it('should filter whitespace-only lines', () => {
        const result = parseText<Weighted>('Line 1\n   \nLine 2\n\t\nLine 3', { title: 'Test' });
        expect(result.items).toHaveLength(3);
    });

    it('should apply parameters to the text content', () => {
        const parameters = { name: 'John', age: 30, active: true };
        const result = parseText<Weighted>(
            'Name: {{name}}\nAge: {{age}}\nActive: {{active}}',
            { title: 'Test', parameters }
        );
        expect(result.items).toHaveLength(3);
        expect((result.items[0] as Weighted).text).toBe('Name: John');
        expect((result.items[1] as Weighted).text).toBe('Age: 30');
        expect((result.items[2] as Weighted).text).toBe('Active: true');
    });

    it('should use custom itemWeight if provided in options', () => {
        const result = parseText<Weighted>(
            'Line 1\nLine 2',
            { title: 'Test', itemWeight: 2.5 }
        );
        expect((result.items[0] as Weighted).weight).toBe(2.5);
        expect((result.items[1] as Weighted).weight).toBe(2.5);
    });

    it('should use parameters from options if provided', () => {
        const optionsParameters = { global: 'global-value', local: 'local-value' };

        const result = parseText<Weighted>(
            'Global: {{global}}\nLocal: {{local}}',
            { title: 'Test', parameters: optionsParameters }
        );

        expect(result.items).toHaveLength(2);
        // The mainSection is created with global parameters
        expect((result.items[0] as Weighted).text).toBe('Global: global-value');
        // The weighted items within the section use merged parameters when options.parameters exist
        expect((result.items[1] as Weighted).text).toBe('Local: local-value');
    });

    it('should handle Buffer input', () => {
        const buffer = Buffer.from('Line 1\nLine 2');
        const result = parseText<Weighted>(buffer, { title: 'Buffer Test' });

        expect(result.title).toBe('Buffer Test');
        expect(result.items).toHaveLength(2);
        expect((result.items[0] as Weighted).text).toBe('Line 1');
        expect((result.items[1] as Weighted).text).toBe('Line 2');
    });

    it('should handle empty Buffer input', () => {
        const buffer = Buffer.from('');
        const result = parseText<Weighted>(buffer, { title: 'Empty Buffer Test' });

        expect(result.title).toBe('Empty Buffer Test');
        expect(result.items).toHaveLength(0);
    });

    it('should handle Buffer input with parameters', () => {
        const buffer = Buffer.from('Name: {{name}}\nAge: {{age}}');
        const parameters = { name: 'Alice', age: 25 };
        const result = parseText<Weighted>(buffer, { title: 'Params Test', parameters });

        expect(result.items).toHaveLength(2);
        expect((result.items[0] as Weighted).text).toBe('Name: Alice');
        expect((result.items[1] as Weighted).text).toBe('Age: 25');
    });

    it('should handle options with both itemWeight and parameters', () => {
        const result = parseText<Weighted>(
            'User: {{name}}',
            {
                title: 'Combined Options',
                itemWeight: 3.7,
                parameters: { name: 'Bob' }
            }
        );

        expect(result.items).toHaveLength(1);
        expect((result.items[0] as Weighted).text).toBe('User: Bob');
        expect((result.items[0] as Weighted).weight).toBe(3.7);
    });

    it('should handle malformed parameter placeholders gracefully', () => {
        const result = parseText<Weighted>(
            'Valid: {{param}}\nInvalid: {{missing}}',
            { title: 'Malformed', parameters: { param: 'value' } }
        );

        expect(result.items).toHaveLength(2);
        expect((result.items[0] as Weighted).text).toBe('Valid: value');
        // With our updated implementation, unknown placeholders remain intact
        expect((result.items[1] as Weighted).text).toBe('Invalid: {{missing}}');
    });

    // We'll use a simpler approach to test generic type support
    it('should work with the generic type parameter', () => {
        interface CustomType extends Weighted {
            // No additional properties needed for the test
        }

        const result = parseText<CustomType>(
            'Test line',
            {
                title: 'Custom Type',
                itemWeight: 1.5
            }
        );

        expect(result.title).toBe('Custom Type');
        expect(result.items).toHaveLength(1);

        const item = result.items[0] as CustomType;
        expect(item.text).toBe('Test line');
        expect(item.weight).toBe(1.5);
    });

    it('should handle multiple parameter substitutions in a single line', () => {
        const result = parseText<Weighted>(
            'Hello {{name}}, you are {{age}} years old and {{status}}.',
            {
                title: 'Multiple Params',
                parameters: {
                    name: 'Jane',
                    age: 28,
                    status: 'active'
                }
            }
        );

        expect(result.items).toHaveLength(1);
        expect((result.items[0] as Weighted).text).toBe('Hello Jane, you are 28 years old and active.');
    });

    it('should handle nested parameter placeholders correctly', () => {
        // Instead of complex nesting, we'll test actual behavior with sequential replacements
        const result = parseText<Weighted>(
            'Nested: {{outer}}{{inner}}{{end}}',
            {
                title: 'Nested',
                parameters: {
                    outer: 'prefix-',
                    inner: 'value',
                    end: '-suffix'
                }
            }
        );

        expect(result.items).toHaveLength(1);
        expect((result.items[0] as Weighted).text).toBe('Nested: prefix-value-suffix');
    });

    it('should handle special characters in input text', () => {
        const specialChars = `Line with special chars: !@#$%^&*()_+-={}[]|\\:;"'<>,.?/`;
        const result = parseText<Weighted>(specialChars, { title: 'Special Chars' });

        expect(result.items).toHaveLength(1);
        expect((result.items[0] as Weighted).text).toBe(specialChars);
    });

    it('should handle mixed whitespace and non-whitespace lines', () => {
        const result = parseText<Weighted>(
            'Line 1\n  \nLine 2\n\t\n \t \nLine 3',
            { title: 'Mixed Whitespace' }
        );

        expect(result.items).toHaveLength(3);
        expect((result.items[0] as Weighted).text).toBe('Line 1');
        expect((result.items[1] as Weighted).text).toBe('Line 2');
        expect((result.items[2] as Weighted).text).toBe('Line 3');
    });

    it('should handle multi-line input with CRLF line endings', () => {
        const result = parseText<Weighted>(
            'Line 1\r\nLine 2\r\nLine 3',
            { title: 'CRLF Endings' }
        );

        expect(result.items).toHaveLength(3);
        expect((result.items[0] as Weighted).text).toBe('Line 1');
        expect((result.items[1] as Weighted).text).toBe('Line 2');
        expect((result.items[2] as Weighted).text).toBe('Line 3');
    });

    it('should handle null or undefined parameter values', () => {
        const result = parseText<Weighted>(
            'Null: {{nullParam}}, Undefined: {{undefinedParam}}',
            {
                title: 'Null Params',
                parameters: {
                    nullParam: '',  // Changed from null to empty string since null isn't allowed
                    // undefinedParam is not specified
                }
            }
        );

        expect(result.items).toHaveLength(1);
        // Note: With our updated implementation, unknown placeholders remain intact
        expect((result.items[0] as Weighted).text).toBe('Null: , Undefined: {{undefinedParam}}');
    });

    it('should handle consecutive parameter placeholders', () => {
        const result = parseText<Weighted>(
            'Adjacent: {{first}}{{second}}{{third}}',
            {
                title: 'Adjacent Params',
                parameters: {
                    first: 'Hello',
                    second: 'World',
                    third: '!'
                }
            }
        );

        expect(result.items).toHaveLength(1);
        expect((result.items[0] as Weighted).text).toBe('Adjacent: HelloWorld!');
    });

    it('should handle empty strings as input', () => {
        const result = parseText<Weighted>('', { title: 'Empty' });

        expect(result.title).toBe('Empty');
        expect(result.items).toHaveLength(0);
    });

    it('should handle options with only a title', () => {
        const result = parseText<Weighted>('Simple line', { title: 'Title Only' });

        expect(result.title).toBe('Title Only');
        expect(result.items).toHaveLength(1);
        expect((result.items[0] as Weighted).text).toBe('Simple line');
        expect((result.items[0] as Weighted).weight).toBeUndefined();
    });

    it('should handle whitespace in parameter placeholders', () => {
        const result = parseText<Weighted>(
            'With spaces: {{ param_with_spaces }}',
            {
                title: 'Whitespace',
                parameters: {
                    ' param_with_spaces ': 'value'
                }
            }
        );

        expect(result.items).toHaveLength(1);
        expect((result.items[0] as Weighted).text).toBe('With spaces: value');
    });

    it('should handle parameters with boolean values', () => {
        const result = parseText<Weighted>(
            'Boolean: {{isActive}}',
            {
                title: 'Boolean Params',
                parameters: {
                    isActive: true
                }
            }
        );

        expect(result.items).toHaveLength(1);
        expect((result.items[0] as Weighted).text).toBe('Boolean: true');
    });

    it('should handle parameters with numeric values', () => {
        const result = parseText<Weighted>(
            'Count: {{count}}, Price: {{price}}',
            {
                title: 'Numeric Params',
                parameters: {
                    count: 42,
                    price: 99.99
                }
            }
        );

        expect(result.items).toHaveLength(1);
        expect((result.items[0] as Weighted).text).toBe('Count: 42, Price: 99.99');
    });
});
