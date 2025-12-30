# RiotPrompt

A powerful, flexible prompt building library and CLI tool for AI applications with zero hardcoded assumptions.

## Features

- **Structured Prompts**: Treat prompts as code with sections for Persona, Instructions, and Context.
- **CLI Tool**: Scaffold, manage, process, and **execute** prompts directly from the terminal.
- **Model Agnostic**: Format prompts for different models (GPT-4, Claude, etc.) automatically.
- **Execution Engine**: Run prompts against OpenAI, Anthropic, or Gemini APIs directly.
- **Portable**: Serialize prompts to JSON or XML for easy exchange between systems.
- **Type-Safe**: Full TypeScript support with excellent IntelliSense.

## Installation

```bash
npm install riotprompt
```

## CLI Usage

RiotPrompt comes with a command-line interface to help you organize, process, and execute prompts.

### 1. Create a Prompt

Scaffold a new prompt directory structure:

```bash
# Create a new prompt in 'my-prompt' directory
npx riotprompt create my-prompt --persona "You are a data expert."

# Import an existing prompt from JSON or XML
npx riotprompt create my-prompt --import existing-prompt.json
```

This creates a structured directory:
```
my-prompt/
├── persona.md          # System prompt / Persona definition
├── instructions.md     # Main task instructions
└── context/            # Directory for reference files (data.json, docs.md)
```

### 2. Process a Prompt

Compile a prompt directory (or file) into a formatted payload for an LLM, or export it to other formats.

```bash
# Format for GPT-4 (output to console)
npx riotprompt process my-prompt -m gpt-4

# Export to JSON (useful for API integrations)
npx riotprompt process my-prompt --format json --output prompt.json

# Export to XML
npx riotprompt process my-prompt --format xml --output prompt.xml
```

### 3. Execute a Prompt

Run the prompt directly against an LLM provider.

**Prerequisites**: Set your API keys in a `.env` file or environment variables:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

**Commands**:

```bash
# Run with default model (usually gpt-4)
npx riotprompt execute my-prompt

# Run with specific model
npx riotprompt execute my-prompt -m claude-3-opus

# Run with explicit API key (overrides env)
npx riotprompt execute my-prompt -m gpt-4 -k sk-proj-...

# Control parameters
npx riotprompt execute my-prompt -t 0.7 --max-tokens 1000
```

### Configuration

You can configure defaults using a `riotprompt.yaml` file in your project root:

```yaml
defaultModel: "gpt-4"
promptsDir: "./prompts"
outputDir: "./output"
```

## Library Usage

You can also use RiotPrompt programmatically in your application.

```typescript
import { cook, registerTemplates } from 'riotprompt';

// Simple prompt creation
const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a helpful AI assistant' },
  instructions: [
    { content: 'Analyze the provided content carefully' },
    { path: 'instructions/guidelines.md' },
  ],
  content: [
    { content: sourceData, title: 'Source Data', weight: 1.0 },
    { directories: ['examples/'], weight: 0.5 },
  ],
  context: [
    { content: 'Additional context', title: 'Context' },
  ],
});

// Register and use templates
registerTemplates({
  'analysis': {
    persona: { content: 'You are an expert analyst' },
    instructions: [{ content: 'Provide detailed analysis' }],
  },
});

const analysisPrompt = await cook({
  basePath: __dirname,
  template: 'analysis',
  content: [{ content: dataToAnalyze, title: 'Data' }],
});
```

## Documentation

For more detailed guides on architecture and advanced usage, check the [Guide](guide/index.md).

- [Core Concepts](docs/public/core-concepts.md)
- [Recipes System](docs/public/recipes.md)
- [API Reference](docs/public/api-reference.md)
- [Template Configuration](docs/public/template-configuration.md)

## Philosophy

RiotPrompt is designed to be completely generic and unopinionated. Unlike other prompt libraries that assume specific use cases, RiotPrompt provides the building blocks for any prompt-based application while maintaining type safety and developer experience.

## Architecture

- **Cook Function**: Core prompt creation engine
- **Template System**: Reusable configuration patterns
- **Content Processing**: Flexible content handling (files, directories, inline)
- **Override System**: Hierarchical customization
- **Type Safety**: Full TypeScript support throughout

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

Apache-2.0 License - see [LICENSE](LICENSE) for details.

---

*Build better prompts, faster.*
