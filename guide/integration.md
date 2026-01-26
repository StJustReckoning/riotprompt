# Integration Guide

**Purpose**: Comprehensive guide for integrating RiotPrompt into your application as a library.

This guide covers the core concepts, configuration options, and code patterns for using RiotPrompt programmatically. It is intended for developers building LLM-powered applications who want to leverage RiotPrompt's structured prompt engineering capabilities.

## Installation

```bash
npm install @riotprompt/riotprompt
```

For lighter installs, you can use individual packages:

```bash
# Core prompt engineering (no SDK dependencies)
npm install @riotprompt/riotprompt

# Provider-specific execution
npm install @riotprompt/execution-openai
npm install @riotprompt/execution-anthropic
npm install @riotprompt/execution-gemini

# Agentic features (tool registry, context management)
npm install @riotprompt/agentic
```

## Core Concepts

### Prompts as Structured Objects

RiotPrompt treats prompts as structured data objects rather than simple strings. A `Prompt` contains multiple specialized sections:

| Section | Purpose | Example |
|---------|---------|---------|
| `persona` | Who the AI is (system prompt) | "You are a senior code reviewer" |
| `instructions` | What the AI should do | "Review this pull request" |
| `content` | Input data to process | The actual PR diff |
| `context` | Background information | Project guidelines, coding standards |
| `constraints` | Hard rules and limitations | "Do not suggest refactoring" |
| `tone` | Style guidelines | "Be constructive and empathetic" |
| `examples` | Few-shot examples | Sample reviews |
| `reasoning` | Thinking instructions | "Think step-by-step" |
| `responseFormat` | Output structure | "Return as JSON" |
| `recap` | Final reminders | "Remember to check for security issues" |
| `safeguards` | Safety guidelines | "Do not execute code" |

### Section System

Sections are hierarchical containers that can hold items and nested sections:

```typescript
import { createSection, createInstruction } from '@riotprompt/riotprompt';

const instructions = createSection<Instruction>('Instructions');
instructions.add(createInstruction('Analyze the code for bugs'));
instructions.add(createInstruction('Check for security vulnerabilities'));

// Nested sections
const advanced = createSection<Instruction>('Advanced Checks');
advanced.add(createInstruction('Review performance implications'));
instructions.addSection(advanced);
```

### Weighted Items

Items can have weights for prioritization:

```typescript
import { createWeighted } from '@riotprompt/riotprompt';

const highPriority = createWeighted('Critical security check', { weight: 1.0 });
const lowPriority = createWeighted('Style suggestions', { weight: 0.3 });
```

## Creating Prompts

### Using the Recipes API (Recommended)

The `cook` function is the primary entry point for creating prompts:

```typescript
import { cook } from '@riotprompt/riotprompt';

const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are a helpful AI assistant.' },
    instructions: [
        { content: 'Summarize the provided text.' },
        { content: 'Extract key points.' }
    ],
    content: [
        { content: 'Text to summarize goes here...' }
    ]
});
```

### Content Items

Content items can be specified in multiple ways:

```typescript
const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are an analyst.' },
    
    // Simple string content
    instructions: [
        { content: 'Analyze this data' }
    ],
    
    // Content with title and weight
    context: [
        { content: 'Background info', title: 'Context', weight: 0.8 }
    ],
    
    // Load from file
    examples: [
        { path: './examples/good-analysis.md', title: 'Example' }
    ],
    
    // Load from directories
    content: [
        { directories: ['./data'], title: 'Input Data' }
    ]
});
```

### Using the Fluent Builder API

For more dynamic prompt construction:

```typescript
import { recipe } from '@riotprompt/riotprompt';

const prompt = await recipe(__dirname)
    .persona({ content: 'You are a code reviewer' })
    .instructions({ content: 'Review this code' })
    .constraints({ content: 'Focus on security' })
    .content({ content: codeToReview })
    .cook();
```

### Using Templates

Register reusable templates for consistency:

