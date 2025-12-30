# RiotPrompt Recipes: Generic Prompt Creation System

The **Recipes** system provides a powerful, declarative way to create prompts with RiotPrompt. Instead of verbose builder patterns, you can now create prompts using simple configuration objects.

## The Revolution: Before vs After

### Old Builder Approach (25+ lines)
```typescript
let builder: Builder.Instance = Builder.create({
  basePath: __dirname,
  overridePaths: ['./'],
  overrides: false,
});

builder = await builder.addPersonaPath('persona/expert.md');
builder = await builder.addInstructionPath('instructions/analyze.md');

if (userInput) {
  builder = await builder.addContent(userInput, { 
    title: 'User Input', 
    weight: 1.0 
  });
}

builder = await builder.addContent(dataToProcess, { 
  title: 'Data', 
  weight: 0.5 
});

if (directories?.length) {
  builder = await builder.loadContext(directories, { weight: 0.5 });
}

return await builder.build();
```

### New Recipes Approach (1-5 lines!)
```typescript
// Simple configuration-driven approach
return cook({
  basePath: __dirname,
  persona: { path: 'persona/expert.md' },
  instructions: [{ path: 'instructions/analyze.md' }],
  content: [
    { content: userInput, title: 'User Input', weight: 1.0 },
    { content: dataToProcess, title: 'Data', weight: 0.5 },
  ],
  context: [
    { directories: directories, weight: 0.5 },
  ],
});
```

## Key Benefits

- **80-95% Less Code**: Reduce 25+ lines to just 1-5 lines
- **Zero Boilerplate**: No more manual builder chaining
- **Declarative**: Describe what you want, not how to build it
- **Type-Safe**: Full TypeScript support with intelligent IntelliSense
- **Template System**: Create reusable configurations for common patterns
- **Smart Defaults**: Reasonable defaults reduce configuration
- **Completely Generic**: No hardcoded domain concepts

## Core API

### Basic Usage

```typescript
import { cook } from 'riotprompt';

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a helpful AI assistant' },
  instructions: [
    { content: 'Follow these guidelines...' },
    { path: 'instructions/specific-task.md' },
  ],
  content: [
    { content: sourceData, title: 'Source Data', weight: 1.0 },
    { path: 'examples/sample.md', weight: 0.5 },
  ],
  context: [
    { directories: ['docs/', 'specs/'], weight: 0.3 },
    { content: 'Additional context', title: 'Context', weight: 0.7 },
  ],
});
```

### Template System

Create reusable templates for common patterns:

```typescript
import { registerTemplates, cook } from 'riotprompt';

// Register your templates
registerTemplates({
  'codeReview': {
    persona: { path: 'personas/code-reviewer.md' },
    instructions: [{ path: 'instructions/review-guidelines.md' }],
  },
  'dataAnalysis': {
    persona: { content: 'You are a data analysis expert' },
    instructions: [
      { content: 'Analyze the provided data thoroughly' },
      { content: 'Identify patterns and anomalies' },
    ],
  },
  'documentation': {
    persona: { path: 'personas/technical-writer.md' },
    instructions: [{ path: 'instructions/documentation-style.md' }],
  },
});

// Use templates
const reviewPrompt = await cook({
  basePath: __dirname,
  template: 'codeReview',
  content: [
    { content: codeToReview, title: 'Code to Review' },
  ],
});

const analysisPrompt = await cook({
  basePath: __dirname,
  template: 'dataAnalysis',
  content: [
    { content: dataset, title: 'Dataset', weight: 1.0 },
  ],
});
```

### Fluent Recipe Builder

For those who prefer chainable APIs:

```typescript
import { recipe } from 'riotprompt';

// Using templates
const prompt = await recipe(__dirname)
  .template('codeReview')
  .with({
    content: [{ content: sourceCode, title: 'Code' }],
    context: [{ content: projectContext, title: 'Context' }],
  });

// Building from scratch
const customPrompt = await recipe(__dirname)
  .persona({ content: 'You are an expert consultant' })
  .instructions('Analyze the situation carefully')
  .content({ content: problemDescription, title: 'Problem' })
  .context({ directories: ['docs/'], weight: 0.3 })
  .cook();
```

## Override Configuration

The recipes system fully supports RiotPrompt's override system:

