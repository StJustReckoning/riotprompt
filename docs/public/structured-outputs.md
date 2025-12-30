# Structured Outputs

RiotPrompt provides powerful support for structured outputs using JSON schemas, allowing you to ensure that LLM responses conform to a specific format. This feature works seamlessly across OpenAI, Anthropic (Claude), and Google Gemini with automatic schema conversion.

## What are Structured Outputs?

Structured outputs allow you to define a schema that the LLM must follow when generating responses. Instead of receiving free-form text, you get JSON data that conforms to your specified structure.

**Benefits:**
- **Type Safety**: Define exactly what fields and types you expect
- **Validation**: Automatic validation of LLM responses
- **Consistency**: Get predictable, parseable responses every time
- **Integration**: Easily integrate LLM responses into your application logic

## Using Zod Schemas

RiotPrompt uses [Zod](https://zod.dev/) for schema definition, providing excellent TypeScript integration and validation.

### Basic Example

```typescript
import { cook } from 'riotprompt';
import { z } from 'zod';

// Define your schema
const responseSchema = z.object({
  summary: z.string(),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1)
});

// Create a prompt with structured output
const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a content analyst' },
  instructions: [
    { content: 'Analyze the provided content and extract key information' }
  ],
  content: [
    { content: articleText, title: 'Article' }
  ],
  schema: responseSchema
});
```

### Executing with Validation

When you execute a prompt with a schema, RiotPrompt automatically validates the response:

```typescript
import { executeChat } from 'riotprompt';

const result = await executeChat(prompt, {
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY
});

// result.content is automatically validated against your schema
console.log(result.content.summary);
console.log(result.content.tags);
console.log(result.content.confidence);
```

## How It Works Across Providers

RiotPrompt automatically converts your Zod schema to the format required by each LLM provider:

### OpenAI

For OpenAI models, RiotPrompt:
1. Converts your Zod schema to JSON Schema format
2. Wraps it in OpenAI's `json_schema` response format structure
3. Uses the `response_format` parameter to enforce the schema

```typescript
// Your Zod schema is automatically converted to:
{
  type: "json_schema",
  json_schema: {
    name: "response",
    schema: { /* your JSON schema */ }
  }
}
```

### Anthropic (Claude)

For Anthropic models, RiotPrompt:
1. Converts your schema to Anthropic's Tool Use format
2. Creates a forced tool call with your schema as the input schema
3. Extracts the structured result to match the expected format

```typescript
// Your schema becomes a tool that Claude must call:
{
  name: "response",
  description: "Output data in this structured format",
  input_schema: { /* your JSON schema */ }
}
```

This approach leverages Claude's tool use capabilities to ensure structured outputs.

### Google Gemini

For Gemini models, RiotPrompt:
1. Converts your schema to Gemini's Schema format
2. Uses the `responseSchema` generation config parameter
3. Maps type names to Gemini's expected format (e.g., `"object"` → `"OBJECT"`)

```typescript
// Your schema is converted to Gemini's format:
generationConfig: {
  responseSchema: {
    type: "OBJECT",
    properties: { /* your schema properties */ }
  }
}
```

## Common Use Cases

### 1. Content Analysis

Extract structured information from text:

```typescript
const analysisSchema = z.object({
  mainTopic: z.string().describe('The primary topic of the content'),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  keyPoints: z.array(z.string()).describe('3-5 key points'),
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['person', 'organization', 'location', 'other'])
  })),
  readingLevel: z.enum(['beginner', 'intermediate', 'advanced'])
});

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a content analysis expert' },
  instructions: [
    { content: 'Analyze the content and extract structured information' }
  ],
  content: [{ content: document }],
  schema: analysisSchema
});
```

### 2. Code Review

Generate structured code review feedback:

```typescript
const codeReviewSchema = z.object({
  overallScore: z.number().min(0).max(10),
  issues: z.array(z.object({
    severity: z.enum(['critical', 'major', 'minor', 'suggestion']),
    line: z.number().optional(),
    description: z.string(),
    recommendation: z.string()
  })),
  strengths: z.array(z.string()),
  securityConcerns: z.array(z.string()),
  performanceIssues: z.array(z.string()),
  summary: z.string()
});

const prompt = await cook({
  basePath: __dirname,
  template: 'codeReview',
  content: [{ content: sourceCode, title: 'Code to Review' }],
  schema: codeReviewSchema
});
```

### 3. Data Extraction

Extract specific data from unstructured text:

```typescript
const extractionSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  interests: z.array(z.string()),
  yearsOfExperience: z.number().optional()
});

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a data extraction specialist' },
  instructions: [
    { content: 'Extract contact information from the provided text' }
  ],
  content: [{ content: resumeText }],
  schema: extractionSchema
});
```

### 4. Multi-Step Reasoning

Get step-by-step reasoning with structured output:

```typescript
const reasoningSchema = z.object({
  problem: z.string().describe('Restated problem'),
  steps: z.array(z.object({
    stepNumber: z.number(),
    description: z.string(),
    reasoning: z.string(),
    result: z.string()
  })),
  finalAnswer: z.string(),
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string())
});

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a logical reasoning expert' },
  instructions: [
    { content: 'Solve the problem step by step' }
  ],
  reasoning: [
    { content: 'Show your work at each step' }
  ],
  content: [{ content: problemDescription }],
  schema: reasoningSchema
});
```

### 5. Classification Tasks

Classify content into predefined categories:

```typescript
const classificationSchema = z.object({
  primaryCategory: z.enum(['technology', 'business', 'science', 'arts', 'sports', 'politics']),
  subCategories: z.array(z.string()),
  tags: z.array(z.string()).max(10),
  confidence: z.object({
    primaryCategory: z.number().min(0).max(1),
    overall: z.number().min(0).max(1)
  }),
  justification: z.string()
});

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a content classification expert' },
  instructions: [
    { content: 'Classify the article into appropriate categories' }
  ],
  content: [{ content: article }],
  schema: classificationSchema
});
```

## Schema from File

You can also load schemas from JSON files:

```typescript
// schema.json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "number" }
  },
  "required": ["name"]
}

// In your code
const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a data processor' },
  schema: './schema.json'  // Path to schema file
});
```

## Schema as Plain Object

You can also pass a plain JSON Schema object:

```typescript
const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a helpful assistant' },
  schema: {
    type: "object",
    properties: {
      answer: { type: "string" },
      confidence: { type: "number", minimum: 0, maximum: 1 }
    },
    required: ["answer", "confidence"]
  }
});
```

## Automatic Validation

When you use a Zod schema, RiotPrompt automatically validates the LLM's response:

```typescript
const schema = z.object({
  name: z.string(),
  age: z.number().positive()
});

const prompt = await cook({
  basePath: __dirname,
  schema: schema  // Validation is automatic
});

const result = await executeChat(prompt, { model: 'gpt-4o' });

// If validation fails, an error is thrown
// If successful, result.content is typed and validated
```

## Best Practices

### 1. Use Descriptions

Add descriptions to help the LLM understand what you expect:

```typescript
const schema = z.object({
  summary: z.string().describe('A concise summary in 2-3 sentences'),
  keyPoints: z.array(z.string()).describe('3-5 most important points'),
  sentiment: z.enum(['positive', 'negative', 'neutral']).describe('Overall sentiment of the content')
});
```

### 2. Set Appropriate Constraints

Use Zod's validation methods to enforce constraints:

```typescript
const schema = z.object({
  title: z.string().min(10).max(100),
  tags: z.array(z.string()).min(1).max(5),
  score: z.number().min(0).max(100).int(),
  email: z.string().email().optional()
});
```

### 3. Use Enums for Fixed Options

When you have a fixed set of options, use enums:

```typescript
const schema = z.object({
  category: z.enum(['bug', 'feature', 'improvement', 'documentation']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'in-progress', 'resolved', 'closed'])
});
```

### 4. Keep Schemas Focused

Don't make your schemas too complex. Break down complex tasks:

```typescript
// Instead of one huge schema
// Break it into focused steps

// Step 1: Extract data
const extractionSchema = z.object({ /* ... */ });

// Step 2: Analyze data
const analysisSchema = z.object({ /* ... */ });

// Step 3: Generate recommendations
const recommendationSchema = z.object({ /* ... */ });
```

### 5. Provide Examples

Use the `examples` section in your prompt to show the LLM what you expect:

```typescript
const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a data extractor' },
  examples: [
    {
      content: JSON.stringify({
        input: 'John Doe works at Acme Corp',
        output: { name: 'John Doe', company: 'Acme Corp' }
      }, null, 2)
    }
  ],
  schema: extractionSchema
});
```

## Limitations and Considerations

### Token Limits

Structured outputs can increase token usage:
- The schema is sent with each request
- Some providers (like Anthropic) require additional prompt formatting

### Model Support

Not all models support structured outputs equally well:
- **OpenAI**: Excellent support, especially with GPT-4 and GPT-4o
- **Anthropic**: Good support via tool use (Claude 3+ models)
- **Gemini**: Good support with Gemini 1.5+ models

### Schema Complexity

Very complex schemas may:
- Confuse some models
- Increase latency
- Require more tokens

Keep schemas as simple as possible while meeting your requirements.

## Troubleshooting

### Schema Validation Errors

If you're getting validation errors:

1. **Check your schema constraints**: Make sure they're not too restrictive
2. **Add descriptions**: Help the LLM understand what you want
3. **Simplify the schema**: Complex nested structures can be challenging
4. **Provide examples**: Show the LLM what successful output looks like

### Model Not Following Schema

If the model isn't following your schema:

1. **Add clear instructions**: Explicitly tell the model to follow the schema
2. **Use examples**: Show what correct output looks like
3. **Try a different model**: Some models handle structured outputs better
4. **Check schema compatibility**: Ensure your schema features are supported

## Related Documentation

- [Recipes System](recipes) - Learn about the `cook()` function
- [API Reference](api-reference) - Complete API documentation
- [CLI Execute Command](cli-execute) - Execute prompts from the command line
- [Advanced Usage](advanced-usage) - Advanced prompt engineering techniques

