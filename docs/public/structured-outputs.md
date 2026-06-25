# Structured Outputs

RiotPrompt supports structured outputs (JSON Schema) for all providers, enabling type-safe responses from LLMs.

## Overview

Structured outputs allow you to specify a JSON Schema that the LLM must follow in its response. This is useful for:

- Data extraction
- Classification tasks
- Multi-field analysis
- Any scenario where you need predictable, parseable responses

## Basic Usage

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
console.log(analysis.summary);  // "Revenue shows consistent growth..."
console.log(analysis.trend);    // "increasing"
console.log(analysis.confidence); // 0.95
```

## Using Zod for Schema Definition

For better type safety, use [Zod](https://zod.dev) to define schemas and convert them to JSON Schema:

```typescript
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';
import { Builder, Formatter, Execution } from '@kjerneverk/riotprompt';

// Define your response schema with Zod
const responseSchema = z.object({
  summary: z.string(),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// Convert to JSON Schema
const jsonSchema = zodToJsonSchema(responseSchema, "response");
const actualSchema = (jsonSchema as any).definitions?.response || jsonSchema;

const prompt = await Builder.create({ basePath: __dirname })
  .addPersona('You are a helpful assistant.')
  .addInstruction('Analyze the following text and provide a structured response.')
  .addContent('The new product launch exceeded expectations...')
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

// Parse and validate with Zod
const parsed = responseSchema.parse(JSON.parse(result.content));
console.log(parsed.summary);
console.log(parsed.tags);
```

## Provider Compatibility

### OpenAI

OpenAI supports structured outputs natively with `strict: true`. The schema is passed as `response_format` in the API call.

```typescript
const request = formatter.formatPrompt('gpt-4o', prompt);
// Formatter automatically sets request.responseFormat from prompt.schema
```

### Anthropic

Anthropic supports JSON output via system prompts. The schema is included in the formatted messages.

```typescript
const request = formatter.formatPrompt('claude-3-5-sonnet-20241022', prompt);
```

### Gemini

Gemini supports structured outputs via `responseMimeType` and `responseSchema`.

```typescript
const request = formatter.formatPrompt('gemini-2.0-flash', prompt);
```

## Advanced Patterns

### Nested Objects

```typescript
const schema = {
  type: "json_schema",
  json_schema: {
    name: "report",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["heading", "content", "priority"],
            additionalProperties: false,
          },
        },
        metadata: {
          type: "object",
          properties: {
            author: { type: "string" },
            date: { type: "string" },
          },
          required: ["author", "date"],
          additionalProperties: false,
        },
      },
      required: ["title", "sections", "metadata"],
      additionalProperties: false,
    },
    strict: true,
  },
};

const prompt = await Builder.create({ basePath: __dirname })
  .addPersona('You are a report generator.')
  .addContent('Generate a quarterly report for Q3 2024...')
  .withSchema(schema)
  .build();
```

### Enum Constraints

```typescript
const schema = {
  type: "json_schema",
  json_schema: {
    name: "classification",
    schema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["bug", "feature", "question", "other"] },
        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
        description: { type: "string" },
      },
      required: ["category", "priority", "description"],
      additionalProperties: false,
    },
    strict: true,
  },
};

const prompt = await Builder.create({ basePath: __dirname })
  .addPersona('You are a support ticket classifier.')
  .addContent('The app crashes when I click submit...')
  .withSchema(schema)
  .build();
```

### Combining with File-Based Content

```typescript
const prompt = await Builder.create({ basePath: __dirname })
  .addPersonaPath('persona/analyst.md')
  .addInstructionPath('instructions/extract.md')
  .addContentPath('data/customer-feedback.txt')
  .withSchema({
    type: "json_schema",
    json_schema: {
      name: "feedback_analysis",
      schema: {
        type: "object",
        properties: {
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          keyPoints: { type: "array", items: { type: "string" } },
          actionItems: { type: "array", items: { type: "string" } },
        },
        required: ["sentiment", "keyPoints", "actionItems"],
        additionalProperties: false,
      },
      strict: true,
    },
  })
  .build();
```

## Validation

Always validate the LLM response, even with structured outputs:

```typescript
import { z } from 'zod';

const responseSchema = z.object({
  summary: z.string(),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

try {
  const parsed = responseSchema.parse(JSON.parse(result.content));
  // Use the validated data
  console.log(parsed);
} catch (error) {
  console.error('Response did not match schema:', error);
}
```

## Related

- [Builder API](builder.md) - Programmatic prompt creation
- [Core Concepts](core-concepts.md) - Understanding prompts, sections, and items
- [OpenAI Provider](provider-openai.md) - Provider-specific details
- [Anthropic Provider](provider-anthropic.md) - Provider-specific details
- [Gemini Provider](provider-gemini.md) - Provider-specific details
