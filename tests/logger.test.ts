import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger, DEFAULT_LOGGER, wrapLogger, createConsoleLogger } from '../src/logger';
import { LIBRARY_NAME } from '../src/constants';

describe('Logger', () => {
    describe('DEFAULT_LOGGER', () => {
        // DEFAULT_LOGGER now uses @fjell/logging, so we test the interface
        // rather than console method calls directly

        it('should have all required methods', () => {
            expect(typeof DEFAULT_LOGGER.debug).toBe('function');
            expect(typeof DEFAULT_LOGGER.info).toBe('function');
            expect(typeof DEFAULT_LOGGER.warn).toBe('function');
            expect(typeof DEFAULT_LOGGER.error).toBe('function');
            expect(typeof DEFAULT_LOGGER.verbose).toBe('function');
            expect(typeof DEFAULT_LOGGER.silly).toBe('function');
        });

        it('should have get method for child loggers', () => {
            expect(typeof DEFAULT_LOGGER.get).toBe('function');
        });

        it('should create child loggers with get()', () => {
            const childLogger = DEFAULT_LOGGER.get?.('TestComponent');
            expect(childLogger).toBeDefined();
            expect(childLogger?.name).toContain('TestComponent');
        });

        it('should create nested child loggers', () => {
            const childLogger = DEFAULT_LOGGER.get?.('Parent', 'Child');
            expect(childLogger).toBeDefined();
            expect(childLogger?.name).toContain('Parent');
            expect(childLogger?.name).toContain('Child');
        });

        it('debug should not throw', () => {
            expect(() => DEFAULT_LOGGER.debug('test message', { data: 'test' })).not.toThrow();
        });

        it('info should not throw', () => {
            expect(() => DEFAULT_LOGGER.info('test message', { data: 'test' })).not.toThrow();
        });

        it('warn should not throw', () => {
            expect(() => DEFAULT_LOGGER.warn('test message', { data: 'test' })).not.toThrow();
        });

        it('error should not throw', () => {
            expect(() => DEFAULT_LOGGER.error('test message', { data: 'test' })).not.toThrow();
        });

        it('verbose should not throw', () => {
            expect(() => DEFAULT_LOGGER.verbose('test message', { data: 'test' })).not.toThrow();
        });

        it('silly should not throw', () => {
            expect(() => DEFAULT_LOGGER.silly('test message', { data: 'test' })).not.toThrow();
        });
    });

    describe('wrapLogger', () => {
        const mockLogger: Logger = {
            name: 'mock',
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            verbose: vi.fn(),
            silly: vi.fn()
        };

        const wrappedLogger = wrapLogger(mockLogger);

        beforeEach(() => {
            // Reset mock calls before each test
            vi.clearAllMocks();
        });

        it('debug should prepend library name to message', () => {
            wrappedLogger.debug('test message', { data: 'test' });
            expect(mockLogger.debug).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : test message`, { data: 'test' });
        });

        it('info should prepend library name to message', () => {
            wrappedLogger.info('test message', { data: 'test' });
            expect(mockLogger.info).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : test message`, { data: 'test' });
        });

        it('warn should prepend library name to message', () => {
            wrappedLogger.warn('test message', { data: 'test' });
            expect(mockLogger.warn).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : test message`, { data: 'test' });
        });

        it('error should prepend library name to message', () => {
            wrappedLogger.error('test message', { data: 'test' });
            expect(mockLogger.error).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : test message`, { data: 'test' });
        });

        it('verbose should prepend library name to message', () => {
            wrappedLogger.verbose('test message', { data: 'test' });
            expect(mockLogger.verbose).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : test message`, { data: 'test' });
        });

        it('silly should prepend library name to message', () => {
            wrappedLogger.silly('test message', { data: 'test' });
            expect(mockLogger.silly).toHaveBeenCalledWith(`[${LIBRARY_NAME}] : test message`, { data: 'test' });
        });

        it('should support get method for child loggers', () => {
            const child = wrappedLogger.get?.('Child');
            expect(child).toBeDefined();
            child?.info('child message');
            expect(mockLogger.info).toHaveBeenCalled();
        });
    });

    describe('wrapLogger with name', () => {
        const mockLogger: Logger = {
            name: 'mock',
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            verbose: vi.fn(),
            silly: vi.fn()
        };

        const componentName = 'TestComponent';
        const wrappedLogger = wrapLogger(mockLogger, componentName);

        beforeEach(() => {
            // Reset mock calls before each test
            vi.clearAllMocks();
        });

        it('debug should prepend library name and component name to message', () => {
            wrappedLogger.debug('test message', { data: 'test' });
            expect(mockLogger.debug).toHaveBeenCalledWith(`[${LIBRARY_NAME}] [${componentName}]: test message`, { data: 'test' });
        });

        it('info should prepend library name and component name to message', () => {
            wrappedLogger.info('test message', { data: 'test' });
            expect(mockLogger.info).toHaveBeenCalledWith(`[${LIBRARY_NAME}] [${componentName}]: test message`, { data: 'test' });
        });

        it('warn should prepend library name and component name to message', () => {
            wrappedLogger.warn('test message', { data: 'test' });
            expect(mockLogger.warn).toHaveBeenCalledWith(`[${LIBRARY_NAME}] [${componentName}]: test message`, { data: 'test' });
        });

        it('error should prepend library name and component name to message', () => {
            wrappedLogger.error('test message', { data: 'test' });
            expect(mockLogger.error).toHaveBeenCalledWith(`[${LIBRARY_NAME}] [${componentName}]: test message`, { data: 'test' });
        });

        it('verbose should prepend library name and component name to message', () => {
            wrappedLogger.verbose('test message', { data: 'test' });
            expect(mockLogger.verbose).toHaveBeenCalledWith(`[${LIBRARY_NAME}] [${componentName}]: test message`, { data: 'test' });
        });

        it('silly should prepend library name and component name to message', () => {
            wrappedLogger.silly('test message', { data: 'test' });
            expect(mockLogger.silly).toHaveBeenCalledWith(`[${LIBRARY_NAME}] [${componentName}]: test message`, { data: 'test' });
        });
    });

    describe('wrapLogger validation', () => {
        it('should throw if logger is missing required methods', () => {
            const incompleteLogger = {
                name: 'incomplete',
                debug: vi.fn(),
                info: vi.fn(),
                // Missing warn, error, verbose, silly
            };

            expect(() => wrapLogger(incompleteLogger as any)).toThrow('missing required methods');
        });

        it('should list missing methods in error message', () => {
            const incompleteLogger = {
                name: 'incomplete',
                debug: vi.fn(),
                info: vi.fn(),
            };

            expect(() => wrapLogger(incompleteLogger as any)).toThrow('warn');
            expect(() => wrapLogger(incompleteLogger as any)).toThrow('error');
        });
    });

    describe('createConsoleLogger', () => {
        it('should create a logger with the given name', () => {
            const logger = createConsoleLogger('test');
            expect(logger.name).toBe('test');
        });

        it('should have all required methods', () => {
            const logger = createConsoleLogger('test');
            expect(typeof logger.debug).toBe('function');
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.verbose).toBe('function');
            expect(typeof logger.silly).toBe('function');
        });

        it('should support get method for child loggers', () => {
            const logger = createConsoleLogger('parent');
            const child = logger.get?.('child');
            expect(child?.name).toBe('parent:child');
        });

        it('should use default name if not provided', () => {
            const logger = createConsoleLogger();
            expect(logger.name).toBe('console');
        });
    });
});
