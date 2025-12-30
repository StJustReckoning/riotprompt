# Usage Patterns

**Purpose**: Common patterns for using `riotprompt` via CLI and Library.

## CLI Usage

The CLI is the primary way to interact with filesystem-based prompts.

### Directory Structure

RiotPrompt expects a specific directory structure for a prompt "package". You can now use expanded sections for more control:

```
my-prompt-project/
├── persona.md          # OR directory persona/ containing .md files
├── instructions.md     # OR directory instructions/ containing .md files
├── context/            # Directory containing reference files (json, md, txt)
│   ├── data.json
│   └── background.md
├── constraints.md      # Optional: Operational constraints
├── tone.md             # Optional: Tone and style guidelines
└── examples.md         # Optional: Few-shot examples
```

### Commands

**Create a New Prompt**:
```bash
# Create a prompt in the current directory
riotprompt create my-new-prompt

# Create with custom content
riotprompt create my-new-prompt --persona "You are a data scientist." --instructions "Analyze this dataset."

# Create without context directory
riotprompt create my-new-prompt --no-context
```

**Process a Prompt**:
```bash
# Default text output (formatted for console/copy-paste)
riotprompt process ./my-prompt-project

# Specify a target model (affects formatting, e.g., role names)
riotprompt process ./my-prompt-project --model gpt-4

# Export to JSON (for API integration)
riotprompt process ./my-prompt-project --format json --output prompt.json

# Export to XML
riotprompt process ./my-prompt-project --format xml --output prompt.xml
```

## Library Usage (Recipes API)

The primary way to use RiotPrompt programmatically is via the **Recipes API** (`cook` function). This provides a declarative, configuration-driven approach.

### Basic Recipe

```typescript
import { cook } from '@riotprompt/riotprompt';

const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are a helpful AI assistant.' },
    instructions: [
        { content: 'Summarize the provided text.' }
    ],
    content: [
        { content: 'Text to summarize goes here...' }
    ]
});
```

### Expanded Prompt Sections

RiotPrompt now supports a wide range of specialized sections to give you fine-grained control over the prompt structure. These are inspired by advanced prompting techniques.

*   **`persona`**: Who the AI is.
*   **`instructions`**: What the AI should do.
*   **`context`**: Background information.
*   **`content`**: The specific input to process.
*   **`constraints`**: Hard rules and limitations (e.g., "Do not use markdown").
*   **`tone`**: Style and voice guidelines (e.g., "Be professional and concise").
*   **`examples`**: Few-shot examples to guide the model.
*   **`reasoning`**: Instructions on how to think (e.g., "Think step-by-step").
*   **`responseFormat`**: Instructions on output structure.
*   **`recap`**: Final reminders or summaries of instructions.
*   **`safeguards`**: Safety guidelines and refusal criteria.

```typescript
const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are a senior code reviewer.' },
    instructions: [{ content: 'Review this pull request.' }],
    constraints: [{ content: 'Focus on security vulnerabilities.' }],
    tone: [{ content: 'Constructive and empathetic.' }],
    examples: [{ path: './examples/good-review.md' }],
    content: [{ content: prDiff }]
});
```

### Structured Outputs (Portable Schemas)

RiotPrompt supports portable structured outputs using `zod` schemas. This works across different providers (OpenAI, Anthropic, Gemini) by automatically adapting the schema to the provider's expected format (JSON Schema, Tool Use, etc.).

```typescript
import { cook, executeChat } from '@riotprompt/riotprompt';
import { z } from 'zod';

// 1. Define your schema using Zod
const AnalysisSchema = z.object({
    sentiment: z.enum(['positive', 'negative', 'neutral']),
    keyPoints: z.array(z.string()),
    confidence: z.number().min(0).max(1)
});

// 2. Pass it to the cook function
const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are a sentiment analyzer.' },
    content: [{ content: 'I loved this movie! It was fantastic.' }],
    schema: AnalysisSchema // Pass the Zod schema directly
});

// 3. Execute (RiotPrompt handles the provider specifics)
const result = await executeChat(prompt, {
    model: 'gpt-4o', // or 'claude-3-opus', 'gemini-1.5-pro'
    apiKey: process.env.OPENAI_API_KEY
});

// result.content is validated and typed
console.log(result.content.sentiment); // "positive"
```

### Templates

You can register reusable templates to standardize prompts across your application.

```typescript
import { registerTemplates, cook } from '@riotprompt/riotprompt';

registerTemplates({
    'security-audit': {
        persona: { content: 'You are a security auditor.' },
        constraints: [{ content: 'Report only high-severity issues.' }],
        responseFormat: [{ content: 'Output as a CSV list.' }]
    }
});

const prompt = await cook({
    basePath: __dirname,
    template: 'security-audit',
    content: [{ content: sourceCode }]
});
```