```typescript
import { registerTemplates, cook, getTemplates, clearTemplates } from '@riotprompt/riotprompt';

// Register templates
registerTemplates({
    'code-review': {
        persona: { content: 'You are a senior code reviewer.' },
        constraints: [{ content: 'Be constructive.' }],
        tone: [{ content: 'Professional and helpful.' }]
    },
    'security-audit': {
        persona: { content: 'You are a security auditor.' },
        constraints: [{ content: 'Report only high-severity issues.' }]
    }
});

// Use a template
const prompt = await cook({
    basePath: __dirname,
    template: 'code-review',
    content: [{ content: prDiff }]
});

// Extend a template
const prompt2 = await cook({
    basePath: __dirname,
    extends: 'security-audit',
    instructions: [{ content: 'Focus on SQL injection vulnerabilities.' }],
    content: [{ content: sourceCode }]
});

// List registered templates
const templates = getTemplates();

// Clear all templates
clearTemplates();
```

## Structured Outputs

RiotPrompt supports portable structured outputs using Zod schemas:

```typescript
import { cook } from '@riotprompt/riotprompt';
import { z } from 'zod';

// Define your schema
const AnalysisSchema = z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    keyPoints: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    summary: z.string()
});

// Pass to cook
const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are a sentiment analyzer.' },
    content: [{ content: textToAnalyze }],
    schema: AnalysisSchema
});

// The schema is automatically adapted for different providers
// (JSON Schema for OpenAI, Tool Use for Anthropic, etc.)
```

## Model Configuration

### Default Model Mappings

RiotPrompt automatically handles model-specific formatting:

| Model Family | Persona Role | Encoding |
|--------------|--------------|----------|
| Claude | `system` | `cl100k_base` |
| GPT-4 | `system` | `gpt-4o` |
| O-series (o1, o2) | `developer` | `gpt-4o` |

### Custom Model Configuration

Register custom models:

```typescript
import { configureModel, getModelRegistry } from '@riotprompt/riotprompt';

// Register a custom model
configureModel({
    exactMatch: 'my-local-llama',
    personaRole: 'system',
    encoding: 'cl100k_base',
    family: 'llama',
    supportsToolCalls: true
});

// Pattern-based matching
configureModel({
    pattern: /^llama-\d+/,
    personaRole: 'system',
    encoding: 'cl100k_base',
    family: 'llama'
});

// Access the registry
const registry = getModelRegistry();
```

## Formatting Prompts

### For Different Models

```typescript
import { Formatter, cook } from '@riotprompt/riotprompt';

const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are a helpful assistant.' },
    instructions: [{ content: 'Help the user.' }]
});

// Create formatter
const formatter = Formatter.create();

// Format for specific model (handles role mapping automatically)
const openaiRequest = formatter.formatPrompt('gpt-4o', prompt);
const claudeRequest = formatter.formatPrompt('claude-3-opus', prompt);
const o1Request = formatter.formatPrompt('o1', prompt);  // Uses 'developer' role
```

### Custom Format Options

```typescript
const formatter = Formatter.create({
    sectionSeparator: '\n\n---\n\n',
    sectionTitleProperty: 'header',
    includeWeights: true
});
```

## Serialization

### Export and Import Prompts

```typescript
import { Serializer, cook } from '@riotprompt/riotprompt';

const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are an assistant.' },
    instructions: [{ content: 'Help users.' }]
});

// Export to JSON
const json = Serializer.toJSON(prompt);

// Export to XML
const xml = Serializer.toXML(prompt);

// Import from JSON
const restored = Serializer.fromJSON(json);

// Import from XML
const restoredXml = Serializer.fromXML(xml);
```

## Loading from Filesystem

### Directory Structure

RiotPrompt can load prompts from a structured directory:

```
my-prompt/
├── persona.md          # OR persona/ directory
├── instructions.md     # OR instructions/ directory
├── context/            # Reference files
│   ├── data.json
│   └── background.md
├── constraints.md
├── tone.md
└── examples.md
```

### Using the Loader

```typescript
import { Loader } from '@riotprompt/riotprompt';

// Create loader
const loader = Loader.create({
    basePath: './prompts/my-prompt',
    ignorePatterns: ['*.test.md', 'drafts/**']
});

// Load context from directories
const context = await loader.load(['./context', './reference']);
```

## Conversation Management

### ConversationBuilder

Manage multi-turn conversations:

```typescript
import { ConversationBuilder, cook } from '@riotprompt/riotprompt';

// Create from prompt
const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are a helpful assistant.' },
    instructions: [{ content: 'Help users with their questions.' }]
});

const conversation = ConversationBuilder.create({ model: 'gpt-4o' })
    .fromPrompt(prompt, 'gpt-4o')
    .build();

// Add messages
conversation.addUserMessage('What is TypeScript?');
conversation.addAssistantMessage('TypeScript is a typed superset of JavaScript...');
conversation.addUserMessage('How do I install it?');

// Get messages for API call
const messages = conversation.toMessages();
```

### Semantic Message Methods

Use semantic methods for clearer code:

```typescript
const conversation = ConversationBuilder.create({ model: 'gpt-4o' })
    .fromPrompt(prompt, 'gpt-4o')
    .asUser('Analyze this code')
    .asAssistant('I see several issues...')
    .asUser('Can you fix them?')
    .build();
```

### Context Injection

Inject dynamic context into conversations:

```typescript
conversation.injectContext([
    {
        id: 'file-1',
        content: 'Contents of main.ts...',
        title: 'Source File',
        category: 'code',
        priority: 'high'
    },
    {
        id: 'docs-1',
        content: 'API documentation...',
        title: 'Documentation',
        category: 'reference',
        priority: 'medium'
    }
], {
    position: 'after-system',
    format: 'structured',
    deduplicate: true,
    deduplicateBy: 'id'
});
```

### Token Budget Management

Manage token usage:

```typescript
const conversation = ConversationBuilder.create({ model: 'gpt-4o' })
    .fromPrompt(prompt, 'gpt-4o')
    .withTokenBudget({
        max: 100000,
        reserve: 4000,  // Reserve for response
        compressionStrategy: 'summarize'
    })
    .build();

// Check usage
const usage = conversation.getTokenUsage();
console.log(`Used: ${usage.used}/${usage.max} (${usage.percentage}%)`);

// Manually compress if needed
conversation.compress();
```

### Conversation Logging

Log conversations for debugging and replay:

```typescript
const conversation = ConversationBuilder.create({ model: 'gpt-4o' })
    .fromPrompt(prompt, 'gpt-4o')
    .withLogging({
        outputPath: './logs',
        format: 'json',
        includeMetadata: true
    })
    .build();

// ... use conversation ...

// Save log
const logPath = await conversation.saveLog();
```

### Serialization and Cloning

```typescript
// Serialize for persistence
const json = conversation.toJSON();

// Restore later
const restored = ConversationBuilder.fromJSON(json, { model: 'gpt-4o' });

// Clone for parallel exploration
const branch = conversation.clone();
branch.addUserMessage('What if we tried a different approach?');
```

## Tool Integration

### ToolRegistry

Register and manage tools:

```typescript
import { ToolRegistry } from '@riotprompt/riotprompt';

const registry = ToolRegistry.create({
    workingDirectory: process.cwd()
});

// Register a tool
registry.register({
    name: 'read_file',
    description: 'Read contents of a file',
    category: 'filesystem',
    cost: 'cheap',
    parameters: {
        type: 'object',
        properties: {
            path: {
                type: 'string',
                description: 'Path to the file'
            }
        },
        required: ['path']
    },
    execute: async ({ path }) => {
        const fs = await import('fs/promises');
        return await fs.readFile(path, 'utf-8');
    }
});

// Register multiple tools
registry.registerAll([tool1, tool2, tool3]);
```

### Executing Tools

```typescript
// Execute a single tool
const content = await registry.execute('read_file', { path: 'README.md' });

// Execute batch
const results = await registry.executeBatch([
    { name: 'read_file', params: { path: 'file1.ts' } },
    { name: 'read_file', params: { path: 'file2.ts' } }
]);

// Get usage statistics
const stats = registry.getUsageStats();
console.log(stats.get('read_file'));
// { calls: 3, failures: 0, successRate: 1, averageDuration: 5 }
```

### Export for Providers

```typescript
// Export for OpenAI
const openaiTools = registry.toOpenAIFormat();

// Export for Anthropic
const anthropicTools = registry.toAnthropicFormat();

// Get definitions (without execute functions)
const definitions = registry.getDefinitions();
```

### Tool Guidance Generation

Generate tool usage instructions for prompts:

```typescript
import { generateToolGuidance, cook } from '@riotprompt/riotprompt';

const guidance = generateToolGuidance(registry.getAll(), {
    style: 'detailed',  // 'minimal' | 'detailed' | 'auto'
    includeExamples: true
});

const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are an assistant with tools.' },
    instructions: [{ content: guidance }],
    tools: registry
});
```

## Agentic Interactions

### Iteration Strategies

Execute multi-step agentic workflows:

```typescript
import {
    StrategyExecutor,
    IterationStrategyFactory,
    ConversationBuilder,
    ToolRegistry
} from '@riotprompt/riotprompt';

// Create LLM client (provider-specific)
const llmClient = {
    async complete(messages, tools) {
        // Call your LLM provider
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            tools
        });
        return {
            content: response.choices[0].message.content,
            tool_calls: response.choices[0].message.tool_calls
        };
    }
};

// Create executor
const executor = new StrategyExecutor(llmClient);

// Execute with a strategy
const result = await executor.execute(
    conversation,
    toolRegistry,
    IterationStrategyFactory.investigateThenRespond({
        maxInvestigationSteps: 5,
        requireMinimumTools: 1,
        finalSynthesis: true
    })
);

console.log('Completed in', result.totalIterations, 'iterations');
console.log('Used', result.toolCallsExecuted, 'tool calls');
```

### Pre-built Strategies

```typescript
// Investigate then respond (gather info, then synthesize)
const strategy1 = IterationStrategyFactory.investigateThenRespond({
    maxInvestigationSteps: 5,
    requireMinimumTools: 1
});

// Multi-pass refinement (generate, critique, refine)
const strategy2 = IterationStrategyFactory.multiPassRefinement({
    passes: 3,
    critiqueBetweenPasses: true
});

// Breadth-first (explore broadly before going deep)
const strategy3 = IterationStrategyFactory.breadthFirst({
    levelsDeep: 3,
    toolsPerLevel: 4
});

// Depth-first (deep dive immediately)
const strategy4 = IterationStrategyFactory.depthFirst({
    maxDepth: 5,
    backtrackOnFailure: true
});

// Simple loop (basic tool-use iteration)
const strategy5 = IterationStrategyFactory.simple({
    maxIterations: 10,
    allowTools: true
});

// Adaptive (changes behavior based on progress)
const strategy6 = IterationStrategyFactory.adaptive();
```

### Custom Strategies

Create custom iteration strategies:

```typescript
import type { IterationStrategy, StrategyPhase } from '@riotprompt/riotprompt';

const customStrategy: IterationStrategy = {
    name: 'custom-workflow',
    description: 'My custom agentic workflow',
    maxIterations: 15,
    
    phases: [
        {
            name: 'discovery',
            maxIterations: 5,
            toolUsage: 'encouraged',
            allowedTools: ['search', 'read_file'],
            minToolCalls: 2
        },
        {
            name: 'analysis',
            maxIterations: 3,
            toolUsage: 'optional',
            instructions: 'Analyze what you discovered'
        },
        {
            name: 'synthesis',
            maxIterations: 1,
            toolUsage: 'forbidden',
            requireFinalAnswer: true
        }
    ],
    
    // Lifecycle hooks
    onStart: async (context) => {
        console.log('Starting workflow...');
    },
    
    onIteration: async (iteration, state) => {
        if (state.errors.length > 3) {
            return 'stop';
        }
        return 'continue';
    },
    
    onToolCall: async (toolCall, state) => {
        // Skip expensive tools after 10 calls
        if (state.toolCallsExecuted > 10) {
            const tool = toolCall.function.name;
            if (tool === 'expensive_operation') {
                return 'skip';
            }
        }
        return 'execute';
    },
    
    onToolResult: async (result, state) => {
        // Track insights from tool results
        if (result.result?.important) {
            state.insights.push({
                source: result.toolName,
                content: result.result.important,
                confidence: 0.8
            });
        }
    },
    
    onComplete: async (result) => {
        console.log('Workflow complete:', result.success);
    }
};
```

### Reflection and Metrics

Generate execution reports:

```typescript
const executor = new StrategyExecutor(llmClient)
    .withReflection({
        enabled: true,
        outputPath: './reflections',
        format: 'markdown',  // or 'json'
        includeRecommendations: true
    });

const result = await executor.execute(conversation, tools, strategy);

// Access reflection report
if (result.reflection) {
    console.log('Tool Effectiveness:', result.reflection.toolEffectiveness);
    console.log('Recommendations:', result.reflection.recommendations);
    console.log('Quality Assessment:', result.reflection.qualityAssessment);
}
```

## Security Features

### Path Security

Prevent path traversal attacks:

```typescript
import { Security } from '@riotprompt/riotprompt';

const pathGuard = Security.createPathGuard({
    allowedPaths: ['/app/data', '/app/uploads'],
    blockedPatterns: ['..', '~'],
    maxPathLength: 255
});

// Validate paths
const isValid = pathGuard.validate('/app/data/file.txt');  // true
const isInvalid = pathGuard.validate('../etc/passwd');     // false
```

### Secret Redaction

Protect sensitive data in logs:

```typescript
import { configureSecureLogging, maskSensitive } from '@riotprompt/riotprompt';

// Configure secure logging
configureSecureLogging({
    maskPatterns: [
        /api[_-]?key/i,
        /password/i,
        /secret/i,
        /token/i
    ],
    replacement: '[REDACTED]'
});

// Mask sensitive data
const safe = maskSensitive({
    apiKey: 'sk-1234567890',
    data: 'normal data'
});
// { apiKey: '[REDACTED]', data: 'normal data' }
```

### Error Handling

Sanitize errors before logging:

```typescript
import {
    initializeErrorHandling,
    withErrorHandling,
    formatErrorForDisplay
} from '@riotprompt/riotprompt';

// Initialize
initializeErrorHandling({
    sanitizePaths: true,
    redactSecrets: true
});

// Wrap async functions
const safeFunction = withErrorHandling(async () => {
    // Your code here
});

// Format errors for display
try {
    await riskyOperation();
} catch (error) {
    const displayError = formatErrorForDisplay(error);
    console.error(displayError);  // Sanitized error message
}
```

## Logging

### Secure Logging

```typescript
import {
    configureSecureLogging,
    executeWithCorrelation,
    RiotPromptLogger
} from '@riotprompt/riotprompt';

// Configure
configureSecureLogging({
    level: 'info',
    maskSecrets: true,
    includeCorrelationId: true
});

// Execute with correlation ID
await executeWithCorrelation(async (correlationId) => {
    const logger = new RiotPromptLogger({ correlationId });
    logger.info('Processing request', { userId: '123' });
    // All logs in this context share the correlation ID
});
```

### Custom Logger Integration

```typescript
import { createConsoleLogger, wrapLogger } from '@riotprompt/riotprompt';

// Use built-in console logger
const logger = createConsoleLogger({ level: 'debug' });

// Wrap existing logger
const wrapped = wrapLogger(myExistingLogger, 'MyComponent');

// Pass to components
const conversation = ConversationBuilder.create(
    { model: 'gpt-4o' },
    logger
);
```

## Complete Integration Example

Here's a complete example showing how to integrate RiotPrompt into an application:

