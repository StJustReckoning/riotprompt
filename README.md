# RiotPrompt

**A prompt is bigger than the text you send to an LLM.**

RiotPrompt treats prompts as **constructs**—structured formats that include process, evolution, and tool independence. Write once, work with any model. Track revisions. Make your prompts truly yours.

Part of [Kjerneverk](https://kjerneverk.github.io) - structured formats for working with generative AI.

## Why RiotPrompt?

### Before: Freeform Text Blocks

- Write different prompts for different models
- Lose history and evolution
- Can't experiment with variations
- No structure, no reusability

### After: Prompts as Constructs

- **Write once, translate automatically**: OpenAI uses Markdown sections, Anthropic uses XML tags, Gemini has rich sections. RiotPrompt abstracts these differences.
- **Evolution and experimentation**: Track revisions, create variations, maintain history. Your prompts are assets that improve over time.
- **Structured format**: Prompts have sections—persona, instructions, context, constraints, tone, examples, schema. Not freeform text.
- **Tool independence**: Works from CLI with API keys, via MCP with any model, or as a library in your applications.

## Features

- **Structured Prompts**: Specialized sections for Persona, Instructions, Context, Constraints, Tone, Examples, and Schema (with Zod)
- **Cross-LLM Translation**: Automatically adapts to each provider:
    - **Anthropic (Claude)**: System parameter, tool use for schemas
    - **OpenAI**: System/developer messages, native structured outputs
    - **Gemini**: System instructions, responseSchema format
- **CLI Tool**: Create, process, and execute prompts from the terminal
- **MCP Server**: Let AI assistants manage your prompts with structure
- **Portable**: Serialize to JSON or XML for cross-system exchange
- **Type-Safe**: Full TypeScript support with excellent IntelliSense
- **Zero Assumptions**: No hardcoded behaviors—you define everything

## Installation

```bash
npm install @kjerneverk/riotprompt
```

## MCP Server

RiotPrompt includes a Model Context Protocol (MCP) server that allows AI assistants to create, process, and execute prompts. See [MCP.md](MCP.md) for configuration and usage details.

```json
{
  "mcpServers": {
    "riotprompt": {
      "command": "npx",
      "args": ["-y", "@kjerneverk/riotprompt", "riotprompt-mcp"]
    }
  }
}
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

#### Provider Setup & API Keys

RiotPrompt supports multiple LLM providers. You'll need to obtain an API key for the provider you wish to use and set it as an environment variable (recommended) or pass it via the `-k` flag.

##### Google Gemini
1.  **Get API Key**: Visit [Google AI Studio](https://aistudio.google.com/), sign in, and click "Get API key".
2.  **Set Environment Variable**: `GEMINI_API_KEY`
3.  **Available Models**: Check the [Gemini models documentation](https://ai.google.dev/models/gemini). Common models include `gemini-1.5-pro`, `gemini-1.5-flash`.

##### OpenAI
1.  **Get API Key**: Go to the [OpenAI Platform](https://platform.openai.com/api-keys), sign up/login, and create a new secret key.
2.  **Set Environment Variable**: `OPENAI_API_KEY`
3.  **Available Models**: See [OpenAI Models](https://platform.openai.com/docs/models). Common models: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`.

##### Anthropic (Claude)
1.  **Get API Key**: Access the [Anthropic Console](https://console.anthropic.com/settings/keys) and generate an API key.
2.  **Set Environment Variable**: `ANTHROPIC_API_KEY`
3.  **Available Models**: View [Claude Models](https://docs.anthropic.com/en/docs/models-overview). Common models: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`.

**Example .env file:**
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
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

You can also use RiotPrompt programmatically in your application using the Builder API.

```typescript
import { Builder, Formatter, Execution } from '@kjerneverk/riotprompt';

// Build a prompt from files and inline content
const prompt = await Builder.create({ basePath: __dirname })
  .addPersona('You are a helpful AI assistant')
  .addInstruction('Provide clear and concise answers')
  .addContent('What is machine learning?')
  .build();

// Format for a specific model
const formatter = Formatter.create();
const request = formatter.formatPrompt('gpt-4o', prompt);

// Execute against a provider
const result = await Execution.execute(request, {
  apiKey: process.env.OPENAI_API_KEY!,
});

console.log(result.content);
```

For agentic workflows (conversation management, tool use, iteration
strategies, reflection), use the companion [`@kjerneverk/agentic`](https://github.com/kjerneverk/agentic) package.

## Documentation

Full documentation is available at [https://kjerneverk.github.io/riotprompt/](https://kjerneverk.github.io/riotprompt/).

You can also explore the guides in the source:
- [Core Concepts](docs/public/core-concepts.md)
- [Builder API](docs/public/builder.md)
- [API Reference](docs/public/api-reference.md)
- [Override System](docs/public/override.md)

## Philosophy

RiotPrompt is designed to be completely generic and unopinionated. Unlike other prompt libraries that assume specific use cases, RiotPrompt provides the building blocks for any prompt-based application while maintaining type safety and developer experience.

## Architecture

- **Builder API**: Fluent builder for constructing prompts from files, directories, and inline content
- **Prompt Model**: Structured type hierarchy (Prompt → Section → Content/Context/Instruction/Trait/Weighted)
- **Formatter**: Model-aware formatting (system role mapping, structured outputs, tool-use conversion)
- **Content Processing**: Flexible content handling (files, directories, inline)
- **Override System**: Hierarchical customization for prompts
- **Type Safety**: Full TypeScript support with Zod validation throughout

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

Apache-2.0 License - see [LICENSE](LICENSE) for details.

---

*Build better prompts, faster.*

<!-- v1.0.0 -->
