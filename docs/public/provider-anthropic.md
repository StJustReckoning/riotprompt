# Anthropic (Claude) Provider

RiotPrompt provides seamless integration with Anthropic's Claude models, automatically adapting your prompts to Claude's unique architecture and best practices.

## Supported Models

RiotPrompt works with all Claude models, including:

- **Claude 3.5**: `claude-3-5-sonnet-20241022` (latest), `claude-3-5-sonnet-20240620`
- **Claude 3 Opus**: `claude-3-opus-20240229`
- **Claude 3 Sonnet**: `claude-3-sonnet-20240229`
- **Claude 3 Haiku**: `claude-3-haiku-20240307`

For current model information, see the [Claude Models Documentation](https://docs.anthropic.com/en/docs/models-overview).

## Getting Started

### API Key Setup

Get your Anthropic API key from the [Anthropic Console](https://console.anthropic.com/settings/keys).

Set it as an environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or use a `.env` file:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### Basic Usage

```typescript
import { cook, executeChat } from 'riotprompt';

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a helpful AI assistant' },
  instructions: [
    { content: 'Provide clear and detailed explanations' }
  ],
  content: [
    { content: 'Explain quantum computing' }
  ]
});

const result = await executeChat(prompt, {
  model: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY
});

console.log(result.content);
```

## How RiotPrompt Adapts to Claude

### System Prompt Handling

Claude has a special architecture where system instructions are separate from the conversation:

```typescript
// RiotPrompt structure:
const prompt = await cook({
  persona: { content: 'You are an expert writer' },
  constraints: [{ content: 'Use clear, simple language' }],
  tone: [{ content: 'Be friendly and approachable' }],
  instructions: [{ content: 'Help improve this text' }],
  content: [{ content: draftText }]
});

// Converted to Claude format:
{
  system: "You are an expert writer\n\nUse clear, simple language\n\nBe friendly and approachable",
  messages: [
    {
      role: "user",
      content: "Help improve this text\n\n{draftText}"
    }
  ]
}
```

**Key Sections Mapped to System Prompt:**
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

### Structured Outputs via Tool Use

Claude doesn't have native JSON Schema support like OpenAI, but RiotPrompt achieves structured outputs using Claude's tool use capabilities:

```typescript
import { z } from 'zod';

const analysisSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  keyThemes: z.array(z.string()),
  summary: z.string()
});

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a sentiment analyst' },
  content: [{ content: reviewText }],
  schema: analysisSchema
});

// RiotPrompt converts your schema to a Claude tool:
{
  tools: [{
    name: "response",
    description: "Output data in this structured format",
    input_schema: { /* JSON Schema from your Zod schema */ }
  }],
  tool_choice: { type: "tool", name: "response" }
}
```

Claude is forced to call this tool, ensuring structured output that matches your schema. RiotPrompt automatically extracts and validates the result.

[Learn more about Structured Outputs →](structured-outputs)

### Message Flow

Claude requires alternating user/assistant messages. RiotPrompt handles this automatically:

- System content goes in the `system` parameter
- All user-facing content is combined into user messages
- If you're building multi-turn conversations, RiotPrompt maintains proper alternation

## Best Practices for Claude

### 1. Choose the Right Model

- **Claude 3.5 Sonnet**: Best all-around model, excellent for complex tasks
- **Claude 3 Opus**: Maximum intelligence and capability
- **Claude 3 Sonnet**: Great balance of speed and intelligence  
- **Claude 3 Haiku**: Fastest, most cost-effective for simpler tasks

### 2. Leverage Claude's Strengths

Claude excels at:
- Long-form content analysis (200K context window)
- Following complex instructions
- Nuanced reasoning
- Writing and editing
- Coding tasks

```typescript
const prompt = await cook({
  persona: {
    content: `You are an expert technical writer specializing in API documentation.
You have a gift for explaining complex concepts clearly and anticipating user questions.`
  },
  constraints: [
    { content: 'Use examples for every major concept' },
    { content: 'Anticipate and address common misconceptions' }
  ],
  tone: [
    { content: 'Professional but approachable' },
    { content: 'Clear and concise, avoiding jargon when possible' }
  ],
  content: [
    { content: apiSpecification, title: 'API Specification' }
  ]
});
```

### 3. Use Clear System Prompts

Claude responds exceptionally well to detailed system prompts:

```typescript
const prompt = await cook({
  persona: {
    content: `You are Claude, an AI assistant created by Anthropic.
You are thoughtful, nuanced, and helpful. You think step-by-step before responding.`
  },
  constraints: [
    { content: 'If you are uncertain, acknowledge it clearly' },
    { content: 'Cite sources when making factual claims' }
  ]
});
```

### 4. Structure for Long Documents

For analyzing long documents, use Claude's extended context:

```typescript
const prompt = await cook({
  persona: { content: 'You are a legal document analyst' },
  constraints: [
    { content: 'Be thorough and detail-oriented' },
    { content: 'Reference specific sections by page/paragraph' }
  ],
  context: [
    { content: legalPrecedents, title: 'Relevant Precedents' }
  ],
  instructions: [
    { content: 'Analyze this contract for potential issues' }
  ],
  content: [
    { content: contractText, title: 'Contract' }  // Can be very long
  ]
});
```

### 5. Few-Shot Examples

Claude learns well from examples:

```typescript
const prompt = await cook({
  persona: { content: 'You are a data formatter' },
  examples: [
    {
      content: `Input: "john doe, 30, engineer"
Output: { "name": "John Doe", "age": 30, "profession": "Engineer" }`
    },
    {
      content: `Input: "jane smith, 25, designer"
Output: { "name": "Jane Smith", "age": 25, "profession": "Designer" }`
    }
  ],
  content: [
    { content: rawData }
  ],
  schema: outputSchema
});
```

### 6. Thinking and Reasoning

For complex problems, explicitly ask Claude to think step-by-step:

```typescript
const prompt = await cook({
  persona: { content: 'You are a problem-solving expert' },
  reasoning: [
    { content: 'Think through this problem step-by-step' },
    { content: 'Consider edge cases and potential issues' },
    { content: 'Explain your reasoning at each step' }
  ],
  content: [
    { content: complexProblem }
  ]
});
```

### 7. Temperature Settings

Claude's temperature settings:

```typescript
// For consistent, factual responses
const result = await executeChat(prompt, {
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.0,  // Deterministic
  maxTokens: 4096
});

// For creative writing
const result = await executeChat(prompt, {
  model: 'claude-3-opus-20240229',
  temperature: 1.0,  // More creative
  maxTokens: 4096
});
```

**Note**: Claude requires the `maxTokens` parameter (unlike OpenAI where it's optional). RiotPrompt defaults to 4096 if not specified.

## Claude-Specific Features

### Extended Context Window

All Claude 3 models support up to 200K tokens of context:

```typescript
const prompt = await cook({
  persona: { content: 'You are a research analyst' },
  context: [
    { directories: ['./research-papers/'] }  // Load many documents
  ],
  instructions: [
    { content: 'Synthesize findings across all papers' }
  ]
});
```

### Vision Capabilities

Claude 3 models support image analysis (when using appropriate input formats):

```typescript
// Note: Image support requires special message formatting
// See Anthropic documentation for details
```

### Tool Use

Claude has sophisticated tool use capabilities. RiotPrompt leverages this for structured outputs:

```typescript
// When you use a schema, RiotPrompt creates a tool
// Claude calls the tool, providing structured output
const schema = z.object({
  analysis: z.string(),
  confidence: z.number()
});

const prompt = await cook({
  // ...
  schema: schema  // Becomes a tool Claude must use
});
```

## Token Efficiency

Claude pricing is based on input and output tokens:

- Keep system prompts focused but detailed
- Use Claude Haiku for simpler tasks to reduce costs
- Leverage the extended context window instead of making multiple requests

```typescript
// Efficient: One request with full context
const prompt = await cook({
  context: [
    { directories: ['./all-docs/'] }
  ],
  instructions: [
    { content: 'Find all references to security policies' }
  ]
});

// Less efficient: Multiple smaller requests
// (sometimes necessary, but more expensive)
```

## Error Handling

Handle common Claude errors:

```typescript
try {
  const result = await executeChat(prompt, {
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY
  });
} catch (error) {
  if (error.status === 401) {
    console.error('Invalid API key');
  } else if (error.status === 429) {
    console.error('Rate limit exceeded');
  } else if (error.status === 400) {
    console.error('Invalid request:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Prompt Engineering Tips

### Use XML Tags for Structure

Claude responds well to XML-style tags in prompts:

```typescript
const prompt = await cook({
  persona: { content: 'You are a code reviewer' },
  instructions: [
    {
      content: `Review the code in the <code> tags below.
Provide your feedback in this format:
<feedback>
  <issues>List any issues found</issues>
  <suggestions>Provide improvement suggestions</suggestions>
  <rating>Rate the code 1-10</rating>
</feedback>`
    }
  ],
  content: [
    { content: `<code>\n${sourceCode}\n</code>` }
  ]
});
```

### Be Explicit About Format

Tell Claude exactly what you want:

```typescript
const prompt = await cook({
  persona: { content: 'You are a summarizer' },
  instructions: [
    { content: 'Provide a summary in exactly 3 bullet points' },
    { content: 'Each bullet should be 1-2 sentences' },
    { content: 'Focus on the most important information' }
  ],
  content: [{ content: longArticle }]
});
```

## Official Anthropic Resources

- **[Anthropic Console](https://console.anthropic.com/)** - API keys and usage dashboard
- **[Claude API Documentation](https://docs.anthropic.com/en/api)** - Complete API reference
- **[Models Overview](https://docs.anthropic.com/en/docs/models-overview)** - Model capabilities and pricing
- **[Prompt Engineering Guide](https://docs.anthropic.com/en/docs/prompt-engineering)** - Best practices from Anthropic
- **[Tool Use (Function Calling)](https://docs.anthropic.com/en/docs/tool-use)** - How tool use works
- **[Message Batches API](https://docs.anthropic.com/en/api/messages-batches)** - Batch processing for efficiency
- **[Rate Limits](https://docs.anthropic.com/en/api/rate-limits)** - Understanding rate limits
- **[Usage Policies](https://www.anthropic.com/legal/aup)** - Acceptable use policy

## Related Documentation

- [Structured Outputs](structured-outputs) - Complete guide to schemas
- [OpenAI Provider](provider-openai) - GPT integration
- [Gemini Provider](provider-gemini) - Google Gemini integration
- [Recipes System](recipes) - Advanced prompt creation
- [CLI Execute Command](cli-execute) - Execute from command line

