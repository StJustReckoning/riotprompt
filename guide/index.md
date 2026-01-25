# AI Agent Guide: RiotPrompt

**Role**: You are an AI assistant tasked with understanding, integrating, or extending `riotprompt`, a structured prompt engineering library.

**Goal**: Provide a comprehensive understanding of `riotprompt`'s capabilities, architecture, and usage patterns to facilitate correct implementation and extension.

## Core Capabilities

`riotprompt` is a library and CLI tool designed to treat LLM prompts as structured code objects rather than simple strings. It allows for the modular assembly, validation, and formatting of prompts.

*   **Structured Prompts**: Prompts are composed of distinct sections beyond just "System" and "User". Use specialized sections like `Persona`, `Instructions`, `Constraints`, `Tone`, `Examples`, `Reasoning`, and more.
*   **Recipes & Templates**: A declarative API (`cook`) allows you to assemble prompts from configuration objects and reusable templates.
*   **Structured Outputs**: Portable support for structured outputs using `zod` schemas. Write one schema and use it across OpenAI, Anthropic, and Gemini.
*   **Model-Agnostic Formatting**: The library separates the *content* of a prompt from its *format*. It can output prompts optimized for different models (e.g., handling role mapping for OpenAI's O-series vs GPT-4).
*   **CLI Tool**: A command-line interface allows for easy scaffolding, processing, and execution of file-based prompts.

## Quick Start Context

When analyzing or generating code using `riotprompt`, keep these patterns in mind:

1.  **Use Recipes**: The `cook` function is the primary entry point for creating prompts programmatically.
2.  **Use Schemas**: For structured data, pass a `zod` schema to `cook`.
3.  **Execute via Provider**: Use `executeChat` to run prompts against LLMs, handling provider-specific details automatically.

```typescript
import { cook, executeChat } from '@riotprompt/riotprompt';
import { z } from 'zod';

// Define output structure
const ResultSchema = z.object({
    summary: z.string(),
    tags: z.array(z.string())
});

// Create prompt
const prompt = await cook({
    basePath: __dirname,
    persona: { content: 'You are a summarizer.' },
    instructions: [{ content: 'Summarize the text.' }],
    content: [{ content: 'Long text...' }],
    schema: ResultSchema
});

// Execute
const result = await executeChat(prompt, { model: 'gpt-4o' });
```

## Documentation Structure

This guide directory contains specialized documentation for different aspects of the system:

*   [Integration](./integration.md): Comprehensive guide for integrating RiotPrompt as a library, including API reference, conversation management, tool integration, and agentic workflows.
*   [Architecture](./architecture.md): Internal design, module structure, and data flow.
*   [Usage Patterns](./usage.md): Common patterns for CLI and library usage, including the Recipes API and Structured Outputs.
*   [Configuration](./configuration.md): Deep dive into configuration options.
*   [Security](./security.md): Security best practices and features.
*   [Development](./development.md): Guide for contributing to `riotprompt`.
