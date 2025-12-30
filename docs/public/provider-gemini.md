# Google Gemini Provider

RiotPrompt provides seamless integration with Google's Gemini models, automatically adapting your prompts to Gemini's API format and capabilities.

## Supported Models

RiotPrompt works with all Gemini models, including:

- **Gemini 2.0**: `gemini-2.0-flash-exp` (experimental, latest)
- **Gemini 1.5 Pro**: `gemini-1.5-pro`, `gemini-1.5-pro-latest`
- **Gemini 1.5 Flash**: `gemini-1.5-flash`, `gemini-1.5-flash-latest`, `gemini-1.5-flash-8b`
- **Gemini 1.0 Pro**: `gemini-1.0-pro`

For current model information, see the [Gemini Models Documentation](https://ai.google.dev/models/gemini).

## Getting Started

### API Key Setup

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/).

1. Sign in to Google AI Studio
2. Click "Get API key"
3. Create or select a project
4. Copy your API key

Set it as an environment variable:

```bash
export GEMINI_API_KEY=AIza...
```

Or use a `.env` file:

```bash
GEMINI_API_KEY=AIza...
```

### Basic Usage

```typescript
import { cook, executeChat } from 'riotprompt';

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a helpful AI assistant' },
  instructions: [
    { content: 'Provide comprehensive answers with examples' }
  ],
  content: [
    { content: 'Explain how neural networks work' }
  ]
});

const result = await executeChat(prompt, {
  model: 'gemini-1.5-pro',
  apiKey: process.env.GEMINI_API_KEY
});

console.log(result.content);
```

## How RiotPrompt Adapts to Gemini

### System Instruction Handling

Gemini uses `systemInstruction` as a separate configuration parameter:

```typescript
// RiotPrompt structure:
const prompt = await cook({
  persona: { content: 'You are a creative writing assistant' },
  constraints: [{ content: 'Keep responses appropriate for all ages' }],
  tone: [{ content: 'Be encouraging and supportive' }],
  instructions: [{ content: 'Help improve this story' }],
  content: [{ content: storyDraft }]
});

// Converted to Gemini format:
{
  systemInstruction: "You are a creative writing assistant\n\nKeep responses appropriate for all ages\n\nBe encouraging and supportive",
  contents: [
    {
      role: "user",
      parts: [{ text: "Help improve this story\n\n{storyDraft}" }]
    }
  ]
}
```

**Key Sections Mapped to System Instruction:**
- Persona
- Constraints
- Tone
- Safeguards

**Key Sections Mapped to User Messages:**
- Context
- Examples
- Instructions
- Content
- Reasoning
- Recap

### Structured Outputs via Response Schema

Gemini 1.5+ models support native structured outputs through the `responseSchema` parameter:

```typescript
import { z } from 'zod';

const analysisSchema = z.object({
  mainTopic: z.string(),
  keyPoints: z.array(z.string()),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  confidence: z.number().min(0).max(1)
});

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a content analyst' },
  content: [{ content: article }],
  schema: analysisSchema
});

// RiotPrompt converts to Gemini format:
{
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        mainTopic: { type: "STRING" },
        keyPoints: {
          type: "ARRAY",
          items: { type: "STRING" }
        },
        sentiment: {
          type: "STRING",
          enum: ["positive", "negative", "neutral", "mixed"]
        },
        confidence: {
          type: "NUMBER",
          minimum: 0,
          maximum: 1
        }
      },
      required: ["mainTopic", "keyPoints", "sentiment", "confidence"]
    }
  }
}
```

**Key Differences from OpenAI/Anthropic:**
- Uses uppercase type names (`OBJECT`, `STRING`, `NUMBER`, `ARRAY`, `BOOLEAN`)
- Integrated into `generationConfig` rather than as a separate parameter
- Native JSON Schema support (no tool use workaround needed)

[Learn more about Structured Outputs →](structured-outputs)

### Message Format

Gemini uses a chat-based format with history:

- **Single-turn**: Uses `generateContent()` with the prompt
- **Multi-turn**: Uses `startChat()` with message history

RiotPrompt automatically handles both scenarios.

## Best Practices for Gemini

### 1. Choose the Right Model

