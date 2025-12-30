# process - Format and Export Prompts

The `process` command compiles a prompt directory (or file) into a formatted payload for an LLM, or exports it to JSON/XML.

## Usage

```bash
riotprompt process <promptPath> [options]
```

## Arguments

- `promptPath` - Path to the prompt directory, JSON file, or XML file

## Options

- `-m, --model <model>` - Model to format for (e.g., `gpt-4`, `claude-3-opus`, `gemini-1.5-pro`)
- `-o, --output <file>` - Write output to a file instead of stdout
- `--format <format>` - Output format: `text`, `json`, or `xml` (default: `text`)

## Examples

### Format for a Specific Model

```bash
riotprompt process my-prompt -m gpt-4
```

This outputs the formatted prompt structure as it would be sent to GPT-4, showing the system message, user message, and any structured components.

### Export to JSON

```bash
riotprompt process my-prompt --format json -o prompt.json
```

Creates a portable JSON representation of your prompt that can be:
- Version controlled
- Shared with other systems
- Imported later with `create --import`

### Export to XML

```bash
riotprompt process my-prompt --format xml -o prompt.xml
```

Useful for integrations that prefer XML format.

### Process from JSON/XML

You can also process previously exported prompts:

```bash
riotprompt process saved-prompt.json -m claude-3-opus
```

## Output Formats

### text (default)
Shows a human-readable representation of how the prompt will be sent to the LLM, including role assignments and message structure.

### json
Serializes the entire prompt structure to JSON, preserving all sections, weights, and metadata.

### xml
Serializes the prompt structure to XML format.

## Use Cases

- **Preview** - See how your prompt will be formatted before executing
- **Debug** - Verify that sections are being loaded correctly
- **Export** - Save prompts for version control or sharing
- **Convert** - Transform prompts between formats (directory → JSON → XML)

## Next Steps

Once you've verified your prompt looks correct:

[Execute the prompt against an LLM →](cli-execute)

