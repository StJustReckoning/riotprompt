import { describe, expect, test } from 'vitest';
import { isMarkdown } from '../../src/util/markdown';

describe('isMarkdown', () => {
    // Test cases from the original file's example usage
    test('should return true for header', () => {
        const markdown = '# Hello World\\nThis is a test.';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for list', () => {
        const markdown = '* Item 1\\n* Item 2';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for link', () => {
        const markdown = '[Google](https://google.com)';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for blockquote', () => {
        const markdown = '> This is a quote.';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for code block', () => {
        const markdown = '```javascript\\nconsole.log("hello");\\n```';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return false for plain text', () => {
        const text = 'This is a plain text string.';
        expect(isMarkdown(text)).toBe(false);
    });

    test('should return false for long non-markdown string with underscores', () => {
        const text = 'hello_world.this_is_a_test_string_with_underscores_but_not_markdown_thematic_break';
        expect(isMarkdown(text)).toBe(false);
    });

    test('should return false for XML string', () => {
        const text = '<xml><tag>value</tag></xml>';
        expect(isMarkdown(text)).toBe(false);
    });

    test('should return true for short markdown (header)', () => {
        const markdown = '# H';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return false for short non-markdown', () => {
        const text = 'Hello';
        expect(isMarkdown(text)).toBe(false);
    });

    test('should return false for empty string', () => {
        const text = '';
        expect(isMarkdown(text)).toBe(false);
    });

    test('should return false for whitespace string', () => {
        const text = '   \\t \\n  ';
        expect(isMarkdown(text)).toBe(false);
    });

    test('should return true for string with many markdown features', () => {
        const markdown = `# Title\\n\\n* list\\n* list2\\n\\n> quote here\\n\\n\`\`\`\\ncode\\n\`\`\`\\n\\nnormal text paragraph with a [link](url).\\n---\\nAnother paragraph.\\nThis is just a test string to see how it performs with multiple markdown features present.\\nHello world this is a very long line that does not contain any markdown syntax at all, it is just plain text that goes on and on.\\n* Another list item\\n* And another one\\n# Another Header\\n## Subheader\\nThis is fun.\\nOkay I think this is enough.\\nFinal line.\\nAnother final line.\\nOne more for good measure.\\nOkay that should be enough lines to test the early exit.\\n`;
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return false for HTML-like string', () => {
        const text = '<div><p>Hello</p><ul><li>item</li></ul></div>';
        expect(isMarkdown(text)).toBe(false);
    });

    // Additional test cases
    test('should return true for thematic break (---)', () => {
        const markdown = '---';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for thematic break (***)', () => {
        const markdown = '***';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for thematic break (___)', () => {
        const markdown = '___';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for inline code', () => {
        const markdown = 'This is `inline code`.';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for image', () => {
        const markdown = '![alt text](image.png)';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for a mix of markdown and plain text', () => {
        const text = "This is plain text.\n# But this is a header\nAnd this is more plain text.";
        expect(isMarkdown(text)).toBe(true);
    });

    test('should return false for a string with only a single asterisk', () => {
        const text = '*';
        expect(isMarkdown(text)).toBe(false);
    });

    test('should return false for a string with only a single hash', () => {
        const text = '#';
        expect(isMarkdown(text)).toBe(false);
    });

    test('should return true for list item with plus', () => {
        const markdown = '+ Item 1\n+ Item 2';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for list item with minus', () => {
        const markdown = '- Item 1\n- Item 2';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should correctly identify markdown in a longer text that starts with non-markdown', () => {
        const text = "This is a fairly long introductory sentence that doesn't immediately scream markdown. It's just some normal prose. \nHowever, if we go further down...\n\n* We might find a list item.\n* Or even another one.\n\nThat should be enough to trigger the detection.";
        expect(isMarkdown(text)).toBe(true);
    });

    test('should handle lines with leading/trailing whitespace correctly', () => {
        const markdown = '  # Padded Header  \n  * Padded List Item  ';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return false for a string that looks like a list but lacks spacing', () => {
        const text = '*noSpaceAfterAsterisk';
        expect(isMarkdown(text)).toBe(false);
    });

    test('should return false for a string that looks like a header but lacks spacing', () => {
        const text = '#noSpaceAfterHash';
        expect(isMarkdown(text)).toBe(false);
    });

    test('should return true for markdown with just a code block and nothing else', () => {
        const markdown = '```\\nconst x = 10;\\n```';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for markdown with just a link and nothing else', () => {
        const markdown = '[a link](http://example.com)';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for Buffer containing markdown string', () => {
        const markdownBuffer = Buffer.from('# Buffer Header\n* Buffer List');
        expect(isMarkdown(markdownBuffer)).toBe(true);
    });

    test('should return false for Buffer containing plain text', () => {
        const plainBuffer = Buffer.from('This is just a plain buffer string.');
        expect(isMarkdown(plainBuffer)).toBe(false);
    });

    test('should return false for Buffer containing binary data', () => {
        // Create a buffer with non-UTF-8 binary data
        const binaryBuffer = Buffer.from([0xff, 0xfe, 0xfd, 0x00, 0x01, 0x02]);
        expect(isMarkdown(binaryBuffer)).toBe(false);
    });

    test('should return false for Buffer containing UTF-8 string that is not markdown', () => {
        const utf8Buffer = Buffer.from('Just a normal sentence.');
        expect(isMarkdown(utf8Buffer)).toBe(false);
    });

    // Additional tests for better coverage
    test('should return false for null input', () => {
        expect(isMarkdown(null as any)).toBe(false);
    });

    test('should return false for undefined input', () => {
        expect(isMarkdown(undefined as any)).toBe(false);
    });

    test('should handle early exit for long markdown with features at the beginning', () => {
        // Create a string with markdown features at the beginning and then a lot of plain text
        const earlyMarkdown = '# Header\n* List item 1\n* List item 2\n\n' +
            'Plain text '.repeat(500); // Long plain text afterwards
        expect(isMarkdown(earlyMarkdown)).toBe(true);
    });

    test('should correctly identify markdown in text with exactly threshold percentage of features', () => {
        // 1 out of 20 lines (5%) has markdown
        const text = 'Plain text.\n'.repeat(19) + '# Header\n';
        expect(isMarkdown(text)).toBe(true);
    });

    test('should return true for text with exactly one markdown feature in a short text', () => {
        // Test for the condition: markdownFeatureCount >= 1 && significantLineCount <= 5
        const text = 'Plain line 1\nPlain line 2\n# Header\nPlain line 4\nPlain line 5';
        expect(isMarkdown(text)).toBe(true);
    });

    // Tests for specific feature patterns that might need explicit coverage
    test('should return true for inline code with single backtick', () => {
        const markdown = 'This sentence has `inline code` in it.';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for inline code with multiple backticks', () => {
        const markdown = 'This sentence has ``inline code with backtick (`) inside`` in it.';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should return true for image markdown syntax', () => {
        const markdown = 'An image: ![alt text](image-url.png)';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should handle indented markdown correctly', () => {
        const markdown = '   * Indented list item\n     > Indented blockquote';
        expect(isMarkdown(markdown)).toBe(true);
    });

    test('should handle Buffer with non-standard encoding gracefully', () => {
        // Create a buffer with some non-standard encoding but still readable text
        const buffer = Buffer.from([0xC2, 0xA9, 0x20, 0x4D, 0x61, 0x72, 0x6B, 0x64, 0x6F, 0x77, 0x6E]);
        expect(isMarkdown(buffer)).toBe(false);
    });
});