```typescript
const prompt = await cook({
  basePath: __dirname,
  overridePaths: [
    './project-overrides',    // Highest priority
    '~/personal-overrides',   // Medium priority  
    '/etc/global-overrides'   // Lowest priority
  ],
  overrides: true,
  template: 'myTemplate',
  content: [{ content: data, title: 'Data' }]
});
```

## Structured Outputs

The recipes system fully supports structured outputs using Zod schemas:

```typescript
import { cook } from 'riotprompt';
import { z } from 'zod';

// Define your output schema
const analysisSchema = z.object({
  summary: z.string(),
  tags: z.array(z.string()),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1)
});

// Use it in your recipe
const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a content analyst' },
  instructions: [
    { content: 'Analyze the content and provide structured output' }
  ],
  content: [{ content: articleText }],
  schema: analysisSchema  // Automatic validation and type safety
});
```

The schema works seamlessly across OpenAI, Anthropic (Claude), and Google Gemini with automatic format conversion.

[Learn more about Structured Outputs →](structured-outputs)

## Content Item Types

The recipes system supports flexible content specification:

```typescript
// String content
'Simple text content'

// Inline content with options
{
  content: 'Your content here',
  title: 'Optional Title',
  weight: 0.8  // Optional weight
}

// File-based content
{
  path: 'relative/path/to/file.md',
  title: 'Optional Title',
  weight: 1.0
}

// Directory loading
{
  directories: ['docs/', 'examples/'],
  title: 'Documentation',
  weight: 0.5
}
```

## Template Management

```typescript
import { registerTemplates, getTemplates, clearTemplates } from 'riotprompt';

// Register templates
registerTemplates({
  'myWorkflow': {
    persona: { path: 'personas/expert.md' },
    instructions: [{ path: 'instructions/workflow.md' }],
  },
});

// Get all registered templates
const templates = getTemplates();

// Clear all templates (useful for testing)
clearTemplates();
```

## Migration Guide

Replace your existing Builder code:

```typescript
// OLD WAY
let builder = Builder.create({ basePath: __dirname });
builder = await builder.addPersonaPath('persona.md');
builder = await builder.addInstructionPath('instructions.md');
builder = await builder.addContent(content, { title: 'Content' });
const prompt = await builder.build();

// NEW WAY
const prompt = await cook({
  basePath: __dirname,
  persona: { path: 'persona.md' },
  instructions: [{ path: 'instructions.md' }],
  content: [{ content, title: 'Content' }]
});
```

## Example Use Cases

### Code Analysis
```typescript
registerTemplates({
  'codeAnalysis': {
    persona: { content: 'You are a senior software engineer' },
    instructions: [
      { content: 'Analyze code quality, performance, and maintainability' },
      { content: 'Provide specific, actionable feedback' },
    ],
  },
});

const prompt = await cook({
  basePath: __dirname,
  template: 'codeAnalysis',
  content: [{ content: sourceCode, title: 'Source Code' }],
});
```

### Document Processing
```typescript
registerTemplates({
  'documentProcessor': {
    persona: { path: 'personas/document-expert.md' },
    instructions: [{ path: 'instructions/document-processing.md' }],
  },
});

const prompt = await cook({
  basePath: __dirname,
  template: 'documentProcessor',
  content: [
    { content: documentText, title: 'Document' },
    { path: 'examples/good-format.md', title: 'Format Example' },
  ],
});
```

### Data Analysis
```typescript
const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a data scientist' },
  instructions: [
    'Analyze the dataset for patterns and insights',
    'Provide visualizations where helpful',
  ],
  content: [
    { content: csvData, title: 'Dataset', weight: 1.0 },
    { content: metadata, title: 'Metadata', weight: 0.5 },
  ],
  context: [
    { directories: ['analysis-examples/'], weight: 0.3 },
  ],
});
```

## Why Recipes?

The name "Recipes" reflects the cooking metaphor:
- **Ingredients**: Your content, context, and instructions
- **Recipe**: The template and configuration
- **Cook**: The function that combines everything into a delicious prompt
- **Templates**: Pre-made recipes for common "dishes" (prompt types)

Just like cooking, you can follow a recipe exactly, modify it to taste, or create your own from scratch!

---

*The recipes system is completely generic and unopinionated. You define your own templates and workflows based on your specific needs.* 