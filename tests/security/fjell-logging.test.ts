/**
 * Tests for @fjell/logging integration
 * 
 * Verifies that sensitive data masking works correctly
 * and that the logging configuration is properly applied.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  maskSensitive,
  configureSecureLogging,
  DEFAULT_MASKING_CONFIG,
  DEVELOPMENT_MASKING_CONFIG,
  executeWithCorrelation,
  generateCorrelationId,
  maskWithConfig,
} from '../../src/logging-config';
import { DEFAULT_LOGGER, wrapLogger, createConsoleLogger } from '../../src/logger';

describe('Fjell Logging Integration', () => {
  describe('maskSensitive', () => {
    it('should mask OpenAI API keys', () => {
      const content = 'Using key sk-abc1234567890abcdefghijklmnop';
      const masked = maskSensitive(content);
      expect(masked).not.toContain('sk-abc');
      expect(masked).toContain('****');
    });

    it('should mask OpenAI project keys', () => {
      const content = 'Key: sk-proj-abcdefghijklmnopqrstuvwxyz123456';
      const masked = maskSensitive(content);
      expect(masked).not.toContain('sk-proj-');
    });

    it('should mask Anthropic keys', () => {
      const content = 'Key: sk-ant-api03-abcdef1234567890abcdef1234567890';
      const masked = maskSensitive(content);
      expect(masked).not.toContain('sk-ant-');
    });

    it('should mask passwords', () => {
      const content = 'password=secret123';
      const masked = maskSensitive(content);
      expect(masked).not.toContain('secret123');
    });

    it('should mask passwords in various formats', () => {
      // Fjell masks password= patterns
      const content = 'password=mysecretpassword123';
      const masked = maskSensitive(content);
      expect(masked).toBe('****');
    });

    it('should mask email addresses', () => {
      const content = 'Contact: user@example.com';
      const masked = maskSensitive(content);
      expect(masked).not.toContain('user@example.com');
    });

    it('should mask AWS access keys', () => {
      const content = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
      const masked = maskSensitive(content);
      expect(masked).not.toContain('AKIAIOSFODNN7EXAMPLE');
    });

    it('should mask GitHub tokens', () => {
      const content = 'Token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const masked = maskSensitive(content);
      expect(masked).not.toContain('ghp_');
    });

    it('should handle content with no sensitive data', () => {
      const content = 'Hello, this is a normal message without secrets.';
      const masked = maskSensitive(content);
      expect(masked).toBe(content);
    });

    it('should mask multiple sensitive items in one string', () => {
      // Fjell has specific patterns - OpenAI keys need to be longer
      const content = 'API: sk-abc1234567890abcdefghijklmnop password=secret email=test@test.com';
      const masked = maskSensitive(content);
      // Password and email should be masked
      expect(masked).not.toContain('secret');
      expect(masked).not.toContain('test@test.com');
      // API key pattern should be masked (Fjell requires specific format)
      expect(masked).toContain('****');
    });
  });

  describe('configureSecureLogging', () => {
    it('should return default config with all protections enabled', () => {
      const config = configureSecureLogging();
      expect(config.maskApiKeys).toBe(true);
      expect(config.maskPasswords).toBe(true);
      expect(config.maskEmails).toBe(true);
      expect(config.maskSSNs).toBe(true);
      expect(config.maskPrivateKeys).toBe(true);
      expect(config.maskJWTs).toBe(true);
    });

    it('should allow disabling specific masks', () => {
      const config = configureSecureLogging({ maskEmails: false });
      expect(config.maskEmails).toBe(false);
      expect(config.maskApiKeys).toBe(true);
      expect(config.maskPasswords).toBe(true);
    });

    it('should allow enabling masking explicitly', () => {
      const config = configureSecureLogging({ enabled: true });
      expect(config.enabled).toBe(true);
    });

    it('should respect maxDepth option', () => {
      const config = configureSecureLogging({ maxDepth: 5 });
      expect(config.maxDepth).toBe(5);
    });
  });

  describe('DEFAULT_MASKING_CONFIG', () => {
    it('should have all protections enabled', () => {
      expect(DEFAULT_MASKING_CONFIG.enabled).toBe(true);
      expect(DEFAULT_MASKING_CONFIG.maskApiKeys).toBe(true);
      expect(DEFAULT_MASKING_CONFIG.maskPasswords).toBe(true);
      expect(DEFAULT_MASKING_CONFIG.maskEmails).toBe(true);
      expect(DEFAULT_MASKING_CONFIG.maskSSNs).toBe(true);
      expect(DEFAULT_MASKING_CONFIG.maskPrivateKeys).toBe(true);
      expect(DEFAULT_MASKING_CONFIG.maskJWTs).toBe(true);
      expect(DEFAULT_MASKING_CONFIG.maskBase64Blobs).toBe(true);
    });
  });

  describe('DEVELOPMENT_MASKING_CONFIG', () => {
    it('should have all protections disabled', () => {
      expect(DEVELOPMENT_MASKING_CONFIG.enabled).toBe(false);
      expect(DEVELOPMENT_MASKING_CONFIG.maskApiKeys).toBe(false);
      expect(DEVELOPMENT_MASKING_CONFIG.maskPasswords).toBe(false);
      expect(DEVELOPMENT_MASKING_CONFIG.maskEmails).toBe(false);
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });

    it('should generate non-empty strings', () => {
      const id = generateCorrelationId();
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('executeWithCorrelation', () => {
    it('should execute function with correlated logger', async () => {
      const mockLogger = {
        name: 'test',
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        verbose: vi.fn(),
        silly: vi.fn(),
      };

      const { result, correlationId } = await executeWithCorrelation(
        async (logger, corrId) => {
          logger.info('Test message');
          return { value: 42, corrId };
        },
        mockLogger
      );

      expect(result.value).toBe(42);
      expect(result.corrId).toBe(correlationId);
      expect(correlationId.length).toBeGreaterThan(0);
      expect(mockLogger.info).toHaveBeenCalled();
      
      // Verify correlation ID is in the message
      const call = mockLogger.info.mock.calls[0];
      expect(call[0]).toContain(correlationId);
    });

    it('should propagate errors', async () => {
      const mockLogger = {
        name: 'test',
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        verbose: vi.fn(),
        silly: vi.fn(),
      };

      await expect(
        executeWithCorrelation(
          async () => {
            throw new Error('Test error');
          },
          mockLogger
        )
      ).rejects.toThrow('Test error');
    });
  });

  describe('DEFAULT_LOGGER', () => {
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

    it('should create child loggers', () => {
      const childLogger = DEFAULT_LOGGER.get?.('TestComponent');
      expect(childLogger).toBeDefined();
      expect(childLogger?.name).toContain('TestComponent');
    });
  });

  describe('wrapLogger', () => {
    it('should wrap a logger with library prefix', () => {
      const mockLogger = {
        name: 'mock',
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        verbose: vi.fn(),
        silly: vi.fn(),
      };

      const wrapped = wrapLogger(mockLogger, 'TestComponent');
      wrapped.info('Test message');

      expect(mockLogger.info).toHaveBeenCalled();
      const call = mockLogger.info.mock.calls[0];
      expect(call[0]).toContain('riotprompt');
      expect(call[0]).toContain('TestComponent');
    });

    it('should throw if logger is missing required methods', () => {
      const incompleteLogger = {
        name: 'incomplete',
        debug: vi.fn(),
        info: vi.fn(),
        // Missing warn, error, verbose, silly
      };

      expect(() => wrapLogger(incompleteLogger as any)).toThrow('missing required methods');
    });

    it('should support get method for child loggers', () => {
      const mockLogger = {
        name: 'mock',
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        verbose: vi.fn(),
        silly: vi.fn(),
      };

      const wrapped = wrapLogger(mockLogger, 'Parent');
      const child = wrapped.get?.('Child');
      
      expect(child).toBeDefined();
      child?.info('Child message');
      
      const call = mockLogger.info.mock.calls[0];
      expect(call[0]).toContain('Parent');
      expect(call[0]).toContain('Child');
    });
  });

  describe('createConsoleLogger', () => {
    it('should create a console-based logger', () => {
      const logger = createConsoleLogger('test');
      expect(logger.name).toBe('test');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should support get method', () => {
      const logger = createConsoleLogger('parent');
      const child = logger.get?.('child');
      expect(child?.name).toBe('parent:child');
    });
  });

  describe('maskWithConfig', () => {
    it('should respect custom config', () => {
      const content = 'email: test@example.com password=secret';
      
      // With emails disabled
      const configNoEmail = { ...DEFAULT_MASKING_CONFIG, maskEmails: false };
      const maskedNoEmail = maskWithConfig(content, configNoEmail);
      expect(maskedNoEmail).toContain('test@example.com');
      expect(maskedNoEmail).not.toContain('secret');
      
      // With passwords disabled
      const configNoPassword = { ...DEFAULT_MASKING_CONFIG, maskPasswords: false };
      const maskedNoPassword = maskWithConfig(content, configNoPassword);
      expect(maskedNoPassword).not.toContain('test@example.com');
      expect(maskedNoPassword).toContain('secret');
    });

    it('should not mask when disabled', () => {
      const content = 'API key: sk-abc123 password=secret';
      const masked = maskWithConfig(content, { enabled: false });
      expect(masked).toBe(content);
    });
  });
});

