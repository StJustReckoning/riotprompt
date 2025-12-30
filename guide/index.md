# AI Agent Guide: RiotPrompt

**Role**: You are an AI assistant tasked with understanding, integrating, or extending `riotprompt`, a structured prompt engineering library.

**Goal**: Provide a comprehensive understanding of `riotprompt`'s capabilities, architecture, and usage patterns to facilitate correct implementation and extension.

## Core Capabilities

`riotprompt` is a library and CLI tool designed to treat LLM prompts as structured code objects rather than simple strings. It allows for the modular assembly, validation, and formatting of prompts.

*   **Structured Prompts**: Prompts are composed of distinct sections: `Persona`, `Instructions`, `Context`, and `Content`.
*   **Modular Assembly**: Sections can be loaded from separate files or directories and combined dynamically.
*   **Model-Agnostic Formatting**: The library separates the *content* of a prompt from its *format*. It can output prompts optimized for different models (e.g., OpenAI, Claude) using adapters.
*   **Serialization**: Prompts can be serialized to JSON or XML for storage or exchange.
*   **CLI Tool**: A command-line interface allows for easy processing of prompt directories into formatted outputs.

## Quick Start Context

When analyzing or generating code using `riotprompt`, keep these patterns in mind:

1.  **Define Sections**: Prompts are built from `Section<T>` objects.
2.  **Create Prompt**: Use `createPrompt` to combine sections.
3.  **Format**: Use `Formatter` to convert the structured prompt into a string or chat messages for a specific model.

```typescript
import * as RiotPrompt from '@riotprompt/riotprompt';

// 1. Create Sections
const persona = RiotPrompt.createSection({ title: 'Persona' })
    .add(RiotPrompt.createInstruction('You are a helpful assistant.'));

const instructions = RiotPrompt.createSection({ title: 'Instructions' })
    .add(RiotPrompt.createInstruction('Summarize the following text.'));

// 2. Create Prompt
const prompt = RiotPrompt.createPrompt({
    persona,
    instructions
});

// 3. Format
const formatter = RiotPrompt.Formatter.create();
// chatRequest will be a structured object suitable for API calls (e.g. OpenAI chat completion)
const chatRequest = formatter.formatPrompt('gpt-4', prompt); 
```

## Documentation Structure

This guide directory contains specialized documentation for different aspects of the system:

*   [Architecture](./architecture.md): Internal design, module structure, and data flow.
*   [Usage Patterns](./usage.md): Common patterns for CLI and library usage.
*   [Configuration](./configuration.md): Deep dive into configuration options.
*   [Development](./development.md): Guide for contributing to `riotprompt`.

