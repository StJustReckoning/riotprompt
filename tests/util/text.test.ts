import { vi, describe, it, expect } from 'vitest';

import { isText } from '../../src/util/text';

describe('isText', () => {
    it('should return true for plain ASCII text string', () => {
        expect(isText('Hello, world!')).toBe(true);
    });

    it('should return true for Buffer containing ASCII text', () => {
        expect(isText(Buffer.from('Hello, world!'))).toBe(true);
    });

    it('should return false for Buffer containing null byte', () => {
        const buf = Buffer.from([72, 101, 0, 108, 111]); // 'He\0lo'
        expect(isText(buf)).toBe(false);
    });

    it('should return false for string containing null byte', () => {
        expect(isText('Hello\0World')).toBe(false);
    });

    it('should return false for mostly non-printable bytes', () => {
        // 50% non-printable
        const arr = Buffer.alloc(100, 1); // 100 bytes of 0x01 (non-printable)
        expect(isText(arr)).toBe(false);
    });

    it('should return true for mostly printable with a few non-printable', () => {
        const arr = Buffer.from('A'.repeat(95) + String.fromCharCode(1).repeat(5)); // 5% non-printable
        expect(isText(arr)).toBe(true);
    });

    it('should allow common whitespace characters', () => {
        expect(isText('\tHello\nWorld\r')).toBe(true);
    });

    it('should handle empty string', () => {
        expect(isText('')).toBe(true);
    });

    it('should handle empty Buffer', () => {
        expect(isText(Buffer.alloc(0))).toBe(true);
    });

    it('should return true for string with international (Unicode) characters', () => {
        expect(isText('こんにちは世界')).toBe(true); // Japanese
        expect(isText('Привет мир')).toBe(true); // Russian
        expect(isText('你好，世界')).toBe(true); // Chinese
        expect(isText('안녕하세요 세계')).toBe(true); // Korean
        expect(isText('مرحبا بالعالم')).toBe(true); // Arabic
    });

    it('should return true for Buffer with international (Unicode) characters', () => {
        expect(isText(Buffer.from('こんにちは世界', 'utf8'))).toBe(true);
        expect(isText(Buffer.from('Привет мир', 'utf8'))).toBe(true);
        expect(isText(Buffer.from('你好，世界', 'utf8'))).toBe(true);
        expect(isText(Buffer.from('안녕하세요 세계', 'utf8'))).toBe(true);
        expect(isText(Buffer.from('مرحبا بالعالم', 'utf8'))).toBe(true);
    });

    it('should return true for string with emojis', () => {
        expect(isText('Hello 👋🌍')).toBe(true);
        expect(isText('😀😃😄😁😆😅😂🤣')).toBe(true);
    });

    it('should return true for Buffer with emojis', () => {
        expect(isText(Buffer.from('Hello 👋🌍', 'utf8'))).toBe(true);
        expect(isText(Buffer.from('😀😃😄😁😆😅😂🤣', 'utf8'))).toBe(true);
    });
});
