import { SecurityEvent, SecurityEventType } from './events';
import { Logger, DEFAULT_LOGGER, wrapLogger } from '../logger';

export interface AuditLoggerConfig {
    enabled: boolean;
    logLevel: 'all' | 'warning' | 'error' | 'critical';
    includeContext: boolean;
    maxContextSize: number;
    onEvent?: (event: SecurityEvent) => void;
}

const DEFAULT_CONFIG: AuditLoggerConfig = {
    enabled: true,
    logLevel: 'warning',
    includeContext: true,
    maxContextSize: 1000,
};

export class SecurityAuditLogger {
    private config: AuditLoggerConfig;
    private logger: Logger;
    private eventCount: Map<SecurityEventType, number> = new Map();

    constructor(config: Partial<AuditLoggerConfig> = {}, logger?: Logger) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger = wrapLogger(logger || DEFAULT_LOGGER, 'SecurityAudit');
    }

    /**
     * Log a security event
     */
    log(event: Omit<SecurityEvent, 'timestamp'>): void {
        if (!this.config.enabled) return;

        const fullEvent: SecurityEvent = {
            ...event,
            timestamp: new Date(),
            context: this.sanitizeContext(event.context),
        };

        // Track event counts
        const count = this.eventCount.get(event.type) || 0;
        this.eventCount.set(event.type, count + 1);

        // Always call event handler for monitoring (before log level filter)
        this.config.onEvent?.(fullEvent);

        // Check log level for actual logging output
        if (!this.shouldLog(event.severity)) return;

        // Log the event
        const logMessage = this.formatEvent(fullEvent);
    
        switch (event.severity) {
            case 'critical':
                this.logger.error(`[CRITICAL] ${logMessage}`);
                break;
            case 'error':
                this.logger.error(logMessage);
                break;
            case 'warning':
                this.logger.warn(logMessage);
                break;
            case 'info':
                this.logger.info(logMessage);
                break;
        }
    }

    /**
     * Convenience methods for common events
     */
    pathTraversalBlocked(path: string, reason: string): void {
        this.log({
            type: 'path_traversal_blocked',
            severity: 'warning',
            message: `Path traversal attempt blocked: ${reason}`,
            context: { attemptedPath: this.sanitizePath(path) },
        });
    }

    pathValidationFailed(path: string, reason: string): void {
        this.log({
            type: 'path_validation_failed',
            severity: 'warning',
            message: `Path validation failed: ${reason}`,
            context: { attemptedPath: this.sanitizePath(path) },
        });
    }

    toolValidationFailed(toolName: string, reason: string): void {
        this.log({
            type: 'tool_validation_failed',
            severity: 'warning',
            message: `Tool parameter validation failed for "${toolName}": ${reason}`,
            context: { toolName },
        });
    }

    toolExecutionBlocked(toolName: string, reason: string): void {
        this.log({
            type: 'tool_execution_blocked',
            severity: 'error',
            message: `Tool execution blocked for "${toolName}": ${reason}`,
            context: { toolName },
        });
    }

    toolTimeout(toolName: string, timeoutMs: number): void {
        this.log({
            type: 'tool_timeout',
            severity: 'warning',
            message: `Tool "${toolName}" timed out after ${timeoutMs}ms`,
            context: { toolName, timeoutMs },
        });
    }

    secretRedacted(source: string): void {
        this.log({
            type: 'secret_redacted',
            severity: 'info',
            message: `Sensitive data redacted from ${source}`,
            context: { source },
        });
    }

    apiKeyUsed(provider: string): void {
        this.log({
            type: 'api_key_used',
            severity: 'info',
            message: `API key accessed for provider: ${provider}`,
            context: { provider },
        });
    }

    deserializationFailed(source: string, reason: string): void {
        this.log({
            type: 'deserialization_failed',
            severity: 'warning',
            message: `Deserialization failed from ${source}: ${reason}`,
            context: { source },
        });
    }

    regexTimeout(pattern: string, timeoutMs: number): void {
        this.log({
            type: 'regex_timeout',
            severity: 'warning',
            message: `Regex operation timed out after ${timeoutMs}ms`,
            context: { patternLength: pattern.length, timeoutMs },
        });
    }

    requestTimeout(operation: string, timeoutMs: number): void {
        this.log({
            type: 'request_timeout',
            severity: 'warning',
            message: `Operation "${operation}" timed out after ${timeoutMs}ms`,
            context: { operation, timeoutMs },
        });
    }

    rateLimitExceeded(resource: string, limit: number): void {
        this.log({
            type: 'rate_limit_exceeded',
            severity: 'warning',
            message: `Rate limit exceeded for ${resource}: limit is ${limit}`,
            context: { resource, limit },
        });
    }

    /**
     * Get event statistics
     */
    getStats(): Map<SecurityEventType, number> {
        return new Map(this.eventCount);
    }

    /**
     * Get total event count
     */
    getTotalEventCount(): number {
        let total = 0;
        for (const count of this.eventCount.values()) {
            total += count;
        }
        return total;
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.eventCount.clear();
    }

    /**
     * Check if any events of a specific type have been logged
     */
    hasEventsOfType(type: SecurityEventType): boolean {
        return (this.eventCount.get(type) || 0) > 0;
    }

    /**
     * Get count for a specific event type
     */
    getEventCount(type: SecurityEventType): number {
        return this.eventCount.get(type) || 0;
    }

    private shouldLog(severity: SecurityEvent['severity']): boolean {
        const levels = ['info', 'warning', 'error', 'critical'];
        const configLevel = levels.indexOf(this.config.logLevel === 'all' ? 'info' : this.config.logLevel);
        const eventLevel = levels.indexOf(severity);
        return eventLevel >= configLevel;
    }

    private formatEvent(event: SecurityEvent): string {
        let message = `[${event.type}] ${event.message}`;
        if (this.config.includeContext && event.context) {
            message += ` | Context: ${JSON.stringify(event.context)}`;
        }
        return message;
    }

    private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
        if (!context || !this.config.includeContext) return undefined;

        const sanitized: Record<string, unknown> = {};
        let size = 0;

        for (const [key, value] of Object.entries(context)) {
            const stringValue = String(value);
            if (size + stringValue.length > this.config.maxContextSize) break;
      
            // Never log sensitive-looking values
            if (this.looksLikeSensitiveKey(key)) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = value;
            }
            size += stringValue.length;
        }

        return sanitized;
    }

    private sanitizePath(path: string): string {
        // Only show last component and length
        const parts = path.split(/[/\\]/);
        const lastPart = parts[parts.length - 1];
        return `.../${lastPart} (${path.length} chars)`;
    }

    private looksLikeSensitiveKey(key: string): boolean {
        const sensitivePatterns = [
            /key/i, /secret/i, /password/i, /token/i, /auth/i, /credential/i
        ];
        return sensitivePatterns.some(p => p.test(key));
    }
}

// Global instance for convenience
let globalAuditLogger: SecurityAuditLogger | null = null;

export function getAuditLogger(): SecurityAuditLogger {
    if (!globalAuditLogger) {
        globalAuditLogger = new SecurityAuditLogger();
    }
    return globalAuditLogger;
}

export function configureAuditLogger(config: Partial<AuditLoggerConfig>, logger?: Logger): void {
    globalAuditLogger = new SecurityAuditLogger(config, logger);
}

export function resetAuditLogger(): void {
    globalAuditLogger = null;
}

