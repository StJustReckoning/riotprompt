# OpenAI Provider

This guide shows how to use RiotPrompt with OpenAI models (GPT-4o, GPT-4, GPT-3.5 Turbo, etc.).

## Installation

```bash
npm install @kjerneverk/riotprompt
```

## Quick Start

```typescript
import { Builder, Formatter, Execution } from '@kjerneverk/riotprompt';

// Build a prompt
const prompt = await Builder.create({ basePath: __dirname })
  .addPersona('You are a helpful AI assistant.')
  .addInstruction('Provide clear and concise answers.')
  .addContent('What is machine learning?')
  .build();

// Format for OpenAI
const formatter = Formatter.create();
const request = formatter.formatPrompt('gpt-4o', prompt);

// Execute
const result = await Execution.execute(request, {
  apiKey: process.env.OPENAI_API_KEY!,
});

console.log(result.content);
```

## Using Files

Load persona, instructions, and content from files:

```typescript
import { Builder, Formatter, Execution } from '@kjerneverk/riotprompt';

const prompt = await Builder.create({ basePath: __dirname })
  .addPersonaPath('persona/default.md')
  .addInstructionPath('instructions/analyze.md')
  .addContentPath('data/report.txt')
  .build();

const formatter = Formatter.create();
const request = formatter.formatPrompt('gpt-4o', prompt);
const result = await Execution.execute(request, {
  apiKey: process.env.OPENAI_API_KEY!,
});
```

## Structured Outputs

Use JSON Schema for structured responses:

```typescript
import { Builder, Formatter, Execution } from '@kjerneverk/riotprompt';

const prompt = await Builder.create({ basePath: __dirname })
  .addPersona('You are a data analyst.')
  .addInstruction('Analyze the following data and provide a structured response.')
  .addContent('Q1 revenue: $1.2M, Q2 revenue: $1.5M, Q3 revenue: $1.8M')
  .withSchema({
    type: "json_schema",
    json_schema: {
      name: "analysis",
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          trend: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["summary", "trend", "confidence"],
        additionalProperties: false,
      },
      strict: true,
    },
  })
  .build();

const formatter = Formatter.create();
const request = formatter.formatPrompt('gpt-4o', prompt);
const result = await Execution.execute(request, {
  apiKey: process.env.OPENAI_API_KEY!,
});

// result.content is a JSON string matching the schema
const analysis = JSON.parse(result.content);
console.log(analysis.summary);
```

### Using Zod for Schema Definition

You can use [Zod](https://zod.dev) to define schemas and convert them to JSON Schema:

```typescript
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { Builder, Formatter, Execution } from '@kjerneverk/riotprompt';

const responseSchema = z.object({
  summary: z.string(),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

const jsonSchema = zodToJsonSchema(responseSchema, "response");
const actualSchema = (jsonSchema as any).definitions?.response || jsonSchema;

const prompt = await Builder.create({ basePath: __dirname })
  .addPersona('You are a helpful assistant.')
  .addContent('Analyze this text: ...')
  .withSchema({
    type: "json_schema",
    json_schema: {
      name: "response",
      schema: actualSchema,
      strict: true,
    },
  })
  .build();

const formatter = Formatter.create();
const request = formatter.formatPrompt('gpt-4o', prompt);
const result = await Execution.execute(request, {
  apiKey: process.env.OPENAI_API_KEY!,
});
```

## Model Selection

RiotPrompt automatically maps model names to the correct system role:

| Model | System Role | Notes |
|-------|-------------|-------|
| `gpt-4o` | `system` | Latest multimodal model |
| `gpt-4o-mini` | `system` | Cost-effective option |
| `gpt-4-turbo` | `system` | Previous generation |
| `gpt-3.5-turbo` | `system` | Legacy model |
| `o1` | `developer` | Reasoning model (uses developer role) |
| `o3-mini` | `developer` | Cost-effective reasoning model |

```typescript
// The formatter handles role mapping automatically
const formatter = Formatter.create();
const request = formatter.formatPrompt('o1', prompt);
// Messages will use "developer" role instead of "system"
```

## Advanced Configuration

### Temperature and Max Tokens

```typescript
const result = await Execution.execute(request, {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2000,
});
```

### Loading Content from Directories

```typescript
const prompt = await Builder.create({ basePath: __dirname })
  .addPersonaPath('persona/default.md')
  .addInstructionPath('instructions/analyze.md')
  .loadContent(['data/reports', 'data/logs'])
  .build();
```

### Override System

Override specific sections without modifying files:

```typescript
const prompt = await Builder.create({
  basePath: __dirname,
  overrides: true,
})
  .addPersonaPath('persona/default.md')
  .addInstructionPath('instructions/analyze.md')
  .addContent('Override content here')
  .build();
```

## Error Handling

```typescript
try {
  const result = await Execution.execute(request, {
    apiKey: process.env.OPENAI_API_KEY!,
  });
  console.log(result.content);
} catch (error) {
  console.error('OpenAI API error:', error);
}
```

## Related

- [Builder API](builder.md) - Programmatic prompt creation
- [Core Concepts](core-concepts.md) - Understanding prompts, sections, and items
- [Override System](override.md) - Hierarchical customization
- [Anthropic Provider](provider-anthropic.md) - Using with Claude models
- [Gemini Provider](provider-gemini.md) - Using with Google Gemini models
