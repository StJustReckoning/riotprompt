# Builder Pattern

The Builder pattern provides a powerful, programmatic way to construct complex prompts in RiotPrompt. It offers fine-grained control over prompt assembly and is perfect for dynamic prompt generation scenarios.

## Overview

The Builder allows you to assemble prompts from various sources including files, directories, and inline content. It provides a fluent interface for building prompts step by step, with support for overrides, parameters, and complex content loading.

## Creating a Builder

```typescript
import { Builder } from '@riotprompt/riotprompt';

// Create a builder instance
const builder = Builder.create({
  basePath: './prompts',         // Base directory for prompt files
  overridePaths: ['./overrides', '~/personal'], // Array of override directories (closest to furthest)
  overrides: true,               // Whether to apply overrides
  parameters: { role: 'expert' } // Optional parameters for substitution
});
```

### Builder Options

- **`basePath`**: Base directory for prompt files
- **`overridePaths`**: Array of override directories, ordered from closest (highest priority) to furthest (lowest priority)
- **`overrides`**: Whether to apply overrides (boolean)
- **`parameters`**: Optional parameters for placeholder substitution

## Builder Methods

The Builder supports the following methods for assembling prompts:

### Adding Individual Files

```typescript
// Add persona from a file
await builder.addPersonaPath('personas/developer.md');

// Add instructions from a file
await builder.addInstructionPath('instructions/code-review.md');

// Add context from a file
await builder.addContextPath('context/project-info.md');

// Add content from a file
await builder.addContentPath('content/example-request.md');
```

### Adding Inline Content

```typescript
// Add content directly as a string
await builder.addContent('Here is some code I want you to look at.', {
  title: 'Code Request',
  weight: 1.0
});

// Add context directly
await builder.addContext('This is a production system.', {
  title: 'Environment Context',
  weight: 0.8
});
```

### Loading from Directories

```typescript
// Load context from multiple directories
await builder.loadContext(['./context/people', './context/projects'], {
  weight: 0.5
});

// Load content from directories
await builder.loadContent(['./content/queries'], {
  weight: 1.0
});
```

### Building the Final Prompt

```typescript
// Assemble the final prompt
const prompt: Prompt = await builder.build();
```

## Complete Example

Here's a comprehensive example showing Builder usage:

```typescript
import { Builder, Prompt } from '@riotprompt/riotprompt';

// Create builder with configuration
const builder = Builder.create({
  basePath: './prompts',
  overridePaths: ['./project-overrides', '~/personal-overrides'],
  overrides: true,
  parameters: {
    projectName: 'MyApp',
    environment: 'production'
  }
});

// Build a complex prompt
const prompt: Prompt = await builder
  .addPersonaPath('personas/senior-developer.md')
  .addInstructionPath('instructions/code-review.md')
  .addInstructionPath('instructions/security-focus.md')
  .addContent(codeToReview, { 
    title: 'Source Code', 
    weight: 1.0 
  })
  .addContent(userGuidelines, { 
    title: 'User Guidelines', 
    weight: 0.8 
  })
  .loadContext(['./context/architecture', './context/team'], { 
    weight: 0.6 
  })
  .build();

// Use the prompt with your LLM API
const formattedPrompt = prompt.format();
```

## Method Chaining

All Builder methods return the builder instance, allowing for fluent method chaining:

```typescript
const prompt = await Builder.create({ basePath: './prompts' })
  .addPersonaPath('personas/assistant.md')
  .addInstructionPath('instructions/helpful.md')
  .addContent('How do I deploy my app?')
  .build();
```

## Working with Overrides

The Builder seamlessly integrates with RiotPrompt's override system:

```typescript
// Builder with multiple override layers
const builder = Builder.create({
  basePath: './prompts',
  overridePaths: [
    './project-overrides',    // Highest priority
    '~/personal-overrides',   // Medium priority
    '/etc/global-overrides'   // Lowest priority
  ],
  overrides: true
});

// Original files + Override files = Customized prompt
const prompt = await builder
  .addPersonaPath('personas/reviewer.md') // Can be overridden
  .addInstructionPath('instructions/review.md') // Can be overridden
  .build();
```

## Dynamic Content Loading

The Builder excels at dynamic prompt construction:

```typescript
const createDynamicPrompt = async (userType: string, taskType: string, content: string) => {
  const builder = Builder.create({ basePath: './prompts' });
  
  // Add persona based on user type
  await builder.addPersonaPath(`personas/${userType}.md`);
  
  // Add instructions based on task type
  await builder.addInstructionPath(`instructions/${taskType}.md`);
  
  // Add user content
  await builder.addContent(content, { title: 'User Request' });
  
  // Conditionally add context based on task type
  if (taskType === 'code-review') {
    await builder.loadContext(['./context/coding-standards']);
  } else if (taskType === 'documentation') {
    await builder.loadContext(['./context/documentation-standards']);
  }
  
  return await builder.build();
};

// Usage
const prompt = await createDynamicPrompt('senior-developer', 'code-review', sourceCode);
```

## Error Handling

The Builder provides helpful error messages for common issues:

```typescript
try {
  const prompt = await Builder.create({ basePath: './prompts' })
    .addPersonaPath('personas/nonexistent.md')
    .build();
} catch (error) {
  console.error('Failed to build prompt:', error.message);
  // Handle missing files, invalid paths, etc.
}
```

## When to Use the Builder

The Builder pattern is ideal for:

- **Complex prompt assembly** requiring multiple file sources
- **Dynamic prompt generation** based on runtime conditions
- **Fine-grained control** over prompt structure and content
- **Integration with override systems** for customization
- **Legacy codebases** migrating from manual prompt construction

## Migration to Recipes

For new projects, consider the [Recipes System](recipes.md) which provides a more concise API:

```typescript
// Builder approach (verbose)
const builderPrompt = await Builder.create({ basePath: __dirname })
  .addPersonaPath('persona/developer.md')
  .addInstructionPath('instructions/commit.md')
  .addContent(diffContent, { title: 'Diff' })
  .build();

// Recipes approach (concise)
const recipePrompt = await quick.commit(diffContent, { 
  basePath: __dirname 
});
```

The Builder remains powerful for complex scenarios requiring detailed control, while Recipes provide a more streamlined experience for common use cases. 