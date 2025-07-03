# 🚀 RiotPrompt Recipes: Revolutionary Prompt Creation

The new **Recipes** system completely transforms how you create prompts with RiotPrompt. Say goodbye to verbose builder patterns and hello to efficient, declarative prompt creation!

## 📊 The Revolution: Before vs After

### ❌ Old Builder Approach (25+ lines)
```typescript
let builder: Builder.Instance = Builder.create({
  basePath: __dirname,
  overridePaths: ['./'],
  overrides: false,
});

builder = await builder.addPersonaPath('persona/developer.md');
builder = await builder.addInstructionPath('instructions/commit.md');

if (userDirection) {
  builder = await builder.addContent(userDirection, { 
    title: 'User Direction', 
    weight: 1.0 
  });
}

builder = await builder.addContent(diffContent, { 
  title: 'Diff', 
  weight: 0.5 
});

if (directories?.length) {
  builder = await builder.loadContext(directories, { weight: 0.5 });
}

return await builder.build();
```

### ✅ New Recipes Approach (1-3 lines!)
```typescript
// Quick Builder - 1 line!
return quick.commit(diffContent, { basePath: __dirname, userDirection });

// Template-based - 2 lines!
return commit({
  basePath: __dirname,
  content: [
    { content: userDirection, title: 'User Direction', weight: 1.0 },
    { content: diffContent, title: 'Diff', weight: 0.5 },
  ],
});

// Configuration-driven - Single object!
return cook({
  basePath: __dirname,
  template: 'commit',
  content: [
    { content: userDirection, title: 'User Direction', weight: 1.0 },
    { content: diffContent, title: 'Diff', weight: 0.5 },
  ],
});
```

## 🎯 Key Benefits

- **80-95% Less Code**: Reduce 25+ lines to just 1-5 lines
- **Zero Boilerplate**: No more manual builder chaining
- **Declarative**: Describe what you want, not how to build it
- **Type-Safe**: Full TypeScript support with intelligent IntelliSense
- **Multiple APIs**: Choose the style that fits your preferences
- **Smart Defaults**: Reasonable defaults reduce configuration
- **Template-Based**: Reusable patterns for common use cases

## 🛠️ API Reference

### Quick Builders
The fastest way to create common prompt types:

```typescript
import { quick } from 'riotprompt';

// Commit prompts with overrides
const prompt = await quick.commit(diffContent, {
  basePath: __dirname,
  overridePaths: ['./project-overrides', '~/personal'],
  overrides: true,
  userDirection: "Focus on performance",
  context: "This is a critical system",
  directories: ["docs/", "specs/"]
});

// Release prompts with overrides
const prompt = await quick.release(logContent, diffContent, {
  basePath: __dirname,
  overridePaths: ['./overrides'],
  overrides: true,
  releaseFocus: "Breaking changes",
  context: "Major version bump"
});
```

### Template Functions
Pre-configured templates for common scenarios:

```typescript
import { commit, release, documentation, review } from 'riotprompt';

const commitPrompt = await commit({
  basePath: __dirname,
  content: [
    { content: diffContent, title: 'Changes', weight: 1.0 },
    { content: context, title: 'Context', weight: 0.5 },
  ],
  context: [
    { directories: ['docs/'], weight: 0.3 }
  ]
});
```

### Configuration-Driven
Maximum flexibility with declarative configuration:

```typescript
import { cook } from 'riotprompt';

const prompt = await cook({
  basePath: __dirname,
  template: 'commit',  // or 'release', 'documentation', 'review'
  persona: { path: 'persona/expert.md' },
  instructions: [
    { path: 'instructions/analyze.md' },
    { content: 'Focus on security', title: 'Security Focus' },
  ],
  content: [
    { content: codeToReview, title: 'Source Code', weight: 1.0 },
    { path: 'examples/good-patterns.ts', weight: 0.5 },
  ],
  context: [
    { directories: ['docs/', 'specs/'], weight: 0.3 },
    { content: 'Production system', title: 'Environment', weight: 0.7 },
  ],
});
```

