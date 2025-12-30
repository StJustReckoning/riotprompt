# Configuration Options

RiotPrompt can be configured using a `riotprompt.yaml` file in your project root. This file allows you to set defaults for the CLI and customize behavior across all commands.

## Configuration File Location

By default, RiotPrompt looks for a `riotprompt.yaml` file in your current working directory. You can create this file to avoid passing the same options repeatedly to CLI commands.

```bash
# Project structure
my-project/
├── riotprompt.yaml     # Configuration file
├── prompts/            # Your prompts
└── output/             # Generated outputs
```

## Configuration Format

The configuration file uses YAML format:

```yaml
# riotprompt.yaml
defaultModel: "gpt-4"
promptsDir: "./prompts"
outputDir: "./output"
```

## Available Options

### defaultModel

**Type:** `string`  
**Default:** `"gpt-4"`  
**Description:** The default LLM model to use for formatting and execution when no model is explicitly specified.

**Supported Values:**
- OpenAI models: `gpt-4`, `gpt-4-turbo`, `gpt-4o`, `gpt-3.5-turbo`, `o1`, `o1-mini`, etc.
- Anthropic models: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`, `claude-3-5-sonnet-20241022`, etc.
- Gemini models: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash-exp`, etc.

**Example:**
```yaml
defaultModel: "claude-3-opus-20240229"
```

**Usage:**
When set, this model will be used by default for `process` and `execute` commands unless overridden with the `-m` or `--model` flag.

```bash
# Uses the model specified in config
npx riotprompt execute my-prompt

# Override with command-line flag
npx riotprompt execute my-prompt -m gpt-4o
```

---

### promptsDir

**Type:** `string`  
**Default:** `"."`  
**Description:** The directory where your prompt directories are located. This sets the base path for prompt discovery and organization.

**Example:**
```yaml
promptsDir: "./prompts"
```

**Usage:**
This setting helps organize your prompts in a dedicated directory:

```bash
prompts/
├── analysis-prompt/
│   ├── persona.md
│   ├── instructions.md
│   └── context/
├── code-review/
│   ├── persona.md
│   └── instructions.md
└── documentation/
    ├── persona.md
    └── instructions.md
```

When `promptsDir` is set to `"./prompts"`, you can reference prompts by their subdirectory name:

```bash
npx riotprompt execute analysis-prompt
# Looks for ./prompts/analysis-prompt/
```

---

### outputDir

**Type:** `string`  
**Default:** `undefined` (outputs to current directory or stdout)  
**Description:** The directory where processed prompts and execution results should be saved. This option is particularly useful for the `process` command when generating JSON or XML outputs.

**Example:**
```yaml
outputDir: "./output"
```

**Usage:**
When specified, this directory will be used for saving processed outputs:

```bash
# Process command with outputDir configured
npx riotprompt process my-prompt --format json --output result.json
# Saves to: ./output/result.json
```

If `outputDir` is not specified:
- For `process` command: Output goes to stdout or to the path specified by `--output`
- For `execute` command: Results are displayed in the terminal

---

## Complete Example

Here's a comprehensive configuration file example:

```yaml
# riotprompt.yaml

# Default model for all operations
defaultModel: "gpt-4o"

# Organize prompts in a dedicated directory
promptsDir: "./prompts"

# Save all outputs to a dedicated directory
outputDir: "./output"
```

## Configuration Priority

When using the CLI, options are resolved in the following order (highest to lowest priority):

1. **Command-line flags** - Options passed directly to commands
2. **Configuration file** - Options in `riotprompt.yaml`
3. **Built-in defaults** - RiotPrompt's default values

**Example:**

```yaml
# riotprompt.yaml
defaultModel: "gpt-4"
```

```bash
# Uses gpt-4 from config
npx riotprompt execute my-prompt

# Overrides config, uses claude instead
npx riotprompt execute my-prompt -m claude-3-opus-20240229
```

## Environment-Specific Configurations

You can maintain different configuration files for different environments:

```bash
# Development
riotprompt.dev.yaml

# Production
riotprompt.prod.yaml

# Testing
riotprompt.test.yaml
```

Then use them by renaming or symlinking to `riotprompt.yaml` as needed.

## Validation

RiotPrompt validates your configuration file when commands are run. If there are any errors in your configuration:

- Invalid option names will be ignored with a warning
- Invalid values will fall back to defaults
- Missing required fields will use built-in defaults

## Next Steps

- [CLI Usage Overview](cli-usage) - Learn about CLI commands
- [create Command](cli-create) - Scaffold new prompts
- [process Command](cli-process) - Format and export prompts
- [execute Command](cli-execute) - Run prompts against LLMs

