import { beforeEach, describe, expect, it, vi } from 'vitest';

// Setup mocks before importing the module
const mockReadFile = vi.fn<(path: string, encoding: string) => Promise<string>>();
const mockLexer = vi.fn();

// Mock fs/promises module
vi.mock('fs/promises', () => ({
    readFile: mockReadFile
}));

// Mock marked
vi.mock('marked', () => ({
    marked: {
        lexer: mockLexer
    }
}));

// Import the module after setting up mocks
describe('parser', () => {
    let parser: any;
    let parseFile: (filePath: string) => Promise<any>;
    let parse: (markdownContent: string) => any;

    beforeEach(async () => {
        // Import the module dynamically to ensure mocks are applied
        const parserModule = await import('../../src/parser');
        parser = parserModule.create();
        parseFile = parser.parseFile;
        parse = parser.parse;

        // Reset mocks
        vi.clearAllMocks();
    });

    it('should parse a simple markdown file with paragraphs', async () => {
        // Arrange
        const markdownContent = 'This is a paragraph.\n\nThis is another paragraph.';

        mockLexer.mockReturnValue([
            { type: 'paragraph', text: 'This is a paragraph.' },
            { type: 'paragraph', text: 'This is another paragraph.' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toEqual({ text: 'This is a paragraph.' });
        expect(result.items[1]).toEqual({ text: 'This is another paragraph.' });
    });

    it('should parse markdown with sections (h2 headings)', async () => {
        // Arrange
        const markdownContent = 'Top level paragraph.\n\n## Section 1\n\nContent.';

        mockLexer.mockReturnValue([
            { type: 'paragraph', text: 'Top level paragraph.' },
            { type: 'heading', depth: 2, text: 'Section 1' },
            { type: 'paragraph', text: 'Content.' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toEqual({ text: 'Top level paragraph.' });
        expect(result.items[1].title).toBe('Section 1');
        expect(result.items[1].items[0]).toEqual({ text: 'Content.' });
    });

    it('should handle code blocks and lists', async () => {
        // Arrange
        const markdownContent = '## Section\n```js\ncode\n```\n- List item';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 2, text: 'Section' },
            { type: 'code', lang: 'js', text: 'code' },
            { type: 'list', items: [{ text: 'List item' }] }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.title).toBe('Section');
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toEqual({ text: '```js\ncode\n```' });
        expect(result.items[1]).toEqual({ text: '- List item' });
    });

    it('should throw an error if file reading fails', async () => {
        // Arrange
        const error = new Error('File not found');
        mockReadFile.mockRejectedValue(error);

        // Suppress console.error for this test
        const originalConsoleError = console.error;
        console.error = vi.fn();

        try {
            // Act & Assert
            await expect(parseFile('nonexistent.md'))
                .rejects.toThrow(/Failed to parse content from nonexistent.md:/);
        } finally {
            // Restore console.error
            console.error = originalConsoleError;
        }
    });

    // Additional tests for better coverage

    it('should handle h1 headings before any h2 sections', async () => {
        // Arrange
        const markdownContent = '# Main Title\n\nSome content\n\n## Section';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 1, text: 'Main Title' },
            { type: 'paragraph', text: 'Some content' },
            { type: 'heading', depth: 2, text: 'Section' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.title).toBe('Main Title');
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toEqual({ text: 'Some content' });
        expect(result.items[1].title).toBe('Section');
        expect(result.items[1].items).toHaveLength(0);
    });

    it('should handle h1 headings after h2 sections are established', async () => {
        // Arrange
        const markdownContent = '## Section 1\n\nContent\n\n# H1 inside section';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 2, text: 'Section 1' },
            { type: 'paragraph', text: 'Content' },
            { type: 'heading', depth: 1, text: 'H1 inside section' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        // When a document starts with an h2, that becomes the main section title
        expect(result.title).toBe('Section 1');
        expect(result.items).toHaveLength(2);
        expect(result.items[0]).toEqual({ text: 'Content' });
        expect(result.items[1].title).toBe('H1 inside section');
        expect(result.items[1].items).toHaveLength(0);
    });

    it('should handle h3+ headings appropriately', async () => {
        // Arrange
        const markdownContent = '## Main Section\n\n### Sub-heading\n\nContent';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 2, text: 'Main Section' },
            { type: 'heading', depth: 3, text: 'Sub-heading' },
            { type: 'paragraph', text: 'Content' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        // First heading becomes the title of the main section
        expect(result.title).toBe('Main Section');
        expect(result.items).toHaveLength(1);
        expect(result.items[0].title).toBe('Sub-heading');
        expect(result.items[0].items).toHaveLength(1);
        expect(result.items[0].items[0]).toEqual({ text: 'Content' });
    });

    it('should handle blockquote tokens', async () => {
        // Arrange
        const markdownContent = '## Section\n\n> This is a quote';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 2, text: 'Section' },
            { type: 'blockquote', text: 'This is a quote' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.title).toBe('Section');
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual({ text: 'This is a quote' });
    });

    it('should handle space tokens', async () => {
        // Arrange
        const markdownContent = '## Section\n\nParagraph\n\n\n';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 2, text: 'Section' },
            { type: 'paragraph', text: 'Paragraph' },
            { type: 'space' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.title).toBe('Section');
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual({ text: 'Paragraph' });
    });

    it('should handle complex document with multiple section transitions', async () => {
        // Arrange
        const markdownContent = 'Intro\n\n## Section 1\n\nContent 1\n\n## Section 2\n\nContent 2';

        mockLexer.mockReturnValue([
            { type: 'paragraph', text: 'Intro' },
            { type: 'heading', depth: 2, text: 'Section 1' },
            { type: 'paragraph', text: 'Content 1' },
            { type: 'heading', depth: 2, text: 'Section 2' },
            { type: 'paragraph', text: 'Content 2' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.title).toBe(undefined);
        expect(result.items).toHaveLength(3); // Intro plus two separate sections
        expect(result.items[0]).toEqual({ text: 'Intro' });

        expect(result.items[1].title).toBe('Section 1');
        expect(result.items[1].items).toHaveLength(1);
        expect(result.items[1].items[0]).toEqual({ text: 'Content 1' });

        // Section 2 is a sibling to Section 1, not nested inside it
        expect(result.items[2].title).toBe('Section 2');
        expect(result.items[2].items).toHaveLength(1);
        expect(result.items[2].items[0]).toEqual({ text: 'Content 2' });
    });

    it('should handle unexpected token types gracefully', async () => {
        // Arrange
        const markdownContent = '## Section\n\nSome content with unexpected elements';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 2, text: 'Section' },
            { type: 'paragraph', text: 'Some content' },
            { type: 'unknown_token_type', text: 'This is an unknown token type' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.title).toBe('Section');
        expect(result.items.length).toBeGreaterThanOrEqual(1);
        // The unknown token type should be handled somehow, either ignored or treated as text
    });

    // Additional specific tests for lines 54-55, 78, 89, and 109

    it('should handle other heading depths (lines 54-55)', async () => {
        // Arrange - specifically testing heading depths that aren't 1 or 2
        const markdownContent = '## Section\n\n#### Level 4 heading';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 2, text: 'Section' },
            { type: 'heading', depth: 4, text: 'Level 4 heading' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.title).toBe('Section');
        expect(result.items).toHaveLength(1);
        expect(result.items[0].title).toBe('Level 4 heading');
        expect(result.items[0].items).toHaveLength(0);
    });

    it('should handle tokens with text property but unknown type (line 78)', async () => {
        // Arrange - testing the 'default' case in the switch statement
        const markdownContent = '## Section\n\nCustom content';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 2, text: 'Section' },
            { type: 'custom_type_with_text', text: 'Custom content' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.title).toBe('Section');
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual({ text: 'Custom content' });
    });

    it('should handle multiple space tokens (line 89)', async () => {
        // Arrange - specifically testing the handling of space tokens
        const markdownContent = '## Section\n\n\n\n';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 2, text: 'Section' },
            { type: 'space' },
            { type: 'space' },
            { type: 'space' }
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result.title).toBe('Section');
        expect(result.items).toHaveLength(0); // Space tokens should be ignored
    });

    it('should filter out empty sections and instructions (line 109)', async () => {
        // Arrange - explicitly testing the filter functionality
        const markdownContent = '## \n\n##  \n\n ';

        mockLexer.mockReturnValue([
            { type: 'heading', depth: 2, text: '' },  // Empty section title
            { type: 'heading', depth: 2, text: '  ' }, // Whitespace-only section title
            { type: 'paragraph', text: ' ' }           // Whitespace-only paragraph
        ]);

        // Act
        const result = await parse(markdownContent);

        // Assert
        expect(result).toBeDefined();
        expect(result.title).toBe('');
    });
});
