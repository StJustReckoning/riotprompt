# Configuration Reference

**Purpose**: Detailed guide on configuring `riotprompt`.

## Configuration File

RiotPrompt uses `cardigantime` for configuration management. It looks for a `riotprompt.yaml` file in the current working directory or parent directories.

### Schema

```yaml
# Default model to use if -m flag is not provided
defaultModel: "gpt-4"

# Base directory for prompts (optional, defaults to current dir)
promptsDir: "."

# Default output directory for processing (optional)
outputDir: "./output"
```

## Model Configuration

RiotPrompt has an internal `ModelRegistry` that determines how prompts are formatted for different models.

*   **Persona Role**: 
    *   `gpt-4`, `claude` family -> `system` role
    *   `o1` (o-series) -> `developer` role
*   **Encoding**: Used for token counting (if enabled).

Currently, these are hardcoded in `src/model-config.ts` but the library supports runtime configuration via `configureModel`.

```typescript
import { configureModel } from '@riotprompt/riotprompt';

// Register a custom local model
configureModel({
    exactMatch: 'my-local-llama',
    personaRole: 'system',
    encoding: 'cl100k_base',
    family: 'llama'
});
```

## CLI Flags

CLI flags always override configuration file settings.

*   `-m, --model <name>`: Overrides `defaultModel`.
*   `-o, --output <path>`: Overrides `outputDir`.

