# Usage Patterns

**Purpose**: Common patterns for using `riotprompt` via CLI and Library.

## CLI Usage

The CLI is the primary way to interact with filesystem-based prompts.

### Directory Structure

RiotPrompt expects a specific directory structure for a prompt "package":

```
my-prompt-project/
├── persona.md          # OR directory persona/ containing .md files
├── instructions.md     # OR directory instructions/ containing .md files
└── context/            # Directory containing reference files (json, md, txt)
    ├── data.json
    └── background.md
```

### Commands

**Create a New Prompt**:
```bash
# Create a prompt in the current directory
riotprompt create my-new-prompt

# Create with custom content
riotprompt create my-new-prompt --persona "You are a data scientist." --instructions "Analyze this dataset."

# Create without context directory
riotprompt create my-new-prompt --no-context
```

**Process a Prompt**:
```bash
# Default text output (formatted for console/copy-paste)
riotprompt process ./my-prompt-project

# Specify a target model (affects formatting, e.g., role names)
riotprompt process ./my-prompt-project --model gpt-4

# Export to JSON (for API integration)
riotprompt process ./my-prompt-project --format json --output prompt.json

# Export to XML
riotprompt process ./my-prompt-project --format xml --output prompt.xml
```

## Library Usage

You can import `riotprompt` into your own TypeScript applications to build dynamic prompt pipelines.

### Dynamic Context Injection

A common pattern is to have static instructions but dynamic context (e.g., user data).

```typescript
import * as RiotPrompt from '@riotprompt/riotprompt';

async function buildPromptForUser(userData: any) {
    // 1. Load static parts from disk
    const loader = RiotPrompt.Loader.create();
    const [baseContext] = await loader.load(['./prompts/base-context']);
    
    // 2. Create dynamic sections
    const userContext = RiotPrompt.createSection({ title: 'User Data' });
    userContext.add(JSON.stringify(userData));

    // 3. Create Instructions
    const instructions = RiotPrompt.createSection({ title: 'Task' })
        .add(RiotPrompt.createInstruction('Analyze this user data.'));

    // 4. Assemble
    const prompt = RiotPrompt.createPrompt({
        instructions,
        contexts: RiotPrompt.createSection({ title: 'Context' })
            .add(baseContext)
            .add(userContext) // Inject dynamic part
    });

    return prompt;
}
```

### Custom Formatters

If you need to output to a specific non-standard format, you can access the raw `Prompt` object structure.

```typescript
const prompt = ...;

// Iterate over instructions
prompt.instructions.items.forEach(item => {
    console.log(item.text);
});
```

