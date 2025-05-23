import { create, apply, Parameters } from '../../src/items/parameters';
import { describe, expect, it } from 'vitest';

describe('Parameters', () => {
    describe('create', () => {
        it('should return the same parameters object', () => {
            const params: Parameters = { name: 'test', value: 123 };
            expect(create(params)).toEqual(params);
        });

        it('should return an empty object if an empty object is passed', () => {
            const params: Parameters = {};
            expect(create(params)).toEqual({});
        });
    });

    describe('apply', () => {
        it('should return the original text if no parameters are provided', () => {
            const text = 'Hello, world!';
            expect(apply(text)).toBe(text);
        });

        it('should return the original text if parameters object is empty', () => {
            const text = 'Hello, {name}!';
            expect(apply(text, {})).toBe(text);
        });

        it('should replace a string parameter', () => {
            const text = 'Hello, {{name}}! Welcome to {{place}}.';
            const params: Parameters = { name: 'Alice', place: 'Wonderland' };
            expect(apply(text, params)).toBe('Hello, Alice! Welcome to Wonderland.');
        });

        it('should replace a number parameter', () => {
            const text = 'The anwser is {{value}}.';
            const params: Parameters = { value: 42 };
            expect(apply(text, params)).toBe('The anwser is 42.');
        });

        it('should replace a boolean parameter', () => {
            const text = 'Is it true? {{flag}}.';
            const params: Parameters = { flag: true };
            expect(apply(text, params)).toBe('Is it true? true.');
        });

        it('should replace an array of strings parameter', () => {
            const text = 'Colors: {{list}}.';
            const params: Parameters = { list: ['red', 'green', 'blue'] };
            expect(apply(text, params)).toBe('Colors: red, green, blue.');
        });

        it('should replace an array of numbers parameter', () => {
            const text = 'Numbers: {{list}}.';
            const params: Parameters = { list: [1, 2, 3] };
            expect(apply(text, params)).toBe('Numbers: 1, 2, 3.');
        });

        it('should replace an array of booleans parameter', () => {
            const text = 'Booleans: {{list}}.';
            const params: Parameters = { list: [true, false, true] };
            expect(apply(text, params)).toBe('Booleans: true, false, true.');
        });

        it('should leave unknown parameters as they are', () => {
            const text = 'Hello, {{name}}! Your id is {{id}}.';
            const params: Parameters = { name: 'Bob' };
            expect(apply(text, params)).toBe('Hello, Bob! Your id is {{id}}.');
        });

        it('should handle mixed parameter types', () => {
            const text = 'Name: {{name}}, Age: {{age}}, Active: {{isActive}}, Tags: {{tags}}.';
            const params: Parameters = { name: 'Charlie', age: 30, isActive: false, tags: ['a', 'b'] };
            expect(apply(text, params)).toBe('Name: Charlie, Age: 30, Active: false, Tags: a, b.');
        });

        it('should handle empty string input', () => {
            const text = '';
            const params: Parameters = { name: 'Test' };
            expect(apply(text, params)).toBe('');
        });

        it('should handle input string without placeholders', () => {
            const text = 'Just a plain string.';
            const params: Parameters = { name: 'Test' };
            expect(apply(text, params)).toBe('Just a plain string.');
        });

        it('should handle placeholders with no matching parameters', () => {
            const text = 'Hello {firstname} {lastname}';
            const params: Parameters = { name: 'Test' };
            expect(apply(text, params)).toBe('Hello {firstname} {lastname}');
        });

        it('should handle multiple occurrences of the same placeholder', () => {
            const text = '{{greeting}}, {{name}}! Yes, {{greeting}} indeed, {{name}}.';
            const params: Parameters = { greeting: 'Hi', name: 'Eve' };
            expect(apply(text, params)).toBe('Hi, Eve! Yes, Hi indeed, Eve.');
        });
    });
});
