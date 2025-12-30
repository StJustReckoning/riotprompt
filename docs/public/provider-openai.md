# OpenAI Provider

RiotPrompt provides seamless integration with OpenAI models, automatically adapting your prompts to meet OpenAI's API expectations.

## Supported Models

RiotPrompt works with all OpenAI chat models, including:

- **GPT-4 Series**: `gpt-4`, `gpt-4-turbo`, `gpt-4o`, `gpt-4o-mini`
- **GPT-3.5**: `gpt-3.5-turbo`
- **O-Series (Reasoning Models)**: `o1`, `o1-mini`, `o1-preview`

For a complete list of available models, see the [OpenAI Models Documentation](https://platform.openai.com/docs/models).

## Getting Started

### API Key Setup

Get your OpenAI API key from the [OpenAI Platform](https://platform.openai.com/api-keys).

Set it as an environment variable:

```bash
export OPENAI_API_KEY=sk-proj-...
```

Or use a `.env` file:

```bash
OPENAI_API_KEY=sk-proj-...
```

### Basic Usage

```typescript
import { cook, executeChat } from 'riotprompt';

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a helpful AI assistant' },
  instructions: [
    { content: 'Provide clear and concise answers' }
  ],
  content: [
    { content: 'What is machine learning?' }
  ]
});

const result = await executeChat(prompt, {
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY
});

console.log(result.content);
```

## How RiotPrompt Adapts to OpenAI

### Message Role Handling

RiotPrompt automatically maps prompt sections to appropriate OpenAI message roles:

#### Standard Models (GPT-4, GPT-3.5)

- **Persona, Constraints, Tone** → `system` role
- **Instructions, Context, Content** → `user` role
- **Examples** → `user` role (formatted as few-shot examples)

```typescript
// This prompt structure:
const prompt = await cook({
  persona: { content: 'You are an expert programmer' },
  constraints: [{ content: 'Keep responses under 500 words' }],
  instructions: [{ content: 'Explain this code' }],
  content: [{ content: codeSnippet }]
});

// Becomes OpenAI messages:
[
  {
    role: "system",
    content: "You are an expert programmer\n\nKeep responses under 500 words"
  },
  {
    role: "user",
    content: "Explain this code\n\n{codeSnippet}"
  }
]
```

#### O-Series Models (o1, o1-mini)

O-series models use a special `developer` role instead of `system`:

- **Persona, Constraints, Tone** → `developer` role
- **Instructions, Context, Content** → `user` role

RiotPrompt automatically detects o-series models and uses the correct role.

```typescript
const prompt = await cook({
  persona: { content: 'You are a reasoning expert' },
  instructions: [{ content: 'Think through this problem step by step' }]
});

// When used with o1:
const result = await executeChat(prompt, {
  model: 'o1',  // Automatically uses 'developer' role
});
```

### Structured Outputs

OpenAI has excellent support for structured outputs using JSON Schema. RiotPrompt automatically converts Zod schemas to OpenAI's format:

```typescript
import { z } from 'zod';

const schema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  sentiment: z.enum(['positive', 'negative', 'neutral'])
});

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a content analyst' },
  content: [{ content: article }],
  schema: schema
});

// RiotPrompt converts to OpenAI format:
{
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "response",
      schema: { /* JSON Schema from your Zod schema */ }
    }
  }
}
```

The structured output is automatically validated against your Zod schema.

[Learn more about Structured Outputs →](structured-outputs)

### Response Format Options

OpenAI supports several response format options:

1. **Text** (default) - Standard text responses
2. **JSON Schema** - Structured outputs with validation (recommended)
3. **JSON Mode** - Free-form JSON (less structured than JSON Schema)

RiotPrompt uses JSON Schema mode when you provide a `schema` option, ensuring type-safe, validated responses.

## Best Practices for OpenAI

### 1. Choose the Right Model

- **GPT-4o**: Best for most tasks, excellent balance of speed and capability
- **GPT-4o-mini**: Fast and cost-effective for simpler tasks
- **GPT-4**: Highest quality for complex reasoning
- **O-series**: Best for tasks requiring deep reasoning and problem-solving

### 2. Use System Messages Effectively

OpenAI models respond well to clear system messages (personas):

```typescript
const prompt = await cook({
  persona: {
    content: `You are an expert Python developer with 15 years of experience.
You specialize in writing clean, maintainable code and explaining complex concepts clearly.`
  },
  // ...
});
```

### 3. Structure Your Prompts

Organize prompts with clear sections:

```typescript
const prompt = await cook({
  persona: { content: 'You are a code reviewer' },
  constraints: [
    { content: 'Focus on security and performance' },
    { content: 'Provide specific line numbers for issues' }
  ],
  context: [
    { content: projectDescription, title: 'Project Context' }
  ],
  instructions: [
    { content: 'Review the code for potential issues' }
  ],
  content: [
    { content: sourceCode, title: 'Code to Review' }
  ]
});
```

### 4. Use Structured Outputs for Parseable Data

When you need JSON output, always use schemas:

```typescript
// ✅ Good: Type-safe and validated
const schema = z.object({
  issues: z.array(z.object({
    line: z.number(),
    severity: z.enum(['low', 'medium', 'high']),
    description: z.string()
  }))
});

const prompt = await cook({
  // ...
  schema: schema
});

// ❌ Avoid: Asking for JSON without schema
const prompt = await cook({
  instructions: [
    { content: 'Return your response as JSON' }  // Unreliable
  ]
});
```

### 5. Temperature and Token Settings

Adjust parameters based on your use case:

```typescript
// For factual, consistent responses
const result = await executeChat(prompt, {
  model: 'gpt-4o',
  temperature: 0.2,    // Low temperature for consistency
  maxTokens: 1000
});

// For creative tasks
const result = await executeChat(prompt, {
  model: 'gpt-4o',
  temperature: 0.8,    // Higher temperature for creativity
  maxTokens: 2000
});
```

### 6. Token Efficiency

GPT-4 models can be expensive. Optimize token usage:

- Use `gpt-4o-mini` for simpler tasks
- Keep system messages concise
- Use structured outputs to avoid parsing overhead
- Set appropriate `maxTokens` limits

```typescript
const prompt = await cook({
  persona: { content: 'You are a helpful assistant' },  // Concise
  instructions: [
    { content: 'Answer in 2-3 sentences' }  // Limit response length
  ],
  content: [{ content: question }]
});
```

## Token Counting

RiotPrompt includes token counting utilities for OpenAI models:

```typescript
import { countTokens } from 'riotprompt';

const prompt = await cook({
  // ... your prompt
});

const tokenCount = countTokens(prompt, 'gpt-4o');
console.log(`Estimated tokens: ${tokenCount}`);
```

## Error Handling

Handle common OpenAI errors gracefully:

```typescript
try {
  const result = await executeChat(prompt, {
    model: 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY
  });
} catch (error) {
  if (error.status === 401) {
    console.error('Invalid API key');
  } else if (error.status === 429) {
    console.error('Rate limit exceeded');
  } else if (error.status === 500) {
    console.error('OpenAI server error');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Model-Specific Features

### GPT-4o and GPT-4o-mini

- Fast response times
- Excellent structured output support
- Native function calling
- Vision capabilities (when using image inputs)

### O-Series Models (o1, o1-mini)

- Extended thinking time for complex problems
- Uses `developer` role (automatically handled by RiotPrompt)
- Best for reasoning, math, and coding problems
- Higher token costs but superior reasoning

```typescript
// RiotPrompt automatically adapts for o1
const prompt = await cook({
  persona: { content: 'Solve this step by step' },
  reasoning: [
    { content: 'Show your work at each step' }
  ],
  content: [{ content: mathProblem }]
});

const result = await executeChat(prompt, {
  model: 'o1'  // Uses 'developer' role automatically
});
```

## Official OpenAI Resources

- **[OpenAI Platform](https://platform.openai.com/)** - Main platform and dashboard
- **[API Documentation](https://platform.openai.com/docs/api-reference)** - Complete API reference
- **[Models Documentation](https://platform.openai.com/docs/models)** - Model capabilities and pricing
- **[Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)** - Best practices from OpenAI
- **[Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)** - JSON Schema format details
- **[Rate Limits](https://platform.openai.com/docs/guides/rate-limits)** - Understanding rate limits
- **[Usage Policies](https://openai.com/policies/usage-policies)** - Usage guidelines

## Related Documentation

- [Structured Outputs](structured-outputs) - Complete guide to schemas
- [Anthropic Provider](provider-anthropic) - Claude integration
- [Gemini Provider](provider-gemini) - Google Gemini integration
- [Recipes System](recipes) - Advanced prompt creation
- [CLI Execute Command](cli-execute) - Execute from command line