- **Gemini 2.0 Flash**: Experimental, cutting-edge capabilities
- **Gemini 1.5 Pro**: Best for complex reasoning and long context
- **Gemini 1.5 Flash**: Fast, efficient, great balance for most tasks
- **Gemini 1.5 Flash-8b**: Ultra-fast for high-volume, simpler tasks

### 2. Leverage Gemini's Strengths

Gemini excels at:
- Multimodal understanding (text, images, video, audio)
- Long context windows (up to 2M tokens on Pro)
- Code generation and understanding
- Multilingual tasks
- Fast inference (especially Flash models)

```typescript
const prompt = await cook({
  persona: {
    content: `You are a full-stack developer with expertise in modern web technologies.
You write clean, efficient code and explain your decisions clearly.`
  },
  constraints: [
    { content: 'Use TypeScript and modern ES6+ features' },
    { content: 'Include error handling and edge cases' }
  ],
  instructions: [
    { content: 'Implement the following feature' }
  ],
  content: [
    { content: featureDescription, title: 'Feature Requirements' }
  ]
});
```

### 3. Use Clear System Instructions

Gemini responds well to detailed system instructions:

```typescript
const prompt = await cook({
  persona: {
    content: `You are Gemini, a large language model created by Google.
You are helpful, harmless, and honest. You provide accurate information and
acknowledge when you're uncertain.`
  },
  constraints: [
    { content: 'Provide sources for factual claims when possible' },
    { content: 'Explain technical concepts in simple terms first' }
  ],
  tone: [
    { content: 'Professional yet friendly' }
  ]
});
```

### 4. Structure for Long Context

Gemini 1.5 Pro supports up to 2 million tokens:

```typescript
const prompt = await cook({
  persona: { content: 'You are a research synthesizer' },
  constraints: [
    { content: 'Reference specific sections from the documents' },
    { content: 'Identify contradictions across sources' }
  ],
  context: [
    { directories: ['./research-papers/'] }  // Can include many documents
  ],
  instructions: [
    { content: 'Synthesize findings and identify key trends' }
  ]
});
```

### 5. Structured Outputs for Data

Always use schemas for structured data:

```typescript
const extractionSchema = z.object({
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['person', 'organization', 'location', 'date']),
    context: z.string()
  })),
  relationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.string()
  })),
  summary: z.string()
});

const prompt = await cook({
  persona: { content: 'You are an information extraction specialist' },
  content: [{ content: document }],
  schema: extractionSchema
});
```

### 6. Few-Shot Examples

Gemini learns effectively from examples:

```typescript
const prompt = await cook({
  persona: { content: 'You are a text classifier' },
  examples: [
    {
      content: `Text: "This product is amazing! Highly recommend."
Classification: positive
Confidence: 0.95`
    },
    {
      content: `Text: "Terrible experience, would not buy again."
Classification: negative
Confidence: 0.90`
    },
    {
      content: `Text: "It's okay, nothing special."
Classification: neutral
Confidence: 0.75`
    }
  ],
  content: [
    { content: textToClassify }
  ],
  schema: classificationSchema
});
```

### 7. Temperature and Generation Config

Control Gemini's output characteristics:

```typescript
// For consistent, factual responses
const result = await executeChat(prompt, {
  model: 'gemini-1.5-pro',
  temperature: 0.2,   // Low for consistency
  maxTokens: 2048
});

// For creative outputs
const result = await executeChat(prompt, {
  model: 'gemini-1.5-pro',
  temperature: 1.0,   // Higher for creativity
  maxTokens: 4096
});
```

## Gemini-Specific Features

### Extended Context Windows

Gemini models support very large context windows:

- **Gemini 1.5 Pro**: Up to 2 million tokens
- **Gemini 1.5 Flash**: Up to 1 million tokens
- **Gemini 2.0 Flash**: Up to 1 million tokens

This allows for processing entire codebases, books, or large document collections in a single request.

### Multimodal Capabilities

Gemini natively supports multiple modalities:

- Text
- Images
- Video
- Audio

*(Note: RiotPrompt currently focuses on text-based prompts. For multimodal inputs, you may need to use the Gemini SDK directly.)*

### Fast Inference

Gemini Flash models are optimized for speed:

```typescript
// Use Flash for real-time applications
const result = await executeChat(prompt, {
  model: 'gemini-1.5-flash-8b',  // Ultra-fast
  temperature: 0.2
});
```

### Native JSON Mode

Gemini's structured output support is native and robust:

- No workarounds needed (unlike Claude's tool use)
- Type-safe schema validation
- Efficient token usage

## Token Efficiency

Optimize costs with Gemini:

- Use Flash models for most tasks (significantly cheaper than Pro)
- Leverage the large context window to reduce API calls
- Use structured outputs to avoid parsing overhead

```typescript
// Efficient: Process multiple items in one request
const batchSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    analysis: z.string(),
    tags: z.array(z.string())
  }))
});

