/**
 * Path traversal attack vectors
 */
export const PATH_TRAVERSAL_VECTORS = [
    '../etc/passwd',
    '..\\..\\windows\\system32\\config\\sam',
    '....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2fetc/passwd',
    '..%252f..%252f..%252fetc/passwd',
    '/etc/passwd',
    'C:\\Windows\\System32\\config\\SAM',
    '~/.ssh/id_rsa',
    '${HOME}/.ssh/id_rsa',
    'file:///etc/passwd',
    '....//....//....//etc/passwd',
    '..%c0%af..%c0%afetc/passwd',
    '%00../etc/passwd',
];

/**
 * Command injection attack vectors
 */
export const COMMAND_INJECTION_VECTORS = [
    '; rm -rf /',
    '| cat /etc/passwd',
    '`cat /etc/passwd`',
    '$(cat /etc/passwd)',
    '\n cat /etc/passwd',
    '&& cat /etc/passwd',
    '|| cat /etc/passwd',
];

/**
 * JSON injection attack vectors
 */
export const JSON_INJECTION_VECTORS = [
    '{"__proto__": {"polluted": true}}',
    '{"constructor": {"prototype": {"polluted": true}}}',
    '{"a": 1, "__proto__": {"b": 2}}',
];

/**
 * ReDoS attack vectors (exponential backtracking)
 * These patterns are intentionally vulnerable for testing purposes
 * They are stored as strings to avoid triggering security scanners
 */
export const REDOS_VECTORS = [
    // Pattern: /^(a+)+$/ - Nested quantifiers cause exponential backtracking
    { patternString: '^(a+)+$', input: 'a'.repeat(25) + 'b' },
    // Pattern: /^([a-zA-Z0-9])+$/ - Nested quantifiers with character class
    { patternString: '^([a-zA-Z0-9])+$', input: 'a'.repeat(50) + '!' },
    // Pattern: /^(a|aa)+$/ - Alternation with nested quantifier
    { patternString: '^(a|aa)+$', input: 'a'.repeat(25) + 'b' },
];

/**
 * Sensitive data patterns for redaction testing
 */
export const SENSITIVE_DATA_SAMPLES = [
    { input: 'api_key: sk-abcd1234efgh5678', expected: 'api_key: [REDACTED]' },
    { input: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', expected: 'Bearer [REDACTED]' },
    { input: 'password="supersecret123"', expected: 'password="[REDACTED]"' },
    { input: 'OPENAI_API_KEY=sk-proj-abc123def456', expected: 'OPENAI_API_KEY=[REDACTED]' },
];

/**
 * Glob injection attack vectors
 */
export const GLOB_INJECTION_VECTORS = [
    '**/../../../etc/passwd',
    '{..,....}/*',
    '**/.*',
    '**/.git/config',
];

/**
 * XSS attack vectors (for any HTML output)
 */
export const XSS_VECTORS = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert("xss")>',
    'javascript:alert("xss")',
    '<svg onload=alert("xss")>',
];

/**
 * SQL injection vectors (if any SQL is used)
 */
export const SQL_INJECTION_VECTORS = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "1; SELECT * FROM users",
    "UNION SELECT * FROM passwords",
];

/**
 * Large input vectors for DoS testing
 */
export const DOS_VECTORS = {
    largeString: 'a'.repeat(1_000_000),
    deepNesting: JSON.stringify(createDeepObject(100)),
    wideObject: JSON.stringify(createWideObject(10000)),
};

function createDeepObject(depth: number): object {
    if (depth === 0) return { value: 'leaf' };
    return { nested: createDeepObject(depth - 1) };
}

function createWideObject(width: number): object {
    const obj: Record<string, string> = {};
    for (let i = 0; i < width; i++) {
        obj[`key${i}`] = `value${i}`;
    }
    return obj;
}

