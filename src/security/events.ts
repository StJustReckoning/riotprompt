export type SecurityEventType =
  | 'path_validation_failed'
  | 'path_traversal_blocked'
  | 'tool_validation_failed'
  | 'tool_execution_blocked'
  | 'tool_timeout'
  | 'secret_redacted'
  | 'api_key_used'
  | 'deserialization_failed'
  | 'regex_timeout'
  | 'regex_blocked'
  | 'input_validation_failed'
  | 'request_timeout'
  | 'rate_limit_exceeded';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  context?: Record<string, unknown>;
  // Never include actual sensitive values
}