const prompt = await cook({
  persona: { content: 'You are a batch processor' },
  content: [
    { content: items.join('\n---\n'), title: 'Items to Process' }
  ],
  schema: batchSchema
});
```

## Error Handling

Handle common Gemini errors:

```typescript
try {
  const result = await executeChat(prompt, {
    model: 'gemini-1.5-pro',
    apiKey: process.env.GEMINI_API_KEY
  });
} catch (error) {
  if (error.message?.includes('API key')) {
    console.error('Invalid API key');
  } else if (error.message?.includes('quota')) {
    console.error('Quota exceeded');
  } else if (error.message?.includes('blocked')) {
    console.error('Content blocked by safety filters');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Safety Settings

Gemini includes built-in safety filters. Content may be blocked if it violates safety policies. Design prompts that:

- Avoid potentially harmful content
- Include appropriate context for sensitive topics
- Use clear, professional language

```typescript
const prompt = await cook({
  persona: {
    content: 'You are a health information assistant'
  },
  constraints: [
    { content: 'Provide general information only, not medical advice' },
    { content: 'Always recommend consulting healthcare professionals' }
  ],
  safeguards: [
    { content: 'Avoid making definitive medical diagnoses' }
  ],
  content: [{ content: healthQuestion }]
});
```

## Prompt Engineering Tips

### Use Structured Instructions

Gemini responds well to clearly formatted instructions:

```typescript
const prompt = await cook({
  persona: { content: 'You are a code analyzer' },
  instructions: [
    {
      content: `Analyze the code and provide:
1. A brief summary of what the code does
2. Any potential bugs or issues
3. Suggestions for improvement
4. A rating from 1-10`
    }
  ],
  content: [
    { content: sourceCode, title: 'Code to Analyze' }
  ]
});
```

### Be Explicit with Output Format

Combine instructions with schemas for best results:

```typescript
const reportSchema = z.object({
  summary: z.string().describe('Brief 2-3 sentence summary'),
  details: z.array(z.string()).describe('Detailed bullet points'),
  recommendations: z.array(z.string()).describe('Actionable recommendations'),
  priority: z.enum(['low', 'medium', 'high', 'critical'])
});

const prompt = await cook({
  persona: { content: 'You are a security auditor' },
  instructions: [
    { content: 'Audit the configuration for security issues' }
  ],
  content: [{ content: configFile }],
  schema: reportSchema
});
```

## Official Google Resources

- **[Google AI Studio](https://aistudio.google.com/)** - Get API keys and test prompts
- **[Gemini API Documentation](https://ai.google.dev/api)** - Complete API reference
- **[Models Documentation](https://ai.google.dev/models/gemini)** - Model capabilities and specs
- **[Prompt Engineering Guide](https://ai.google.dev/docs/prompt_best_practices)** - Best practices from Google
- **[Structured Outputs Guide](https://ai.google.dev/api/generate-content#json-schema)** - Schema format details
- **[Pricing](https://ai.google.dev/pricing)** - Pricing information
- **[Responsible AI](https://ai.google.dev/responsible)** - Safety and ethical guidelines
- **[Vertex AI](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)** - Enterprise Gemini deployment

## Related Documentation

- [Structured Outputs](structured-outputs) - Complete guide to schemas
- [OpenAI Provider](provider-openai) - GPT integration
- [Anthropic Provider](provider-anthropic) - Claude integration
- [Recipes System](recipes) - Advanced prompt creation
- [CLI Execute Command](cli-execute) - Execute from command line

