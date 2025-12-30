# Getting Started

Welcome to RiotPrompt - a structured prompt engineering library for LLMs that helps you organize your prompts efficiently.

## Installation

Install RiotPrompt via npm:

```bash
npm install @riotprompt/riotprompt
```

## Quick Start

Here's how to get started with RiotPrompt in just a few lines:

```js
import { createSection, createPrompt, Formatter, Section, Instruction } from '@riotprompt/riotprompt';

// Create a new instruction section
const section: Section<Instruction> = createSection<Instruction>({ title: "Instructions" });

// Add instructions
section.add("Answer in a concise manner");
section.add("Provide code examples when appropriate");

// Verify parts of the output
console.log('Number of instructions:', section.items.length);
// Output: Number of instructions: 2

// Formatting a Section using Tags
const formatterTags = Formatter.create();
const formattedTags = formatterTags.format(section);
console.log(formattedTags);
// Output: <Instructions>
//         Answer in a concise manner
//
//         Provide code examples when appropriate
//         </Instructions>

// Formatting a Section using Markdown
const formatterMarkdown = Formatter.create({ formatOptions: { sectionSeparator: "markdown" }});
const formattedMarkdown = formatterMarkdown.format(section)
console.log(formattedMarkdown);
// Output: # Instructions
//
//         Answer in a concise manner
//
//         Provide code examples when appropriate
```

## Why RiotPrompt?

Tired of spending hours crafting and formatting the perfect LLM prompt? RiotPrompt provides a structured way to organize your prompts, allowing you to focus on the content rather than the formatting.

RiotPrompt helps you:
- **Organize prompt elements** into logical categories (instructions, content, context)
- **Create reusable persona definitions** with traits and instructions
- **Group related items** into sections
- **Format everything consistently** for different LLM models
- **Scale to complex prompts** without losing maintainability

## What's Next?

### Get Started Quickly

- **[Quick Start Guide](quick-start.md)** - Create and execute your first prompt in 5 minutes
- **[Complete Tutorial](tutorial.md)** - Comprehensive guide to mastering RiotPrompt

### Explore Core Concepts

- **[Core Concepts](core-concepts.md)** - Understand WeightedText, Sections, and prompt structure
- **[Basic Usage](basic-usage.md)** - Learn how to create and format sections
- **[Recipes System](recipes.md)** - Discover the revolutionary new way to create prompts
- **[Structured Outputs](structured-outputs.md)** - Get validated, type-safe responses from LLMs
- **[Advanced Usage](advanced-usage.md)** - Explore parameters, weights, and complex structures 