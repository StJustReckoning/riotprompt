# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

This release includes comprehensive security enhancements. See the [Security Guide](./guide/security.md) for details.

#### New Security Features

- **ToolGuard**: Schema-based validation of tool parameters with Zod integration
- **ToolSandbox**: Execution timeout and resource limits for tools
- **PathGuard**: Path traversal prevention with base directory restrictions
- **SecretGuard**: Automatic redaction of sensitive data in logs and errors via `@fjell/logging`
- **TimeoutGuard**: Request timeout enforcement for LLM and tool calls
- **SafeRegex**: ReDoS protection for user-provided regex patterns via `@theunwalked/pressurelid`
- **CLIValidator**: Input validation for command-line arguments
- **ErrorSanitizer**: Production-safe error messages with correlation IDs via `@theunwalked/spotclean`
- **SecurityAuditLogger**: Security event logging and monitoring
- **RateLimiter**: Rate limiting interfaces and in-memory implementation

#### Breaking Changes

- `ConversationLogger` now defaults to `redactSensitive: true`
  - Migration: Set `redactSensitive: false` explicitly if needed
- Library logging is now silent by default
  - Migration: Set `RIOTPROMPT_LOGGING=true` or `NODE_ENV=development` to enable

#### Security Fixes

- Tool parameters are now validated before execution
- Path traversal attacks are blocked in file operations
- API keys are validated and never logged
- Regex patterns are analyzed for ReDoS vulnerabilities
- Error messages are sanitized in production mode
- Hash truncation increased from 16 to 32 characters (128 bits)
- Glob patterns are sanitized to prevent injection

### Added

- Security configuration via `SecurityConfig` type
- Global security guards: `getPathGuard()`, `getTimeoutGuard()`, `getAuditLogger()`, etc.
- Security test utilities and attack vector fixtures
- Security documentation (`SECURITY.md`) and threat model
- Security guide (`guide/security.md`)
- Rate limiter interfaces (`RateLimiter`, `MemoryRateLimiter`, `NoOpRateLimiter`)
- Glob pattern sanitization (`sanitizeGlobPattern`, `isGlobSafe`, `validateGlobPattern`)
- Error handling utilities (`sanitize`, `createSafeError`, `handleError`)
- Silent logger (`SILENT_LOGGER`) for production use

### Changed

- Default logger is now silent unless explicitly enabled
- `ConversationLogger` redacts sensitive data by default
- Hash content uses 32 characters (128 bits) instead of 16

### Dependencies

Added the following security-focused dependencies:

- `@theunwalked/offrecord` - API key security and redaction
- `@theunwalked/pressurelid` - Safe regex handling
- `@theunwalked/spotclean` - Error message sanitization
- `@fjell/logging` - Secure logging with masking

## [0.0.20] - Previous Release

Initial public release with core prompt engineering features.

