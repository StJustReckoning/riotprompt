# 🚀 RiotPrompt

A structured prompt engineering library for LLMs - because you have better things to do than worry about prompt formatting.

> "I don't wanna hear it, know you're full of sh*t" - Minor Threat

[![npm version](https://badge.fury.io/js/@riotprompt%2Friotprompt.svg)](https://badge.fury.io/js/@riotprompt%2Friotprompt)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Quick Start

### Installation

```bash
npm install @riotprompt/riotprompt
```

### Basic Usage

```js
import { createSection, Formatter } from '@riotprompt/riotprompt';

// Create a section
const instructions = createSection({ title: "Instructions" });
instructions.add("Answer in a concise manner");
instructions.add("Provide code examples when appropriate");

// Format it
const formatter = Formatter.create();
console.log(formatter.format(instructions));
```

**Output:**
```xml
<Instructions>
Answer in a concise manner

Provide code examples when appropriate
</Instructions>
```

### Revolutionary Recipes System

Transform verbose builder code into simple, declarative configuration:

```js
import { quick } from '@riotprompt/riotprompt';

// Just one line!
const prompt = await quick.commit(diffContent, { 
  basePath: __dirname,
  userDirection: "Focus on performance" 
});
```

## Why RiotPrompt?

- **📋 Structured Organization**: Organize prompts into logical categories (instructions, content, context)
- **🔄 Reusable Components**: Create reusable persona definitions and prompt templates  
- **⚡ Multiple APIs**: Choose from simple one-liners to complex programmatic construction
- **🎨 Flexible Formatting**: Support for both XML tags and Markdown output
- **📁 File-Based Management**: Load prompts from files and directories
- **🔧 Override System**: Multi-layered customization without modifying core files
- **📊 90%+ Code Reduction**: Transform 25+ lines into 1-5 lines of clean configuration

## Documentation

📖 **[Complete Documentation](https://stjustreckoning.github.io/riotprompt/)**

### Key Topics

- **[Getting Started](https://stjustreckoning.github.io/riotprompt/?section=getting-started)** - Installation and basic usage
- **[Core Concepts](https://stjustreckoning.github.io/riotprompt/?section=core-concepts)** - Understanding WeightedText and Sections
- **[Recipes System](https://stjustreckoning.github.io/riotprompt/?section=recipes)** - Revolutionary prompt creation API
- **[Override System](https://stjustreckoning.github.io/riotprompt/?section=override)** - Multi-layered customization
- **[API Reference](https://stjustreckoning.github.io/riotprompt/?section=api-reference)** - Complete API documentation

## Model Support

RiotPrompt works with any LLM that accepts text prompts:
- OpenAI GPT models
- Anthropic Claude
- Google Gemini
- Local models via Ollama
- Any other text-based LLM

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

Licensed under the [Apache-2.0 License](LICENSE).

## Why the Name?

Because organizing your prompts shouldn't be a riot - but the results should be! 🎉
