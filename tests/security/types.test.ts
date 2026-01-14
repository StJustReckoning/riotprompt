import { describe, it, expect } from 'vitest';
import {
  SecurityConfigSchema,
  PathSecurityConfigSchema,
  ToolSecurityConfigSchema,
  SecretSecurityConfigSchema,
  LogSecurityConfigSchema,
  TimeoutConfigSchema,
  SECURE_DEFAULTS,
  PERMISSIVE_DEFAULTS,
  mergeSecurityConfig,
} from '../../src/security/index';

describe('SecurityConfig', () => {
  describe('PathSecurityConfigSchema', () => {
    it('should provide secure defaults', () => {
      const config = PathSecurityConfigSchema.parse({});
      expect(config.enabled).toBe(true);
      expect(config.allowAbsolute).toBe(false);
      expect(config.allowSymlinks).toBe(false);
      expect(config.denyPatterns).toContain('\\.\\.');
    });

    it('should allow custom configuration', () => {
      const config = PathSecurityConfigSchema.parse({
        enabled: false,
        basePaths: ['/safe/path'],
        allowAbsolute: true,
      });
      expect(config.enabled).toBe(false);
      expect(config.basePaths).toContain('/safe/path');
      expect(config.allowAbsolute).toBe(true);
    });
  });

  describe('ToolSecurityConfigSchema', () => {
    it('should provide secure defaults', () => {
      const config = ToolSecurityConfigSchema.parse({});
      expect(config.enabled).toBe(true);
      expect(config.validateParams).toBe(true);
      expect(config.sandboxExecution).toBe(false);
      expect(config.maxExecutionTime).toBe(30000);
      expect(config.maxConcurrentCalls).toBe(10);
    });

    it('should allow tool allowlists', () => {
      const config = ToolSecurityConfigSchema.parse({
        allowedTools: ['read_file', 'write_file'],
      });
      expect(config.allowedTools).toEqual(['read_file', 'write_file']);
    });
  });

  describe('SecretSecurityConfigSchema', () => {
    it('should provide secure defaults', () => {
      const config = SecretSecurityConfigSchema.parse({});
      expect(config.enabled).toBe(true);
      expect(config.redactInLogs).toBe(true);
      expect(config.redactInErrors).toBe(true);
      expect(config.patterns.length).toBeGreaterThan(0);
    });

    it('should allow custom patterns', () => {
      const customPattern = /my-secret-\d+/g;
      const config = SecretSecurityConfigSchema.parse({
        customPatterns: [customPattern],
      });
      expect(config.customPatterns).toContain(customPattern);
    });
  });

  describe('LogSecurityConfigSchema', () => {
    it('should provide secure defaults', () => {
      const config = LogSecurityConfigSchema.parse({});
      expect(config.enabled).toBe(true);
      expect(config.auditSecurityEvents).toBe(true);
      expect(config.sanitizeStackTraces).toBe(true);
      expect(config.maxContentLength).toBe(10000);
    });
  });

  describe('TimeoutConfigSchema', () => {
    it('should provide secure defaults', () => {
      const config = TimeoutConfigSchema.parse({});
      expect(config.enabled).toBe(true);
      expect(config.defaultTimeout).toBe(30000);
      expect(config.llmTimeout).toBe(120000);
      expect(config.toolTimeout).toBe(30000);
      expect(config.fileTimeout).toBe(5000);
    });
  });

  describe('SecurityConfigSchema', () => {
    it('should provide secure defaults', () => {
      const config = SecurityConfigSchema.parse({});
      expect(config.secrets.redactInLogs).toBe(true);
      expect(config.paths.enabled).toBe(true);
      expect(config.tools.validateParams).toBe(true);
      expect(config.logging.auditSecurityEvents).toBe(true);
      expect(config.timeouts.enabled).toBe(true);
    });

    it('should allow partial configuration', () => {
      const config = SecurityConfigSchema.parse({
        paths: { allowAbsolute: true },
      });
      expect(config.paths.allowAbsolute).toBe(true);
      expect(config.paths.enabled).toBe(true); // default preserved
    });
  });

  describe('SECURE_DEFAULTS', () => {
    it('should have all security features enabled', () => {
      expect(SECURE_DEFAULTS.paths.enabled).toBe(true);
      expect(SECURE_DEFAULTS.tools.enabled).toBe(true);
      expect(SECURE_DEFAULTS.secrets.enabled).toBe(true);
      expect(SECURE_DEFAULTS.logging.enabled).toBe(true);
      expect(SECURE_DEFAULTS.timeouts.enabled).toBe(true);
    });

    it('should have restrictive path settings', () => {
      expect(SECURE_DEFAULTS.paths.allowAbsolute).toBe(false);
      expect(SECURE_DEFAULTS.paths.allowSymlinks).toBe(false);
    });

    it('should redact secrets by default', () => {
      expect(SECURE_DEFAULTS.secrets.redactInLogs).toBe(true);
      expect(SECURE_DEFAULTS.secrets.redactInErrors).toBe(true);
    });
  });

  describe('PERMISSIVE_DEFAULTS', () => {
    it('should have all security features disabled', () => {
      expect(PERMISSIVE_DEFAULTS.paths.enabled).toBe(false);
      expect(PERMISSIVE_DEFAULTS.tools.enabled).toBe(false);
      expect(PERMISSIVE_DEFAULTS.secrets.enabled).toBe(false);
      expect(PERMISSIVE_DEFAULTS.logging.enabled).toBe(false);
      expect(PERMISSIVE_DEFAULTS.timeouts.enabled).toBe(false);
    });

    it('should allow all path operations', () => {
      expect(PERMISSIVE_DEFAULTS.paths.allowAbsolute).toBe(true);
      expect(PERMISSIVE_DEFAULTS.paths.allowSymlinks).toBe(true);
    });
  });

  describe('mergeSecurityConfig', () => {
    it('should return defaults when no user config provided', () => {
      const merged = mergeSecurityConfig(undefined);
      expect(merged).toEqual(SECURE_DEFAULTS);
    });

    it('should merge user config with defaults', () => {
      const merged = mergeSecurityConfig({ paths: { allowAbsolute: true } });
      expect(merged.paths.allowAbsolute).toBe(true);
      expect(merged.paths.enabled).toBe(true); // default preserved
    });

    it('should preserve unspecified defaults', () => {
      const merged = mergeSecurityConfig({ tools: { maxExecutionTime: 60000 } });
      expect(merged.tools.maxExecutionTime).toBe(60000);
      expect(merged.tools.validateParams).toBe(true); // default preserved
      expect(merged.paths.enabled).toBe(true); // other sections preserved
    });

    it('should allow using permissive defaults as base', () => {
      const merged = mergeSecurityConfig(
        { paths: { enabled: true } },
        PERMISSIVE_DEFAULTS
      );
      expect(merged.paths.enabled).toBe(true);
      expect(merged.tools.enabled).toBe(false); // permissive default
    });

    it('should handle empty user config', () => {
      const merged = mergeSecurityConfig({});
      expect(merged).toEqual(SECURE_DEFAULTS);
    });

    it('should override nested properties', () => {
      const merged = mergeSecurityConfig({
        secrets: {
          redactInLogs: false,
          redactInErrors: true,
        },
      });
      expect(merged.secrets.redactInLogs).toBe(false);
      expect(merged.secrets.redactInErrors).toBe(true);
      expect(merged.secrets.enabled).toBe(true); // default preserved
    });
  });
});
