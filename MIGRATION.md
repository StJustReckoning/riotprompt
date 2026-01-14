# Migration Guide

## Upgrading to Security-Enhanced Version

This guide helps you migrate to the security-enhanced version of RiotPrompt.

### Breaking Changes

#### 1. Logging Redaction Default

`ConversationLogger` now redacts sensitive data by default.

**Before:**
```typescript
// Logs included API keys, passwords, etc.
const logger = new ConversationLogger({ enabled: true });
```

**After:**
```typescript
// Logs are now redacted by default
const logger = new ConversationLogger({ enabled: true });

// To opt-out (development only):
const logger = new ConversationLogger({ 
  enabled: true, 
  redactSensitive: false 
});
```

#### 2. Silent Library Logging

Library logging is now silent by default to prevent information disclosure.

**Before:**
```typescript
// Library logged to console by default
import { DEFAULT_LOGGER } from '@theunwalked/riotprompt';
```

**After:**
```typescript
// Library is silent by default
// Enable logging via environment variable:
// RIOTPROMPT_LOGGING=true
// or
// NODE_ENV=development
// or
// DEBUG=*riotprompt*
```

### New Features (Opt-In)

Most security features are opt-in to maintain backward compatibility:

#### Tool Validation

```typescript
import { ToolGuard } from '@theunwalked/agentic';
import { z } from 'zod';

// Create a guard with schemas
const guard = new ToolGuard({
  enabled: true,
  validateParams: true,
});

// Register schemas for your tools
guard.registerSchema('read_file', z.object({
  path: z.string().max(1000),
}));

// Use with ToolRegistry
const registry = ToolRegistry.create()
  .withSecurity(guard);
```

#### Path Validation

```typescript
import { PathGuard, configurePathGuard } from '@theunwalked/riotprompt';

// Configure globally
configurePathGuard({
  enabled: true,
  basePaths: ['./prompts', './context'],
  allowAbsolute: false,
});

// Or use directly
const guard = new PathGuard({
  basePaths: [process.cwd()],
});

const result = guard.validate(userPath);
if (!result.valid) {
  throw new Error(result.error);
}
```

#### Timeout Enforcement

```typescript
import { TimeoutGuard } from '@theunwalked/riotprompt';

const guard = new TimeoutGuard({
  enabled: true,
  llmTimeout: 120000,  // 2 minutes
  toolTimeout: 30000,  // 30 seconds
});

// Wrap async operations
const result = await guard.withLLMTimeout(
  provider.execute(request),
  'openai-call'
);
```

#### Error Sanitization

```typescript
import { initializeErrorHandling, sanitize } from '@theunwalked/riotprompt';

// Initialize at startup
initializeErrorHandling({
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
});

// Use in error handling
try {
  await riskyOperation();
} catch (error) {
  const { external, internal } = sanitize(error);
  
  // Log internal details
  console.error('Error:', internal.correlationId, internal.originalMessage);
  
  // Return safe error to user
  throw new Error(external.message);
}
```

### Recommended Configuration

For production use, we recommend enabling all security features:

```typescript
import { 
  configurePathGuard,
  configureTimeoutGuard,
  configureAuditLogger,
  initializeErrorHandling,
} from '@theunwalked/riotprompt';

// Initialize error handling first
initializeErrorHandling({
  environment: 'production',
  basePaths: [process.cwd()],
});

// Configure path security
configurePathGuard({
  enabled: true,
  basePaths: [process.cwd()],
  allowAbsolute: false,
});

// Configure timeout protection
configureTimeoutGuard({
  enabled: true,
  llmTimeout: 120000,
  toolTimeout: 30000,
});

// Configure audit logging
configureAuditLogger({
  enabled: true,
  logLevel: 'warning',
  onEvent: (event) => {
    // Send to your monitoring system
    if (event.severity === 'error') {
      alertOps(event);
    }
  },
});
```

### Environment Variables

The following environment variables control security behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `RIOTPROMPT_LOGGING` | Enable library logging | `false` |
| `NODE_ENV` | Environment mode (`development` enables logging) | - |
| `DEBUG` | Debug patterns (include `riotprompt` to enable) | - |

### Dependency Changes

This version adds the following dependencies:

- `@theunwalked/offrecord` - API key security
- `@theunwalked/pressurelid` - Safe regex
- `@theunwalked/spotclean` - Error sanitization
- `@fjell/logging` - Secure logging

These are production dependencies and will be installed automatically.

### Testing Your Migration

After upgrading, verify security features work correctly:

```typescript
import { PathGuard, sanitize } from '@theunwalked/riotprompt';

// Test path validation
const guard = new PathGuard({ basePaths: ['/app'] });
console.assert(!guard.validate('../etc/passwd').valid, 'Path traversal should be blocked');

// Test error sanitization
const error = new Error('Key: sk-secret123456789012345');
const { external } = sanitize(error);
console.assert(!external.message.includes('sk-secret'), 'Secrets should be redacted');

console.log('Security migration verified!');
```

### Getting Help

If you encounter issues during migration:

1. Check the [Security Guide](./guide/security.md) for detailed configuration
2. Review the [CHANGELOG](./CHANGELOG.md) for all changes
3. Open an issue on GitHub with the `migration` label

