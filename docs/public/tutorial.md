# Tutorial

This tutorial walks through creating prompts with RiotPrompt using the Builder API.

## Prerequisites

- Node.js 24 or later
- An API key for OpenAI, Anthropic, or Google Gemini

## Installation

```bash
npm install @kjerneverk/riotprompt
```

## Your First Prompt

Create a simple prompt and execute it:

```typescript
import { Builder, Formatter, Execution } from '@kjerneverk/riotprompt';

// Build a prompt
const prompt = await Builder.create({ basePath: __dirname })
  .addPersona('You are a helpful AI assistant.')
  .addInstruction('Provide clear and concise answers.')
  .addContent('What is machine learning?')
  .build();

// Format for your model
const formatter = Formatter.create();
const request = formatter.formatPrompt('gpt-4o', prompt);

// Execute
const result = await Execution.execute(request, {
  apiKey: process.env.OPENAI_API_KEY!,
});

console.log(result.content);
```

## Using Files

In practice, you'll want to load prompts from files. Create this directory structure:

```
my-app/
├── persona/
│   └── default.md          # "You are a helpful AI assistant."
├── instructions/
│   └── answer.md           # "Provide clear and concise answers."
├── content/
│   └── question.txt         # "What is machine learning?"
└── index.ts
```

```typescript
import { Builder, Formatter, Execution } from '@kjerneverk/riotprompt';

const prompt = await Builder.create({ basePath: __dirname })
  .addPersonaPath('persona/default.md')
  .addInstructionPath('instructions/answer.md')
  .addContentPath('content/question.txt')
  .build();

const formatter = Formatter.create();
const request = formatter.formatPrompt('gpt-4o', prompt);
const result = await Execution.execute(request, {
  apiKey: process.env.OPENAI_API_KEY!,
});

console.log(result.content);
```

## Loading Content from Directories

Load all files from a directory as content:

```typescript
const prompt = await Builder.create({ basePath: __dirname })
  .addPersonaPath('persona/default.md')
  .addInstructionPath('instructions/analyze.md')
  .loadContent(['data/reports', 'data/logs'])
  .build();
```

## Adding Context

Context provides background information separate from the main content:

```typescript
const prompt = await Builder.create({ basePath: __dirname })
  .addPersonaPath('persona/default.md')
  .addInstructionPath('instructions/analyze.md')
  .addContext('Previous analysis showed a 15% growth trend.')
  .addContent('Q3 2024 revenue: $2.1M')
  .build();
```

## Structured Outputs

Get structured, parseable responses using JSON Schema:

```typescript
import { Builder, Formatter, Execution } from '@kjerneverk/riotprompt';

const prompt = await Builder.create({ basePath: __dirname })
  .addPersona('You are a data analyst.')
  .addInstruction('Analyze the data and provide a structured response.')
  .addContent('Q1: $1.2M, Q2: $1.5M, Q3: $1.8M')
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

const analysis = JSON.parse(result.content);
console.log(analysis.summary);
console.log(analysis.trend);
console.log(analysis.confidence);
```

### Using Zod for Schema Definition

For better TypeScript integration, use [Zod](https://zod.dev):

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

// Validate the response with Zod
const parsed = responseSchema.parse(JSON.parse(result.content));
console.log(parsed.summary);
```

## Using Different Providers

RiotPrompt supports OpenAI, Anthropic, and Google Gemini. The Formatter automatically maps to the correct system role for each provider:

```typescript
// OpenAI
const openaiRequest = formatter.formatPrompt('gpt-4o', prompt);
const openaiResult = await Execution.execute(openaiRequest, {
  apiKey: process.env.OPENAI_API_KEY!,
});

// Anthropic
const anthropicRequest = formatter.formatPrompt('claude-3-5-sonnet-20241022', prompt);
const anthropicResult = await Execution.execute(anthropicRequest, {
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Gemini
const geminiRequest = formatter.formatPrompt('gemini-2.0-flash', prompt);
const geminiResult = await Execution.execute(geminiRequest, {
  apiKey: process.env.GOOGLE_API_KEY!,
});
```

## Override System

The override system lets you customize prompts without modifying the source files:

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

### Error Handling

```typescript
try {
  const result = await Execution.execute(request, {
    apiKey: process.env.OPENAI_API_KEY!,
  });
  console.log(result.content);
} catch (error) {
  console.error('API error:', error);
}
```

## Next Steps

- [Builder API](builder.md) - Full API reference
- [Core Concepts](core-concepts.md) - Understanding prompts, sections, and items
- [Override System](override.md) - Hierarchical customization
- [Structured Outputs](structured-outputs.md) - JSON Schema responses
- [OpenAI Provider](provider-openai.md) - Provider-specific details
- [Anthropic Provider](provider-anthropic.md) - Provider-specific details
- [Gemini Provider](provider-gemini.md) - Provider-specific details

For agentic workflows (conversation management, tool use, iteration strategies, reflection), see the companion [`@kjerneverk/agentic`](https://github.com/kjerneverk/agentic) package.
