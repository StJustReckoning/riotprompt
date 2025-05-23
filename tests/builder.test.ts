/**
 * @vitest-environment node
 */

// @ts-nocheck - Disable type checking for this file to work around Jest ESM mock limitations
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { stringifyJSON } from '../src/util/general';
// Mock Zod
vi.mock('zod', () => {
    return {
        z: {
            object: vi.fn().mockReturnThis(),
            string: vi.fn().mockReturnThis(),
            boolean: vi.fn().mockReturnThis(),
            optional: vi.fn().mockReturnThis(),
            default: vi.fn().mockReturnThis(),
            function: vi.fn().mockReturnThis(),
            tuple: vi.fn().mockReturnThis(),
            any: vi.fn().mockReturnThis(),
            void: vi.fn().mockReturnThis(),
            rest: vi.fn().mockReturnThis(),
            infer: vi.fn().mockReturnThis(),
            parse: vi.fn().mockImplementation((obj) => obj),
            number: vi.fn().mockReturnThis(),
            union: vi.fn().mockReturnThis(),
            array: vi.fn().mockReturnThis(),
            record: vi.fn().mockReturnThis(),
        }
    };
});

// Mock path module to fix caching issues
vi.mock('path', async () => {
    const originalModule = await vi.importActual<typeof import('path')>('path');
    return {
        ...originalModule,
        default: {
            ...originalModule,
            join: vi.fn((...args) => args.join('/'))
        },
        join: vi.fn((...args) => args.join('/')) // Also keep named export for compatibility if used elsewhere
    };
});

// Import path after mocking
import path from 'path';

// Mock modules before importing
vi.mock('../src/logger', () => {
    const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        verbose: vi.fn(),
        silly: vi.fn()
    };

    const mockWrapLogger = vi.fn().mockImplementation(() => mockLogger);

    // Add the missing LoggerSchema that builder.ts imports
    const mockLoggerSchema = {
        parse: vi.fn().mockReturnValue(mockLogger),
        optional: vi.fn().mockReturnThis(),
        default: vi.fn().mockReturnThis()
    };

    return {
        DEFAULT_LOGGER: mockLogger,
        wrapLogger: mockWrapLogger,
        Logger: mockLogger,
        LoggerSchema: mockLoggerSchema
    };
});

const mockSection = { add: vi.fn().mockReturnThis() };

const mockCreateSection = vi.fn().mockReturnValue(mockSection);

const mockParser = {
    parse: vi.fn().mockReturnValue(mockSection),
    parseFile: vi.fn().mockResolvedValue(mockSection)
};

const mockOverride = {
    customize: vi.fn().mockImplementation((_, section) => Promise.resolve(section))
};

const mockLoader = {
    load: vi.fn().mockResolvedValue([mockSection])
};

const mockCreatePrompt = vi.fn().mockReturnValue({
    toString: vi.fn().mockReturnValue('Mock Prompt Content')
});

const mockStringifyJSON = vi.fn(obj => JSON.stringify(obj)); // Define a stable mock function here

// Mock minorPrompt imports but don't mock the builder module itself
vi.mock('../src/minorPrompt', () => {
    return {
        createSection: mockCreateSection,
        Parser: {
            create: vi.fn().mockReturnValue(mockParser)
        },
        Override: {
            create: vi.fn().mockReturnValue(mockOverride)
        },
        Loader: {
            create: vi.fn().mockReturnValue(mockLoader)
        },
        createPrompt: mockCreatePrompt
    };
});

// Mock util/general
vi.mock('../src/util/general', () => {
    return {
        stringifyJSON: mockStringifyJSON // Use the stable mock function
    };
});

let loggerModule;
let minorPromptModule;
let builder;

