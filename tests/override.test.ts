import { vi } from 'vitest';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import path from 'path';
import type { Logger } from '../src/logger';
import type { Options, Instance } from '../src/override';

// Define types for mocks
interface MockStorage {
    exists: vi.Mock;
}

// Create a typed mock object for Section
type MockSection = {
    // @ts-ignore
    prepend: vi.Mock<any, any>;
    // @ts-ignore
    append: vi.Mock<any, any>;
    items: any[];
    add: vi.Mock;
    insert: vi.Mock;
    replace: vi.Mock;
    remove: vi.Mock;
};

const mockSection: MockSection = {
    prepend: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    items: [],
    add: vi.fn(),
    insert: vi.fn(),
    replace: vi.fn(),
    remove: vi.fn()
};

let mockStorageInstance: MockStorage;
const mockLogger: Logger = {
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

vi.mock('../src/minorPrompt', () => ({
    Parser: {
        create: vi.fn(() => ({
            parseFile: vi.fn(async () => mockSection)
        }))
    },
    Formatter: {
        create: vi.fn(() => ({
            format: vi.fn(() => 'formatted section')
        }))
    }
}));

vi.mock('../src/logger', () => ({
    LoggerSchema: {
        _parse: vi.fn(),
        parse: vi.fn().mockReturnValue(mockLogger),
        optional: vi.fn().mockReturnValue({
            _parse: vi.fn(),
            default: vi.fn().mockReturnValue({
                _parse: vi.fn()
            })
        }),
        default: vi.fn().mockReturnThis(),
        __esModule: true
    },
    DEFAULT_LOGGER: mockLogger,
    wrapLogger: vi.fn((logger) => logger)
}));

vi.mock('../src/util/general', () => ({
    clean: vi.fn(obj => obj)
}));

// Remove the entire mock for the '../src/override' module since it conflicts with tests
// vi.mock('../src/override', () => {
//     // Create a mock version of the create function that skips Zod validation
//     const mockCreate = (options: Options): Instance => {
//         // ... existing mock implementation...
//     };
//
//     return {
//         create: mockCreate
//     };
// });

// Fix Zod schema validation for OptionsSchema.parse
vi.mock('zod', () => {
    // Create mock functions that return objects with parse methods
    const mockParse = (data: any) => data;

    // Function that returns an object that can be chained
    const createMockZodType = () => ({
        parse: mockParse,
        optional: () => createMockZodType(),
        default: () => createMockZodType(),
        rest: () => createMockZodType(),
    });

    // Create a mock object for Zod
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

// Import after mocking
interface ImportedModules {
    create: (options: Options) => Instance;
    Storage: any;
    minorprompt: any;
}

const importModules = async (): Promise<ImportedModules> => {
    const { create } = await import('../src/override');
    const Storage = await import('../src/util/storage');
    const minorprompt = await import('../src/minorPrompt');

    return { create, Storage, minorprompt };
};

describe('override.ts', () => {
    let instance: Instance;
    let modules: ImportedModules;

    beforeEach(async () => {
        // Reset all mocks
        vi.clearAllMocks();

        // Setup storage mock for each test
        mockStorageInstance = {
            exists: vi.fn()
        };

        // Import modules with fresh mocks
        modules = await importModules();

        // Create instance with default options
        instance = modules.create({
            configDir: '/test/config',
            overrides: false,
            logger: mockLogger,
            parameters: {}
        });
    });

    describe('override function', () => {
        it('should return empty object when no files exist', async () => {
            // @ts-ignore   
            mockStorageInstance.exists.mockResolvedValue(false);

            const result = await instance.override('test.md', mockSection as any);

            expect(result).toEqual({});
            expect(mockStorageInstance.exists).toHaveBeenCalledTimes(3);
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/test/config/test.md');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/test/config/test-pre.md');
            expect(mockStorageInstance.exists).toHaveBeenCalledWith('/test/config/test-post.md');
        });

        it('should return prepend section when pre file exists', async () => {
            mockStorageInstance.exists
                // @ts-ignore
                .mockImplementation(async (filePath) => filePath.includes('-pre.md'));

            const result = await instance.override('test.md', mockSection as any);

            expect(result).toHaveProperty('prepend', mockSection);
            expect(result).not.toHaveProperty('append');
            expect(result).not.toHaveProperty('override');
        });

        it('should return append section when post file exists', async () => {
            mockStorageInstance.exists
                // @ts-ignore
                .mockImplementation(async (filePath) => filePath.includes('-post.md'));

            const result = await instance.override('test.md', mockSection as any);

            expect(result).toHaveProperty('append', mockSection);
            expect(result).not.toHaveProperty('prepend');
            expect(result).not.toHaveProperty('override');
        });

        it('should throw error when base file exists but overrides disabled', async () => {
            mockStorageInstance.exists
                // @ts-ignore
                .mockImplementation(async (filePath) => !filePath.includes('-pre') && !filePath.includes('-post'));

            await expect(instance.override('test.md', mockSection as any))
                .rejects.toThrow('Core directives are being overwritten by custom configuration, but overrides are not enabled');
        });

        it('should return override section when base file exists and overrides enabled', async () => {
            mockStorageInstance.exists
                // @ts-ignore
                .mockImplementation(async (filePath) => !filePath.includes('-pre') && !filePath.includes('-post'));

            // Create new instance with overrides enabled
            const { create } = await import('../src/override');
            instance = create({
                configDir: '/test/config',
                overrides: true,
                logger: mockLogger
            });

            const result = await instance.override('test.md', mockSection as any);

            expect(result).toHaveProperty('override', mockSection);
            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('should return all sections when all files exist', async () => {
            // @ts-ignore
            mockStorageInstance.exists.mockResolvedValue(true);

            // Create new instance with overrides enabled
            const { create } = await import('../src/override');
            instance = create({
                configDir: '/test/config',
                overrides: true,
                logger: mockLogger
            });

            const result = await instance.override('test.md', mockSection as any);

            expect(result).toHaveProperty('prepend', mockSection);
            expect(result).toHaveProperty('append', mockSection);
            expect(result).toHaveProperty('override', mockSection);
        });
    });

    describe('customize function', () => {
        it('should return original section when no override files exist', async () => {
            // @ts-ignore
            mockStorageInstance.exists.mockResolvedValue(false);

            const result = await instance.customize('test.md', mockSection as any);

            expect(result).toBe(mockSection);
        });

        it('should throw error when base file exists but overrides disabled', async () => {
            mockStorageInstance.exists
                // @ts-ignore
                .mockImplementation(async (filePath) => !filePath.includes('-pre') && !filePath.includes('-post'));

            await expect(instance.customize('test.md', mockSection as any))
                .rejects.toThrow('Core directives are being overwritten by custom configuration, but overrides are not enabled');
        });

        it('should use override when base file exists and overrides enabled', async () => {
            mockStorageInstance.exists
                // @ts-ignore
                .mockImplementation(async (filePath) => !filePath.includes('-pre') && !filePath.includes('-post'));

            // Create new instance with overrides enabled
            const { create } = await import('../src/override');
            instance = create({
                configDir: '/test/config',
                overrides: true,
                logger: mockLogger
            });

            const result = await instance.customize('test.md', mockSection as any);

            expect(result).toBe(mockSection);
            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('should handle all file types together', async () => {
            // @ts-ignore
            mockStorageInstance.exists.mockResolvedValue(true);

            // Create new instance with overrides enabled
            const { create } = await import('../src/override');
            instance = create({
                configDir: '/test/config',
                overrides: true,
                logger: mockLogger
            });

            const result = await instance.customize('test.md', mockSection as any);

            expect(mockSection.prepend).toHaveBeenCalled();
            expect(mockSection.append).toHaveBeenCalled();
        });
    });
});