### Fluent Recipe Builder
Chainable API for those who prefer fluent interfaces:

```typescript
import { recipe } from 'riotprompt';

const prompt = await recipe(__dirname)
  .template('commit')
  .with({
    content: [
      { content: diffContent, title: 'Diff', weight: 1.0 }
    ],
    context: [
      { content: additionalContext, title: 'Context', weight: 0.5 }
    ]
  });

// Or build from scratch
const customPrompt = await recipe(__dirname)
  .persona({ content: 'You are an expert code reviewer' })
  .instructions(
    { path: 'instructions/review.md' },
    'Focus on performance and security'
  )
  .content({ content: sourceCode, title: 'Code to Review' })
  .context({ directories: ['docs/'], weight: 0.3 })
  .cook();
```

## 🔧 Override Configuration

The recipes system fully supports RiotPrompt's override system for customizing prompts:

```typescript
// Single override directory
const prompt = await cook({
  basePath: __dirname,
  overridePaths: ['./my-overrides'],
  overrides: true,
  template: 'commit',
  content: [{ content: diffContent, title: 'Changes' }]
});

// Multiple override directories (closest to furthest priority)
const prompt = await cook({
  basePath: __dirname,
  overridePaths: [
    './project-overrides',    // Highest priority
    '~/personal-overrides',   // Medium priority  
    '/etc/global-overrides'   // Lowest priority
  ],
  overrides: true,
  template: 'commit',
  content: [{ content: diffContent, title: 'Changes' }]
});

// Works with ALL recipe approaches
const quickPrompt = await quick.commit(diffContent, {
  basePath: __dirname,
  overridePaths: ['./overrides'],
  overrides: true,
  userDirection: "Focus on security"
});
```

## 🎨 Content Item Types

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

## 🔧 Built-in Templates

### Commit Template
```typescript
const prompt = await commit({
  basePath: __dirname,
  content: [
    { content: diffContent, title: 'Changes' },
    { content: userDirection, title: 'Direction' }
  ]
});
```

### Release Template
```typescript
const prompt = await release({
  basePath: __dirname,
  content: [
    { content: logContent, title: 'Changelog' },
    { content: diffContent, title: 'Changes' }
  ]
});
```

### Documentation Template
```typescript
const prompt = await documentation({
  basePath: __dirname,
  content: [
    { path: 'src/api.ts', title: 'Source Code' },
    { content: requirements, title: 'Requirements' }
  ]
});
```

### Review Template
```typescript
const prompt = await review({
  basePath: __dirname,
  content: [
    { content: codeToReview, title: 'Code' },
    { content: guidelines, title: 'Guidelines' }
  ]
});
```

## 🚀 Migration Guide

Replace your existing Builder code:

```typescript
// OLD WAY ❌
let builder = Builder.create({ basePath: __dirname });
builder = await builder.addPersonaPath('persona.md');
builder = await builder.addInstructionPath('instructions.md');
builder = await builder.addContent(content, { title: 'Content' });
const prompt = await builder.build();

// NEW WAY ✅
const prompt = await cook({
  basePath: __dirname,
  persona: { path: 'persona.md' },
  instructions: [{ path: 'instructions.md' }],
  content: [{ content, title: 'Content' }]
});
```

## 💡 Why Recipes?

The name "Recipes" reflects the cooking metaphor:
- **Ingredients**: Your content, context, and instructions
- **Recipe**: The template and configuration
- **Cook**: The function that combines everything into a delicious prompt
- **Templates**: Pre-made recipes for common dishes (prompt types)

Just like cooking, you can follow a recipe exactly, modify it to taste, or create your own from scratch!

---

**Result**: Transform 25+ lines of verbose builder code into 1-5 lines of clean, declarative configuration. Your prompts will be easier to read, write, and maintain! 🎉 