describe('Builder', () => {
    beforeEach(async () => {
        // Import modules after mocking
        loggerModule = await import('../src/logger');
        minorPromptModule = await import('../src/minorPrompt');

        // Import the actual builder module, not a mock
        builder = await import('../src/builder');

        vi.clearAllMocks();
    });

    test('create returns an instance with all expected methods', () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });

        expect(instance).toHaveProperty('addPersonaPath');
        expect(instance).toHaveProperty('addContextPath');
        expect(instance).toHaveProperty('addInstructionPath');
        expect(instance).toHaveProperty('addContentPath');
        expect(instance).toHaveProperty('addContent');
        expect(instance).toHaveProperty('addContext');
        expect(instance).toHaveProperty('loadContext');
        expect(instance).toHaveProperty('loadContent');
        expect(instance).toHaveProperty('build');
    });

    test('create sets up logger, parser, override, and loader with correct options', () => {
        const options = {
            logger: { custom: true, debug: vi.fn() },
            basePath: './custom-path',
            overridePath: './overrides',
            overrides: true,
        };

        builder.create(options);

        const { wrapLogger } = loggerModule;
        const { Parser, Override, Loader } = minorPromptModule;

        expect(wrapLogger).toHaveBeenCalledWith(options.logger, 'Builder');
        expect(Parser.create).toHaveBeenCalledWith({
            logger: expect.any(Object),
        });
        expect(Override.create).toHaveBeenCalledWith({
            logger: expect.any(Object),
            configDir: options.overridePath,
            overrides: options.overrides
        });
        expect(Loader.create).toHaveBeenCalledWith({
            logger: expect.any(Object),
        });
    });

    test('addPersonaPath loads and adds persona section', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const contentPath = 'persona/default.md';

        await instance.addPersonaPath(contentPath);

        expect(mockParser.parseFile).toHaveBeenCalledWith('./prompts/persona/default.md', { parameters: {} });
        expect(mockOverride.customize).toHaveBeenCalled();
        expect(mockSection.add).toHaveBeenCalled();
    });

    test('addContextPath loads and adds context section', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const contentPath = 'context/default.md';

        await instance.addContextPath(contentPath);

        expect(mockParser.parseFile).toHaveBeenCalledWith('./prompts/context/default.md', { parameters: {} });
        expect(mockOverride.customize).toHaveBeenCalled();
        expect(mockSection.add).toHaveBeenCalled();
    });

    test('addInstructionPath loads and adds instruction section', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const contentPath = 'instructions/default.md';

        await instance.addInstructionPath(contentPath);

        expect(mockParser.parseFile).toHaveBeenCalledWith('./prompts/instructions/default.md', { parameters: {} });
        expect(mockOverride.customize).toHaveBeenCalled();
        expect(mockSection.add).toHaveBeenCalled();
    });

    test('addContentPath loads and adds content section', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const contentPath = 'content/default.md';

        await instance.addContentPath(contentPath);

        expect(mockParser.parseFile).toHaveBeenCalledWith('./prompts/content/default.md', { parameters: {} });
        expect(mockOverride.customize).toHaveBeenCalled();
        expect(mockSection.add).toHaveBeenCalled();
    });

    test('addContent parses and adds content string', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const content = 'Content string';

        await instance.addContent(content);

        expect(mockParser.parse).toHaveBeenCalledWith(content, { parameters: {} });
        expect(mockSection.add).toHaveBeenCalled();
    });

    test('addContext parses and adds context string', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const context = 'Context string';

        await instance.addContext(context);

        expect(mockParser.parse).toHaveBeenCalledWith(context, { parameters: {} });
        expect(mockSection.add).toHaveBeenCalled();
    });

    test('loadContext loads directories and adds context sections', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const directories = ['context1', 'context2'];

        await instance.loadContext(directories);

        expect(mockLoader.load).toHaveBeenCalledWith(directories, { parameters: {} });
        expect(mockSection.add).toHaveBeenCalled();
    });

    test('loadContent loads directories and adds content sections', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const directories = ['content1', 'content2'];

        await instance.loadContent(directories);

        expect(mockLoader.load).toHaveBeenCalledWith(directories, { parameters: {} });
        expect(mockSection.add).toHaveBeenCalled();
    });

    test('build creates and returns a prompt', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });

        const prompt = await instance.build();

        expect(mockCreatePrompt).toHaveBeenCalled();
        expect(prompt).toEqual(expect.objectContaining({
            toString: expect.any(Function)
        }));
    });

    test('complete flow works correctly', async () => {
        const instance = builder.create({
            basePath: './prompts',
            overrides: true,
            parameters: { model: 'gpt-4' }
        });

        await instance.addPersonaPath('persona/default.md');
        await instance.addContextPath('context/default.md');
        await instance.addInstructionPath('instructions/default.md');
        await instance.addContentPath('content/default.md');
        await instance.addContent('Additional content');
        await instance.addContext('Additional context');

        const prompt = await instance.build();

        expect(mockCreatePrompt).toHaveBeenCalled();
        expect(prompt).toEqual(expect.objectContaining({
            toString: expect.any(Function)
        }));
    });

    test('parameters are correctly merged when provided in method options', async () => {
        const globalParams = { model: 'gpt-4', temperature: 0.7 };
        const instance = builder.create({
            basePath: './prompts',
            overrides: false,
            parameters: globalParams
        });

        const methodParams = { temperature: 0.9, topP: 0.95 };
        await instance.addPersonaPath('persona/default.md', { parameters: methodParams });

        // The merged parameters should contain both global params and method params,
        // with method params taking precedence for duplicate keys
        const expectedMergedParams = {
            model: 'gpt-4', // from global
            temperature: 0.9, // from method (overrides global)
            topP: 0.95 // from method (not in global)
        };

        expect(mockParser.parseFile).toHaveBeenCalledWith(
            './prompts/persona/default.md',
            expect.objectContaining({
                parameters: expectedMergedParams
            })
        );
    });

    test('addContent handles Buffer input correctly', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const contentBuffer = Buffer.from('Buffer content');

        await instance.addContent(contentBuffer);

        expect(mockParser.parse).toHaveBeenCalledWith(contentBuffer, { parameters: {} });
        expect(mockSection.add).toHaveBeenCalled();
    });

    test('addContext handles Buffer input correctly', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const contextBuffer = Buffer.from('Buffer context');

        await instance.addContext(contextBuffer);

        expect(mockParser.parse).toHaveBeenCalledWith(contextBuffer, { parameters: {} });
        expect(mockSection.add).toHaveBeenCalled();
    });

    test('error in parseFile is properly propagated', async () => {
        mockParser.parseFile.mockRejectedValueOnce(new Error('File not found'));

        const instance = builder.create({ basePath: './prompts', overrides: false });

        await expect(instance.addPersonaPath('non-existent-file.md'))
            .rejects.toThrow('File not found');
    });

    test('error in override.customize is properly propagated', async () => {
        mockOverride.customize.mockRejectedValueOnce(new Error('Override failed'));

        const instance = builder.create({ basePath: './prompts', overrides: true });

        await expect(instance.addContextPath('context/default.md'))
            .rejects.toThrow('Override failed');
    });

    test('loadContext with empty array returns instance without calling loader', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });

        const result = await instance.loadContext([]);

        expect(result).toBe(instance);
        expect(mockLoader.load).toHaveBeenCalledWith([], { parameters: {} });
    });

    test('create with just basePath uses defaults for other options', () => {
        const instance = builder.create({ basePath: './prompts' });

        // Check if default options are used
        const { Override } = minorPromptModule;

        expect(Override.create).toHaveBeenCalledWith(expect.objectContaining({
            overrides: false,
            configDir: './'
        }));
    });

    test('builder passes custom section options to parser', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });
        const contentPath = 'content/default.md';
        const customOptions = {
            title: 'Custom Title',
            weight: 2.5,
            itemWeight: 1.5,
            parameters: { custom: 'param' }
        };

        await instance.addContentPath(contentPath, customOptions);

        expect(mockParser.parseFile).toHaveBeenCalledWith(
            './prompts/content/default.md',
            expect.objectContaining(customOptions)
        );
    });

    test('createPrompt is called with all sections', async () => {
        const instance = builder.create({ basePath: './prompts', overrides: false });

        await instance.build();

        expect(mockCreatePrompt).toHaveBeenCalledWith({
            persona: expect.any(Object),
            contexts: expect.any(Object),
            instructions: expect.any(Object),
            contents: expect.any(Object)
        });
    });
});
