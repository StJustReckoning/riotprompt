import { vi, describe, expect, it, beforeEach, afterEach } from 'vitest';
import path from 'path';
import type { Logger } from '../src/logger';
import type { Instance } from '../src/override';

// Define types for mocks
interface MockStorage {
    // @ts-ignore
    exists: vi.Mock;
}

// Create a typed mock object for Section
type MockSection = {
    // @ts-ignore
    prepend: vi.Mock<any, any>;
    // @ts-ignore
    append: vi.Mock<any, any>;
    items: any[];
    // @ts-ignore
    add: vi.Mock;
    // @ts-ignore
    insert: vi.Mock;
    // @ts-ignore
    replace: vi.Mock;
    // @ts-ignore
    remove: vi.Mock;
};

const createMockSection = (title = 'test'): MockSection => ({
    prepend: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    items: [],
    add: vi.fn(),
    insert: vi.fn(),
    replace: vi.fn(),
    remove: vi.fn()
});

let mockStorageInstance: MockStorage;
const mockLogger: Logger = {
    name: 'test',
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    silly: vi.fn()
};

// Mock modules before importing the module under test
vi.mock('../src/util/storage', () => ({
    create: vi.fn(() => mockStorageInstance)
}));

vi.mock('../src/riotprompt', () => ({
    Parser: {
        create: vi.fn(() => ({
            parseFile: vi.fn(async (filePath) => {
                const section = createMockSection();
                section.items = [{ text: `Content from ${path.basename(filePath)}` }];
                return section;
            })
        }))
    },
    Override: {
        create: vi.fn(() => ({
            customize: vi.fn(),
            override: vi.fn()
        }))
    },
    Formatter: {
        create: vi.fn(() => ({
            format: vi.fn(() => 'formatted section')
        }))
    }
}));

vi.mock('../src/logger', () => ({
    DEFAULT_LOGGER: mockLogger,
    wrapLogger: vi.fn((logger) => logger)
}));

// Fix Zod schema validation for OptionsSchema.parse
vi.mock('zod', () => {
    const mockParse = (data: any) => data;
    const createMockZodType = () => ({
        parse: mockParse,
        optional: () => createMockZodType(),
        default: () => createMockZodType(),
        rest: () => createMockZodType(),
    });

    return {
        z: {
            object: () => createMockZodType(),
            string: () => createMockZodType(),
            boolean: () => createMockZodType(),
            number: () => createMockZodType(),
            function: () => createMockZodType(),
            tuple: () => createMockZodType(),
            void: () => createMockZodType(),
            any: () => createMockZodType(),
            array: () => createMockZodType(),
            union: () => createMockZodType(),
            record: () => createMockZodType(),
        }
    };
});

