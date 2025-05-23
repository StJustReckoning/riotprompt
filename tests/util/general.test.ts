import { clean, stringifyJSON } from '../../src/util/general';
import { describe, expect, it } from 'vitest';
describe('clean', () => {
    it('should remove undefined values from an object', () => {
        const input = { a: 1, b: undefined, c: 'hello', d: undefined };
        const expected = { a: 1, c: 'hello' };
        expect(clean(input)).toEqual(expected);
    });

    it('should handle empty objects', () => {
        expect(clean({})).toEqual({});
    });

    it('should keep null values', () => {
        const input = { a: null, b: undefined };
        const expected = { a: null };
        expect(clean(input)).toEqual(expected);
    });

    it('should keep falsy values except undefined', () => {
        const input = { a: 0, b: '', c: false, d: undefined };
        const expected = { a: 0, b: '', c: false };
        expect(clean(input)).toEqual(expected);
    });
});

describe('stringifyJSON', () => {
    it('should stringify primitive values', () => {
        expect(stringifyJSON(42)).toBe('42');
        expect(stringifyJSON('test')).toBe('"test"');
        expect(stringifyJSON(true)).toBe('true');
        expect(stringifyJSON(null)).toBe('null');
    });

    it('should stringify arrays', () => {
        expect(stringifyJSON([])).toBe('[]');
        expect(stringifyJSON([1, 2, 3])).toBe('[1,2,3]');
        expect(stringifyJSON(['a', 'b'])).toBe('["a","b"]');
        expect(stringifyJSON([1, 'a', true])).toBe('[1,"a",true]');
    });

    it('should stringify nested arrays', () => {
        expect(stringifyJSON([[]])).toBe('[[]]');
        expect(stringifyJSON([1, [2, 3]])).toBe('[1,[2,3]]');
    });

    it('should stringify objects', () => {
        expect(stringifyJSON({})).toBe('{}');
        expect(stringifyJSON({ a: 1 })).toBe('{"a":1}');
        expect(stringifyJSON({ a: 'hello' })).toBe('{"a":"hello"}');
        expect(stringifyJSON({ a: true, b: false })).toBe('{"a":true,"b":false}');
    });

    it('should stringify nested objects', () => {
        expect(stringifyJSON({ a: { b: 1 } })).toBe('{"a":{"b":1}}');
        expect(stringifyJSON({ a: { b: { c: 'hello' } } })).toBe('{"a":{"b":{"c":"hello"}}}');
    });

    it('should stringify mixed nested structures', () => {
        expect(stringifyJSON({ a: [1, 2] })).toBe('{"a":[1,2]}');
        expect(stringifyJSON([{ a: 1 }, { b: 2 }])).toBe('[{"a":1},{"b":2}]');
    });

    it('should skip functions', () => {
        const input = { a: 1, b: function () { } };
        expect(stringifyJSON(input)).toBe('{"a":1}');
    });

    it('should skip undefined values', () => {
        const input = { a: 1, b: undefined };
        expect(stringifyJSON(input)).toBe('{"a":1}');
    });
});
