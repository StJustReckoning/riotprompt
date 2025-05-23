import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSection, Section } from '../src/minorPrompt';
import path from 'path';
import { DEFAULT_LOGGER } from '../src/logger';

// Setup mock functions
const mockExists = vi.fn();
const mockIsFile = vi.fn();
const mockIsDirectory = vi.fn();
const mockReadFile = vi.fn();
const mockListFiles = vi.fn();
const mockStorageCreate = vi.fn().mockReturnValue({
    exists: mockExists,
    isFile: mockIsFile,
    isDirectory: mockIsDirectory,
    readFile: mockReadFile,
    listFiles: mockListFiles
});

// Mock the storage module
vi.mock('../src/util/storage', () => ({
    create: mockStorageCreate
}));

// We'll import these dynamically in the beforeEach
let loaderModule: {
    create: (options: any) => any;
    extractFirstHeader: (markdownText: string) => string | null;
    removeFirstHeader: (markdownText: string) => string;
};
let Storage;

describe('Loader', () => {

    beforeEach(async () => {
        vi.clearAllMocks();

        // Set default mock implementations
        mockIsDirectory.mockImplementation(() => Promise.resolve(false));
        mockIsFile.mockImplementation(() => Promise.resolve(false));
        mockExists.mockImplementation(() => Promise.resolve(false));

        // Dynamically import the modules after mocking
        Storage = await import('../src/util/storage');
        loaderModule = await import('../src/loader');
    });

    // Test the utility functions first
    describe('extractFirstHeader', () => {
        it('should extract a level 1 header from markdown', () => {
            const markdown = '# Header 1\nSome content';
            expect(loaderModule.extractFirstHeader(markdown)).toBe('Header 1');
        });

        it('should extract a level 2 header from markdown', () => {
            const markdown = '## Header 2\nSome content';
            expect(loaderModule.extractFirstHeader(markdown)).toBe('Header 2');
        });

        it('should extract a level 6 header from markdown', () => {
            const markdown = '###### Header 6\nSome content';
            expect(loaderModule.extractFirstHeader(markdown)).toBe('Header 6');
        });

        it('should return null if there is no header', () => {
            const markdown = 'Just some content without a header';
            expect(loaderModule.extractFirstHeader(markdown)).toBeNull();
        });

        it('should extract the first header when multiple headers exist', () => {
            const markdown = '# First Header\nSome content\n## Second Header';
            expect(loaderModule.extractFirstHeader(markdown)).toBe('First Header');
        });

        it('should handle headers with special characters', () => {
            const markdown = '# Header with *emphasis* and **strong**';
            expect(loaderModule.extractFirstHeader(markdown)).toBe('Header with *emphasis* and **strong**');
        });
    });

    describe('removeFirstHeader', () => {
        it('should remove a level 1 header from markdown', () => {
            const markdown = '# Header 1\nSome content';
            expect(loaderModule.removeFirstHeader(markdown)).toBe('Some content');
        });

        it('should remove a level 2 header from markdown', () => {
            const markdown = '## Header 2\nSome content';
            expect(loaderModule.removeFirstHeader(markdown)).toBe('Some content');
        });

        it('should return original text if there is no header', () => {
            const markdown = 'Just some content without a header';
            expect(loaderModule.removeFirstHeader(markdown)).toBe('Just some content without a header');
        });

        it('should only remove the first header when multiple headers exist', () => {
            const markdown = '# First Header\nSome content\n## Second Header\nMore content';
            expect(loaderModule.removeFirstHeader(markdown)).toBe('Some content\n## Second Header\nMore content');
        });

        it('should handle multiline headers correctly', () => {
            const markdown = '# Header 1\nContent line 1\nContent line 2';
            expect(loaderModule.removeFirstHeader(markdown)).toBe('Content line 1\nContent line 2');
        });
    });

    // Test the main loader functionality
    describe('Loader Instance', () => {
        let loader: any;

        beforeEach(() => {
            // Create loader instance with mock logger
            const mockLogger = { ...DEFAULT_LOGGER, debug: vi.fn(), error: vi.fn() };
            loader = loaderModule.create({ logger: mockLogger });
        });

        it('should return empty array when no context directories provided', async () => {
            const sections = await loader.load();
            expect(sections).toEqual([]);
        });

        it('should return empty array when empty array of context directories provided', async () => {
            const sections = await loader.load([]);
            expect(sections).toEqual([]);
        });

        it('should use directory name as title when no context.md file exists', async () => {
            const contextDir = '/test/context';
            const contextFile = path.join(contextDir, 'context.md');

            // Mock exists to return false for context.md
            // @ts-ignore
            mockExists.mockImplementation((filePath: string) => {
                return Promise.resolve(filePath !== contextFile);
            });

            // Mock isDirectory to return true for directory paths
            // @ts-ignore
            mockIsDirectory.mockImplementation((dirPath: string) => {
                return Promise.resolve(dirPath === contextDir);
            });

            // @ts-ignore
            mockListFiles.mockResolvedValue(['file1.md']);
            // @ts-ignore
            mockIsFile.mockImplementation((filePath: string) => {
                // Return false for directories, true for files
                return Promise.resolve(filePath !== contextDir);
            });
            // @ts-ignore
            mockReadFile.mockResolvedValue('Content of file 1');

            const sections = await loader.load([contextDir]);

            // Should create a section with directory name as title
            expect(sections.length).toBe(1);
            expect(sections[0].title).toBe('context');

            // Should add file1.md as a subsection
            expect(sections[0].items.length).toBe(1);
        });

        it('should handle multiple context directories', async () => {
            const contextDir1 = '/test/context1';
            const contextDir2 = '/test/context2';
            const contextFile1 = path.join(contextDir1, 'context.md');
            const contextFile2 = path.join(contextDir2, 'context.md');

            // Mock exists to return true only for context.md in the second directory
            // @ts-ignore
            mockExists.mockImplementation((filePath: string) => {
                return Promise.resolve(filePath === contextFile2);
            });

            // Mock isDirectory to return true for directory paths
            // @ts-ignore
            mockIsDirectory.mockImplementation((dirPath: string) => {
                return Promise.resolve(dirPath === contextDir1 || dirPath === contextDir2);
            });

            // Mock listFiles to return different files for each directory
            // @ts-ignore
            mockListFiles.mockImplementation((dirPath: string) => {
                if (dirPath === contextDir1) {
                    return Promise.resolve([]);
                }
                if (dirPath === contextDir2) {
                    return Promise.resolve(['context.md']);
                }
                return Promise.resolve([]);
            });

            // Mock readFile to return content for context.md in the second directory
            // @ts-ignore
            mockReadFile.mockImplementation((filePath: string) => {
                if (filePath === contextFile2) {
                    return Promise.resolve('# Context 2\nContent for context 2');
                }
                return Promise.resolve('');
            });

            // @ts-ignore
            mockIsFile.mockImplementation((filePath: string) => {
                // Return false for directories, true for files
                return Promise.resolve(filePath !== contextDir1 && filePath !== contextDir2);
            });

            const sections = await loader.load([contextDir1, contextDir2]);

            // Should create sections for both directories
            expect(sections.length).toBe(2);
            expect(sections[0].title).toBe('context1');
            expect(sections[1].title).toBe('Context 2');
        });

        it('should handle errors gracefully when processing context directories', async () => {
            const contextDir = '/test/context';

            // @ts-ignore
            mockExists.mockRejectedValue(new Error('Test error'));

            const sections = await loader.load([contextDir]);

            // Should not add any sections when errors occur
            expect(sections.length).toBe(0);
        });

        it('should extract headers from markdown files for section titles', async () => {
            const contextDir = '/test/context';
            const contextFile = path.join(contextDir, 'context.md');

            // Mock exists to return false for context.md
            // @ts-ignore
            mockExists.mockImplementation((filePath: string) => {
                return Promise.resolve(filePath !== contextFile);
            });

            // Mock isDirectory to return true for directory paths
            // @ts-ignore
            mockIsDirectory.mockImplementation((dirPath: string) => {
                return Promise.resolve(dirPath === contextDir);
            });

            // @ts-ignore
            mockListFiles.mockResolvedValue(['file1.md', 'file2.txt']);
            // @ts-ignore
            mockIsFile.mockImplementation((filePath: string) => {
                // Return false for directories, true for files
                return Promise.resolve(filePath !== contextDir);
            });

            // Mock readFile to return different content based on the file
            // @ts-ignore
            mockReadFile.mockImplementation((filePath: string) => {
                if (filePath.includes('file1.md')) {
                    return Promise.resolve('# Markdown File\nMarkdown content');
                }
                if (filePath.includes('file2.txt')) {
                    return Promise.resolve('Plain text content');
                }
                return Promise.resolve('');
            });

            const sections = await loader.load([contextDir]);

            // Check the first child (markdown file)
            expect(sections[0].items[0].title).toBe('Markdown File');
            expect(sections[0].items[0].items[0].text).toBe('Markdown content');

            // Check the second child (text file)
            expect(sections[0].items[1].title).toBe('file2.txt');
            expect(sections[0].items[1].items[0].text).toBe('Plain text content');
        });

        it('should skip context.md file when processing other files', async () => {
            const contextDir = '/test/context';
            const contextFile = path.join(contextDir, 'context.md');

            // Mock exists to return true for context.md
            // @ts-ignore
            mockExists.mockResolvedValue(true);

            // Mock isDirectory to return true for directory paths
            // @ts-ignore
            mockIsDirectory.mockImplementation((dirPath: string) => {
                return Promise.resolve(dirPath === contextDir);
            });

            // Mock readFile to return different content based on the file
            // @ts-ignore
            mockReadFile.mockImplementation((filePath: string) => {
                if (filePath === contextFile) {
                    return Promise.resolve('# Test Context\nThis is test context content');
                }
                if (filePath.includes('file1.md')) {
                    return Promise.resolve('# File 1\nContent of file 1');
                }
                return Promise.resolve('');
            });

            // @ts-ignore
            mockListFiles.mockResolvedValue(['context.md', 'file1.md']);
            // @ts-ignore
            mockIsFile.mockImplementation((filePath: string) => {
                // Return false for directories, true for files
                return Promise.resolve(filePath !== contextDir);
            });

            const sections = await loader.load([contextDir]);

            // Should add context.md content to main section
            expect(sections[0].title).toBe('Test Context');
            expect(sections[0].items[0].text).toBe('This is test context content');

            // Should add file1.md as a subsection, but not context.md again
            expect(sections[0].items.length).toBe(2);
            expect(sections[0].items[1].title).toBe('File 1');
        });
    });

    it('should ignore files matching ignore patterns', async () => {
        const contextDir = '/test/context';
        const ignorePattern = '\\.ignored\\.md';

        // Mock exists to return false for context.md
        // @ts-ignore
        mockExists.mockImplementation((filePath: string) => {
            return Promise.resolve(filePath !== path.join(contextDir, 'context.md'));
        });

        // Mock isDirectory to return true for directory paths
        // @ts-ignore
        mockIsDirectory.mockImplementation((dirPath: string) => {
            return Promise.resolve(dirPath === contextDir);
        });

        // @ts-ignore
        mockListFiles.mockResolvedValue(['file1.md', 'file2.ignored.md', 'file3.md']);
        // @ts-ignore
        mockIsFile.mockImplementation((filePath: string) => {
            // Return false for directories, true for files
            return Promise.resolve(filePath !== contextDir);
        });

        // Mock readFile to return content for the files
        // @ts-ignore
        mockReadFile.mockImplementation((filePath: string) => {
            if (filePath.includes('file1.md')) {
                return Promise.resolve('# File 1\nContent of file 1');
            }
            if (filePath.includes('file2.ignored.md')) {
                return Promise.resolve('# Ignored File\nContent of ignored file');
            }
            if (filePath.includes('file3.md')) {
                return Promise.resolve('# File 3\nContent of file 3');
            }
            return Promise.resolve('');
        });

        // Create loader instance with mock logger and ignore pattern
        const mockLogger = { ...DEFAULT_LOGGER, debug: vi.fn(), error: vi.fn() };
        const loaderWithIgnore = loaderModule.create({ logger: mockLogger, ignorePatterns: [ignorePattern] });

        const sections = await loaderWithIgnore.load([contextDir]);

        // Directory section itself
        expect(sections.length).toBe(1);
        expect(sections[0].title).toBe('context');

        // Check that the ignored file is not present
        expect(sections[0].items.length).toBe(2); // Only file1.md and file3.md
        const loadedFiles = sections[0].items.map((item: Section<any>) => item.title);
        expect(loadedFiles).toContain('File 1');
        expect(loadedFiles).toContain('File 3');
        expect(loadedFiles).not.toContain('Ignored File');
        expect(loadedFiles).not.toContain('file2.ignored.md');
    });

});