```typescript
import {
    cook,
    registerTemplates,
    ConversationBuilder,
    ToolRegistry,
    StrategyExecutor,
    IterationStrategyFactory,
    configureModel,
    configureSecureLogging
} from '@riotprompt/riotprompt';
import { z } from 'zod';

// 1. Configure security
configureSecureLogging({
    maskSecrets: true,
    level: 'info'
});

// 2. Register custom models (if needed)
configureModel({
    exactMatch: 'my-custom-model',
    personaRole: 'system',
    encoding: 'cl100k_base',
    family: 'custom'
});

// 3. Register templates
registerTemplates({
    'code-assistant': {
        persona: { content: 'You are an expert software engineer.' },
        constraints: [{ content: 'Write clean, maintainable code.' }],
        tone: [{ content: 'Be helpful and educational.' }]
    }
});

// 4. Define output schema
const CodeReviewSchema = z.object({
    issues: z.array(z.object({
        severity: z.enum(['critical', 'warning', 'info']),
        line: z.number().optional(),
        message: z.string(),
        suggestion: z.string().optional()
    })),
    summary: z.string(),
    score: z.number().min(0).max(100)
});

// 5. Create tools
const toolRegistry = ToolRegistry.create({ workingDirectory: process.cwd() });

toolRegistry.register({
    name: 'read_file',
    description: 'Read a source file',
    category: 'filesystem',
    parameters: {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'File path' }
        },
        required: ['path']
    },
    execute: async ({ path }) => {
        const fs = await import('fs/promises');
        return await fs.readFile(path, 'utf-8');
    }
});

toolRegistry.register({
    name: 'list_files',
    description: 'List files in a directory',
    category: 'filesystem',
    parameters: {
        type: 'object',
        properties: {
            directory: { type: 'string', description: 'Directory path' }
        },
        required: ['directory']
    },
    execute: async ({ directory }) => {
        const fs = await import('fs/promises');
        return await fs.readdir(directory);
    }
});

// 6. Create prompt
async function createCodeReviewPrompt(prDescription: string) {
    return await cook({
        basePath: __dirname,
        template: 'code-assistant',
        instructions: [
            { content: 'Review the code changes in this pull request.' },
            { content: 'Use tools to read the relevant files.' },
            { content: 'Identify bugs, security issues, and improvements.' }
        ],
        content: [
            { content: prDescription, title: 'Pull Request' }
        ],
        schema: CodeReviewSchema,
        tools: toolRegistry,
        toolGuidance: 'detailed'
    });
}

// 7. Create LLM client
function createLLMClient(apiKey: string) {
    return {
        async complete(messages: any[], tools?: any[]) {
            // Your LLM provider integration
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages,
                    tools
                })
            });
            
            const data = await response.json();
            return {
                content: data.choices[0].message.content,
                tool_calls: data.choices[0].message.tool_calls
            };
        }
    };
}

// 8. Execute agentic workflow
async function reviewPullRequest(prDescription: string, apiKey: string) {
    const prompt = await createCodeReviewPrompt(prDescription);
    
    const conversation = ConversationBuilder.create({ model: 'gpt-4o' })
        .fromPrompt(prompt, 'gpt-4o')
        .withTokenBudget({ max: 100000, reserve: 4000 })
        .withLogging({ outputPath: './logs', format: 'json' })
        .build();
    
    const llmClient = createLLMClient(apiKey);
    
    const executor = new StrategyExecutor(llmClient)
        .withReflection({
            enabled: true,
            outputPath: './reflections',
            format: 'markdown'
        });
    
    const result = await executor.execute(
        conversation,
        toolRegistry,
        IterationStrategyFactory.investigateThenRespond({
            maxInvestigationSteps: 10,
            requireMinimumTools: 2
        })
    );
    
    // Save conversation log
    await conversation.saveLog();
    
    return {
        review: result.finalMessage?.content,
        iterations: result.totalIterations,
        toolsUsed: result.toolCallsExecuted,
        reflection: result.reflection
    };
}

// Usage
const result = await reviewPullRequest(
    'Add user authentication with JWT tokens',
    process.env.OPENAI_API_KEY!
);

console.log('Review:', result.review);
console.log('Completed in', result.iterations, 'iterations');
```

## Type Reference

### Core Types

```typescript
import type {
    // Prompt structure
    Prompt,
    Section,
    Content,
    Context,
    Instruction,
    Weighted,
    Parameters,
    
    // Recipes
    RecipeConfig,
    ContentItem,
    TemplateConfig,
    ToolGuidanceConfig,
    
    // Conversation
    ConversationMessage,
    ConversationBuilderConfig,
    ConversationMetadata,
    ToolCall,
    InjectOptions,
    
    // Tools
    Tool,
    ToolParameter,
    ToolContext,
    ToolDefinition,
    ToolUsageStats,
    
    // Strategies
    IterationStrategy,
    StrategyPhase,
    StrategyState,
    StrategyResult,
    ToolUsagePolicy,
    
    // Reflection
    ReflectionReport,
    ReflectionConfig,
    
    // Model config
    ModelConfig,
    PersonaRole,
    
    // Security
    SecurityConfig,
    PathSecurityConfig
} from '@riotprompt/riotprompt';
```

## Next Steps

- [Architecture](./architecture.md): Understand the internal design
- [Configuration](./configuration.md): Deep dive into configuration options
- [Security](./security.md): Security best practices
- [Usage Patterns](./usage.md): CLI and common patterns
