# Command Line Interface

The RiotPrompt CLI is a command-line tool for creating, managing, and executing prompts directly from your terminal.

## What Can You Do?

The CLI allows you to:

- **Create** structured prompt directories with scaffolding
- **Process** prompts into formatted outputs (JSON, XML, or text)
- **Execute** prompts against LLM providers (OpenAI, Anthropic, Gemini)
- **Import/Export** prompts between different formats

## Prerequisites

RiotPrompt CLI requires Node.js and npm to be installed on your system.

**Don't have Node.js?** Download and install it from [nodejs.org](https://nodejs.org/). This will include npm (Node Package Manager) automatically.

## Installation

Install RiotPrompt globally to use the CLI from anywhere:

```bash
npm install -g @riotprompt/riotprompt
```

Or run commands without installation using `npx`:

```bash
npx riotprompt <command>
```

## Environment Variables

To execute prompts against LLM providers, you need to set up API keys as environment variables:

### OpenAI
```bash
export OPENAI_API_KEY=sk-proj-...
```
Get your API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Anthropic (Claude)
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```
Get your API key from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

### Google Gemini
```bash
export GEMINI_API_KEY=AIza...
```
Get your API key from [aistudio.google.com](https://aistudio.google.com/)

### Using .env Files

You can also create a `.env` file in your project directory:

```bash
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

The CLI will automatically load these variables when running commands.

## Available Commands

The RiotPrompt CLI provides three main commands:

### create
Scaffold a new prompt directory structure or import from an existing file.

[View create command documentation →](cli-create)

### process
Process and format prompts for different LLM providers or export to JSON/XML.

[View process command documentation →](cli-process)

### execute
Run prompts directly against LLM APIs and get responses.

[View execute command documentation →](cli-execute)

## Configuration File

You can create a `riotprompt.yaml` configuration file in your project root to set defaults:

```yaml
defaultModel: "gpt-4"
promptsDir: "./prompts"
outputDir: "./output"
```

## Quick Start

```bash
# 1. Create a new prompt
npx riotprompt create my-analysis-prompt

# 2. Edit the generated files (persona.md, instructions.md)

# 3. Process it to see the formatted output
npx riotprompt process my-analysis-prompt -m gpt-4

# 4. Execute it against an LLM
npx riotprompt execute my-analysis-prompt -m gpt-4
```
