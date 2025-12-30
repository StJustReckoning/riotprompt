# execute - Run Prompts Against LLMs

The `execute` command runs your prompt directly against an LLM provider and returns the response.

## Usage

```bash
riotprompt execute <promptPath> [options]
```

## Arguments

- `promptPath` - Path to the prompt directory, JSON file, or XML file

## Options

- `-m, --model <model>` - Model to use (e.g., `gpt-4o`, `claude-3-opus-20240229`, `gemini-1.5-pro`)
- `-k, --key <key>` - API Key (overrides environment variables)
- `-t, --temperature <number>` - Temperature setting (0-1, controls randomness)
- `--max-tokens <number>` - Maximum tokens in the response

## Examples

### Execute with Default Model

```bash
riotprompt execute my-prompt
```

Uses the model specified in your `riotprompt.yaml` config or the default.

### Execute with Specific Model

```bash
# OpenAI
riotprompt execute my-prompt -m gpt-4o

# Anthropic Claude
riotprompt execute my-prompt -m claude-3-opus-20240229

# Google Gemini
riotprompt execute my-prompt -m gemini-1.5-pro
```

### Control Response Parameters

```bash
riotprompt execute my-prompt -m gpt-4 -t 0.7 --max-tokens 1000
```

- `temperature 0.7` - Balanced creativity/consistency
- `max-tokens 1000` - Limit response length

### Override API Key

```bash
riotprompt execute my-prompt -m gpt-4 -k sk-proj-your-key-here
```

Useful for testing with different accounts or temporary keys.

## Response Output

The command outputs:

1. **Response Content** - The LLM's generated response
2. **Usage Statistics** - Token counts (input/output)

Example output:
```
Executing prompt from: my-prompt
Using model: gpt-4

--- Response ---

[LLM response content here]

--- Usage ---
Input Tokens: 450
Output Tokens: 320
```

## Supported Models

### OpenAI
- `gpt-4o`, `gpt-4-turbo`, `gpt-4`, `gpt-3.5-turbo`, `o1`, `o1-mini`
- Requires: `OPENAI_API_KEY`
- [View OpenAI provider documentation →](provider-openai)

### Anthropic (Claude)
- `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
- Requires: `ANTHROPIC_API_KEY`
- [View Anthropic provider documentation →](provider-anthropic)

### Google Gemini
- `gemini-2.0-flash-exp`, `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`
- Requires: `GEMINI_API_KEY`
- [View Gemini provider documentation →](provider-gemini)

## Error Handling

If execution fails, check:

1. **API Key** - Is the environment variable set correctly?
2. **Model Name** - Is the model name spelled correctly?
3. **Prompt Structure** - Does the prompt have required sections (instructions)?
4. **Network** - Can you reach the API endpoint?

## Tips

- Start with `process` to preview your prompt before executing
- Use lower temperature (0.2-0.5) for factual/deterministic tasks
- Use higher temperature (0.7-0.9) for creative tasks
- Set `max-tokens` to control costs and response length

## Provider-Specific Guides

Each LLM provider has different capabilities and best practices. See these guides for detailed information:

- **[OpenAI Provider Guide](provider-openai)** - GPT models, o-series, role handling
- **[Anthropic Provider Guide](provider-anthropic)** - Claude models, system prompts, tool use
- **[Gemini Provider Guide](provider-gemini)** - Gemini models, long context, native JSON

## Related Documentation

- [CLI Usage Overview](cli-usage) - All CLI commands
- [create Command](cli-create) - Scaffold new prompts
- [process Command](cli-process) - Preview and format prompts
- [Structured Outputs](structured-outputs) - Define schemas for responses

