import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, DEFAULT_LOGGER, wrapLogger } from '../src/logger';
import { LIBRARY_NAME } from '../src/constants';

describe('Logger', () => {
    describe('DEFAULT_LOGGER', () => {
        // Save original console methods
        const originalConsole = {
            debug: console.debug,
            info: console.info,
            warn: console.warn,
            error: console.error,
            log: console.log
        };

        beforeEach(() => {
            // Mock console methods
            console.debug = vi.fn();
            console.info = vi.fn();
            console.warn = vi.fn();
            console.error = vi.fn();
            console.log = vi.fn();
        });

        afterEach(() => {
            // Restore original console methods
            console.debug = originalConsole.debug;
            console.info = originalConsole.info;
            console.warn = originalConsole.warn;
            console.error = originalConsole.error;
            console.log = originalConsole.log;
        });

        it('debug should call console.debug', () => {
            DEFAULT_LOGGER.debug('test message', { data: 'test' });
            expect(console.debug).toHaveBeenCalledWith('test message', { data: 'test' });
        });

        it('info should call console.info', () => {
            DEFAULT_LOGGER.info('test message', { data: 'test' });
            expect(console.info).toHaveBeenCalledWith('test message', { data: 'test' });
        });

        it('warn should call console.warn', () => {
            DEFAULT_LOGGER.warn('test message', { data: 'test' });
            expect(console.warn).toHaveBeenCalledWith('test message', { data: 'test' });
        });

        it('error should call console.error', () => {
            DEFAULT_LOGGER.error('test message', { data: 'test' });
            expect(console.error).toHaveBeenCalledWith('test message', { data: 'test' });
        });

        it('verbose should call console.log', () => {
            DEFAULT_LOGGER.verbose('test message', { data: 'test' });
            expect(console.log).not.toHaveBeenCalledWith('test message', { data: 'test' });
        });

        it('silly should call console.log', () => {
            DEFAULT_LOGGER.silly('test message', { data: 'test' });
            expect(console.log).not.toHaveBeenCalledWith('test message', { data: 'test' });
        });
    });

    describe('wrapLogger', () => {
        const mockLogger: Logger = {
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
    });

    describe('wrapLogger with name', () => {
        const mockLogger: Logger = {
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
});
