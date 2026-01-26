# Security Guide

## Overview

This guide covers security best practices when using RiotPrompt and related packages for AI/LLM workflows.

## Threat Model

### Assets to Protect
- **API Keys**: OpenAI, Anthropic, Gemini, and other provider credentials
- **User Data**: Prompts, conversations, and context containing sensitive information
- **File System**: Access to local files and directories
- **External APIs**: Network access to LLM providers and other services

### Threat Categories

| Threat | Description | Severity |
|--------|-------------|----------|
| Tool Injection | LLM generates malicious tool parameters | 🔴 Critical |
| Path Traversal | Accessing files outside intended directories | 🔴 Critical |
| Secret Leakage | API keys or sensitive data in logs/errors | 🔴 Critical |
| Resource Exhaustion | Infinite loops, ReDoS, timeout failures | 🟠 High |
| Prompt Injection | LLM output influences security-critical operations | 🟠 High |
| Information Disclosure | Error messages reveal system details | 🟡 Medium |

### Mitigations

| Threat | Mitigation | Package |
|--------|------------|---------|
| Tool Injection | ToolGuard with Zod schema validation | agentic |
| Path Traversal | PathGuard with base path restrictions | riotprompt |
| Secret Leakage | SecretGuard with automatic redaction | offrecord, spotclean |
| Resource Exhaustion | TimeoutGuard, SafeRegex, rate limiting | riotprompt, pressurelid |
| Prompt Injection | Careful tool design, output validation | Application level |
| Information Disclosure | Error sanitization in production | spotclean |

## Configuration Examples

### Development Mode

For local development with verbose logging:

```typescript
import { Security } from '@theunwalked/riotprompt';

// Permissive configuration for development
Security.configurePathGuard({
  enabled: false, // Disable for easier development
});

Security.configureTimeoutGuard({
  enabled: true,
  llmTimeout: 300000, // 5 minutes for debugging
});

// Enable logging
process.env.RIOTPROMPT_LOGGING = 'true';
```

### Production Mode

Recommended configuration for production:

```typescript
import { Security, initializeErrorHandling } from '@theunwalked/riotprompt';

// Initialize error handling first
initializeErrorHandling({
  environment: 'production',
  basePaths: [process.cwd()],
});

// Configure path security
Security.configurePathGuard({
  enabled: true,
  basePaths: [process.cwd()],
  allowAbsolute: false,
  allowSymlinks: false,
  denyPatterns: [
    '\\.\\.',        // Parent directory
    '~',             // Home directory
    '\\$\\{',        // Variable expansion
    '\\$\\(',        // Command substitution
  ],
});

// Configure timeout protection
Security.configureTimeoutGuard({
  enabled: true,
  defaultTimeout: 30000,
  llmTimeout: 120000,
  toolTimeout: 30000,
  fileTimeout: 5000,
});

// Configure audit logging
Security.configureAuditLogger({
  enabled: true,
  logLevel: 'warning',
  onEvent: (event) => {
    // Send to monitoring system
    if (event.severity === 'error') {
      alertOps(event);
    }
  },
});
```

### High Security Mode

For handling PII or sensitive data:

```typescript
import { Security } from '@theunwalked/riotprompt';
import { ToolGuard, ToolSandbox } from '@theunwalked/agentic';

// Strict path security
Security.configurePathGuard({
  enabled: true,
  basePaths: ['./approved-prompts'],
  allowAbsolute: false,
  allowSymlinks: false,
});

// Tool validation with strict schemas
const guard = new ToolGuard({
  enabled: true,
  validateParams: true,
  detectPrototypePollution: true,
  allowedTools: ['read_file', 'search'], // Explicit allowlist
});

// Sandboxed execution
const sandbox = new ToolSandbox({
  enabled: true,
  maxExecutionTime: 10000, // Shorter timeout
  maxConcurrent: 2,        // Limit concurrency
  maxOutputSize: 100000,   // 100KB max
});

// Rate limiting
Security.configureRateLimiter({
  windowMs: 60000,  // 1 minute
  maxRequests: 10,  // 10 requests per minute
});
```

## Best Practices

### API Key Management

1. **Never** pass API keys via CLI flags
   ```bash
   # BAD - key visible in process list
   riotprompt execute --api-key sk-xxx...
   
   # GOOD - use environment variable
   export OPENAI_API_KEY=sk-xxx...
   riotprompt execute
   ```

2. Use environment variables or a secrets manager
3. Rotate keys regularly
4. Use separate keys for development and production
5. Monitor key usage for anomalies

### Tool Development

1. **Define Zod schemas** for all parameters:
   ```typescript
   const schema = z.object({
     path: z.string().max(1000).refine(
       p => !p.includes('..'),
       'Path traversal not allowed'
     ),
     content: z.string().max(100000),
   });
   ```

2. **Validate outputs** as well as inputs
3. **Implement proper error handling** that doesn't leak information
4. **Avoid shell commands** when possible
5. **Log security-relevant operations** to audit log

### Prompt Security

1. **Don't include secrets in prompts**
   ```typescript
   // BAD
   const prompt = `Use API key ${apiKey} to...`;
   
   // GOOD - pass via secure context
   const prompt = `Use the configured API key to...`;
   ```

2. **Sanitize user input** before including in prompts
3. **Be cautious with user-provided file paths**
4. **Review LLM outputs** before executing tools
5. **Use structured output** (JSON mode) for tool calls

### Logging Security

1. **Keep logging disabled** in production by default
2. **Use correlation IDs** for debugging without exposing details
3. **Monitor audit logs** for security events
4. **Set up alerts** for critical security events

## Security Events

The `SecurityAuditLogger` tracks these event types:

| Event Type | Description | Severity |
|------------|-------------|----------|
| `path_traversal_blocked` | Directory traversal attempt blocked | warning |
| `tool_validation_failed` | Tool parameter validation failed | warning |
| `tool_execution_timeout` | Tool execution timed out | warning |
| `secret_redacted` | Secret was redacted from output | info |
| `regex_blocked` | Unsafe regex pattern blocked | warning |
| `request_timeout` | External request timed out | warning |
| `api_key_used` | API key was used (for auditing) | info |

## Incident Response

If you suspect a security incident:

1. **Rotate all API keys** immediately
2. **Review audit logs** for suspicious activity
3. **Check for unauthorized file access**
4. **Review recent tool executions**
5. **Report the incident** following your organization's procedures

## Additional Resources

- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [API Security Best Practices](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