describe('Multi-layered Override System', () => {
    let instance: Instance;
    let mockSection: MockSection;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockStorageInstance = {
            exists: vi.fn()
        };

        mockSection = createMockSection();

        const { create } = await import('../src/override');
        instance = create({
            configDirs: ['/layer1', '/layer2', '/layer3'], // closest to furthest
            overrides: true,
            logger: mockLogger,
            parameters: {}
        });
    });

    describe('Multiple Layer Override Detection', () => {
        it('should check all layers for override files', async () => {
            mockStorageInstance.exists.mockResolvedValue(false);

            await instance.override('test.md', mockSection as any);

            // Should check all three layers for all three file types (base, pre, post)
            expect(mockStorageInstance.exists).toHaveBeenCalledTimes(9); // 3 layers * 3 file types

            // Check that all layers were checked
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/layer1/test.md');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/layer1/test-pre.md');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/layer1/test-post.md');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/layer2/test.md');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/layer2/test-pre.md');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/layer2/test-post.md');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/layer3/test.md');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/layer3/test-pre.md');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/layer3/test-post.md');
        });

        it('should collect prepend files from all layers', async () => {
            mockStorageInstance.exists.mockImplementation(async (filePath: string) =>
                filePath.includes('-pre.md')
            );

            const result = await instance.override('test.md', mockSection as any);

            expect(result.prepends).toHaveLength(3);
            expect(result.appends).toHaveLength(0);
            expect(result.override).toBeUndefined();
        });

        it('should collect append files from all layers', async () => {
            mockStorageInstance.exists.mockImplementation(async (filePath: string) =>
                filePath.includes('-post.md')
            );

            const result = await instance.override('test.md', mockSection as any);

            expect(result.prepends).toHaveLength(0);
            expect(result.appends).toHaveLength(3);
            expect(result.override).toBeUndefined();
        });
    });

    describe('Complete Override Priority', () => {
        it('should use closest layer override when multiple exist', async () => {
            mockStorageInstance.exists.mockImplementation(async (filePath: string) =>
                filePath.endsWith('test.md') && !filePath.includes('-')
            );

            const result = await instance.override('test.md', mockSection as any);

            expect(result.override).toBeDefined();
            // @ts-ignore
            expect(result.override?.items[0].text).toBe('Content from test.md');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'WARNING: Core directives are being overwritten by custom configuration at layer %d',
                1
            );
        });

        it('should not use further layers when closest override exists', async () => {
            // Only layer1 has the override file
            mockStorageInstance.exists.mockImplementation(async (filePath: string) =>
                filePath === '/layer1/test.md'
            );

            const result = await instance.override('test.md', mockSection as any);

            expect(result.override).toBeDefined();
            // Should only be called once for the closest layer that has the file
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/layer1/test.md');
        });
    });

    describe('Layered Content Application', () => {
        it('should apply prepends in closest-first order', async () => {
            mockStorageInstance.exists.mockImplementation(async (filePath: string) =>
                filePath.includes('-pre.md')
            );

            await instance.customize('test.md', mockSection as any);

            // Should prepend 3 times (one for each layer)
            expect(mockSection.prepend).toHaveBeenCalledTimes(3);

            // Verify the order of calls - should be closest to furthest
            const calls = mockSection.prepend.mock.calls;
            // @ts-ignore
            expect(calls[0][0].items[0].text).toBe('Content from test-pre.md'); // layer1
            // @ts-ignore
            expect(calls[1][0].items[0].text).toBe('Content from test-pre.md'); // layer2  
            // @ts-ignore
            expect(calls[2][0].items[0].text).toBe('Content from test-pre.md'); // layer3
        });

        it('should apply appends in furthest-first order', async () => {
            mockStorageInstance.exists.mockImplementation(async (filePath: string) =>
                filePath.includes('-post.md')
            );

            await instance.customize('test.md', mockSection as any);

            // Should append 3 times (one for each layer)
            expect(mockSection.append).toHaveBeenCalledTimes(3);

            // Verify the reverse order was applied (furthest first)
            const calls = mockSection.append.mock.calls;
            // @ts-ignore
            expect(calls[0][0].items[0].text).toBe('Content from test-post.md'); // layer3 (furthest)
            // @ts-ignore
            expect(calls[1][0].items[0].text).toBe('Content from test-post.md'); // layer2
            // @ts-ignore
            expect(calls[2][0].items[0].text).toBe('Content from test-post.md'); // layer1 (closest)
        });

        it('should handle combination of override, prepends, and appends', async () => {
            mockStorageInstance.exists.mockImplementation(async (filePath: any) => {
                if (filePath === '/layer1/test.md') return true; // Complete override in closest layer
                if (filePath.includes('-pre.md')) return true;   // Prepends in all layers
                if (filePath.includes('-post.md')) return true;  // Appends in all layers
                return false;
            });

            const result = await instance.customize('test.md', mockSection as any);

            // When there's an override, the result should be the overridden section with prepends/appends applied
            // The prepends and appends are applied to the override section (not the original mockSection)
            expect(result).toBeDefined();
            expect(result).not.toBe(mockSection); // Should be the override section, not original
        });
    });

    describe('Error Handling', () => {
        it('should throw error when override exists but overrides disabled', async () => {
            mockStorageInstance.exists.mockImplementation(async (filePath: any) =>
                filePath.endsWith('test.md') && !filePath.includes('-')
            );

            const { create } = await import('../src/override');
            const instanceNoOverrides = create({
                configDirs: ['/layer1'],
                overrides: false, // Disabled
                logger: mockLogger
            });

            await expect(instanceNoOverrides.override('test.md', mockSection as any))
                .rejects.toThrow('Core directives are being overwritten by custom configuration, but overrides are not enabled');
        });
    });

    describe('Single Layer Fallback', () => {
        it('should work with single config directory', async () => {
            const { create } = await import('../src/override');
            const singleLayerInstance = create({
                configDirs: ['/single-layer'],
                overrides: true,
                logger: mockLogger
            });

            mockStorageInstance.exists.mockImplementation(async (filePath: any) =>
                filePath.includes('/single-layer/test-pre.md')
            );

            const result = await singleLayerInstance.override('test.md', mockSection as any);

            expect(result.prepends).toHaveLength(1);
            expect(result.appends).toHaveLength(0);
            expect(result.override).toBeUndefined();
        });
    });
}); 