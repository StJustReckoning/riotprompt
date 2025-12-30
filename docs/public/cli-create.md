# create - Scaffold New Prompts

The `create` command scaffolds a new prompt directory structure or imports an existing prompt from JSON/XML.

## Usage

```bash
riotprompt create <promptName> [options]
```

## Arguments

- `promptName` - Name of the prompt directory to create

## Options

- `-p, --path <path>` - Base path to create the prompt in (default: current directory)
- `--persona <text>` - Initial text for `persona.md`
- `--instructions <text>` - Initial text for `instructions.md`
- `--context` - Create context directory with placeholder (default: true)
- `--no-context` - Do not create context directory
- `--import <file>` - Import prompt structure from a JSON or XML file

## Examples

### Create a Basic Prompt

```bash
riotprompt create my-prompt
```

This creates:
```
my-prompt/
├── persona.md          # "You are a helpful AI assistant."
├── instructions.md     # "Please analyze the following request."
└── context/            # Directory for reference files
    └── README.md
```

### Create with Custom Content

```bash
riotprompt create code-reviewer \
  --persona "You are a senior software engineer with 10 years of experience" \
  --instructions "Review the code for bugs, performance issues, and best practices"
```

### Create Without Context Directory

```bash
riotprompt create simple-prompt --no-context
```

### Import from Existing File

```bash
riotprompt create imported-prompt --import existing-prompt.json
```

Supported import formats: `.json`, `.xml`

## What Gets Created

The `create` command generates a structured directory that follows RiotPrompt's organization:

- **persona.md** - Defines who the LLM should be (system prompt)
- **instructions.md** - Main task instructions
- **context/** - Directory for supporting files (data, examples, documentation)

You can then edit these files and use `process` or `execute` commands to work with the prompt.

## Next Steps

After creating a prompt:

1. Edit the generated files to customize your prompt
2. Add any reference files to the `context/` directory
3. Use `riotprompt process` to preview the formatted output
4. Use `riotprompt execute` to run it against an LLM

### Learn More

- [Process command](cli-process) - Preview and format your prompts
- [Execute command](cli-execute) - Run prompts against LLMs
- [Structured Outputs](structured-outputs) - Define schemas for validated responses
- [Recipes System](recipes) - Advanced programmatic prompt creation

