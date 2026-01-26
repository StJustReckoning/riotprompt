# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

You can expect:
- Acknowledgment within 48 hours
- Status update within 7 days
- Resolution timeline based on severity

## Security Features

RiotPrompt includes comprehensive security features to protect your AI workflows:

### Tool Execution Security
- **Parameter Validation**: All tool parameters validated against Zod schemas via `ToolGuard`
- **Execution Sandboxing**: Tools run with configurable restrictions via `ToolSandbox`
- **Timeout Protection**: Automatic timeout for long-running tools
- **Prototype Pollution Prevention**: Blocks `__proto__`, `constructor`, `prototype` in parameters

### Path Security
- **Path Validation**: Prevents directory traversal attacks via `PathGuard`
- **Base Path Restriction**: Limit file access to specific directories
- **Pattern Blocking**: Blocks dangerous path patterns (`..\`, `~`, `${`, etc.)
- **Glob Sanitization**: Safe handling of glob patterns

### Secret Protection
- **Automatic Redaction**: Sensitive data redacted in logs via `@fjell/logging`
- **API Key Security**: Keys validated and never logged via `@theunwalked/offrecord`
- **Error Sanitization**: Production errors don't leak secrets via `@theunwalked/spotclean`
- **Pattern Detection**: Built-in patterns for OpenAI, Anthropic, Gemini, and common secrets

### Request Security
- **Timeout Enforcement**: All external requests have configurable timeouts via `TimeoutGuard`
- **Rate Limiting Interfaces**: Built-in interfaces for rate limiting
- **Safe Regex**: ReDoS protection via `@theunwalked/pressurelid`

### Logging Security
- **Silent by Default**: Library logging disabled unless explicitly enabled
- **Sensitive Data Masking**: Automatic masking of API keys, passwords, emails, etc.
- **Audit Logging**: Security events tracked via `SecurityAuditLogger`

## Secure Configuration

### Recommended Defaults

```typescript
import { Security } from '@theunwalked/riotprompt';

// Configure path security
Security.configurePathGuard({
  enabled: true,
  basePaths: ['./prompts', './context'],
  allowAbsolute: false,
  allowSymlinks: false,
});

// Configure timeout protection
Security.configureTimeoutGuard({
  enabled: true,
  llmTimeout: 120000,  // 2 minutes for LLM calls
  toolTimeout: 30000,  // 30 seconds for tools
  fileTimeout: 5000,   // 5 seconds for file ops
});

// Configure audit logging
Security.configureAuditLogger({
  enabled: true,
  logLevel: 'warning',
  onEvent: (event) => {
    // Send to your monitoring system
  },
});
```

### Environment Variables

Enable logging only when needed:

```bash
# Enable riotprompt logging
RIOTPROMPT_LOGGING=true

# Or use DEBUG pattern
DEBUG=*riotprompt*

# Development mode enables logging
NODE_ENV=development
```

## Known Limitations

1. **Tool Sandboxing**: Not true process isolation; tools share the Node.js process
2. **Regex Analysis**: Static analysis may not catch all ReDoS patterns
3. **Rate Limiting**: Interfaces provided; implementation is user responsibility
4. **Memory Safety**: JavaScript limitations apply to secure string handling

## Security Checklist

- [ ] Use environment variables for API keys, not CLI flags
- [ ] Configure base paths for file operations
- [ ] Enable parameter validation for tools
- [ ] Set appropriate timeouts
- [ ] Enable log redaction in production
- [ ] Review tool definitions for security
- [ ] Monitor audit logs for security events
- [ ] Use `NODE_ENV=production` in production

## Dependencies

Security features rely on these packages:

| Package | Purpose |
|---------|---------|
| `@theunwalked/offrecord` | API key security and redaction |
| `@theunwalked/pressurelid` | Safe regex handling |
| `@theunwalked/spotclean` | Error message sanitization |
| `@fjell/logging` | Secure logging with masking |

## Security Updates

Security updates will be released as patch versions. Subscribe to releases to stay informed.

