# 🎯 Template Configuration: Automatic File Loading

The RiotPrompt Recipes system supports **automatic file loading** through configurable templates. Once configured, templates like `'commit'` and `'release'` automatically load your persona and instruction files without any manual path configuration.

## 🚀 Quick Setup for KodrDriv

### 1. Configure Your Templates Once

In your main application file or a setup file:

```typescript
import { configureTemplates } from '@riotprompt/riotprompt';
import { 
  DEFAULT_PERSONA_YOU_FILE, 
  DEFAULT_INSTRUCTIONS_COMMIT_FILE,
  DEFAULT_PERSONA_RELEASER_FILE,
  DEFAULT_INSTRUCTIONS_RELEASE_FILE 
} from './constants';

// Configure templates to use your exact file paths
configureTemplates({
  commit: {
    persona: { path: DEFAULT_PERSONA_YOU_FILE, title: 'Developer Persona' },
    instructions: [{ path: DEFAULT_INSTRUCTIONS_COMMIT_FILE, title: 'Commit Instructions' }]
  },
  release: {
    persona: { path: DEFAULT_PERSONA_RELEASER_FILE, title: 'Release Manager Persona' },
    instructions: [{ path: DEFAULT_INSTRUCTIONS_RELEASE_FILE, title: 'Release Instructions' }]
  }
});
```

### 2. Use Templates Everywhere - Files Auto-Load!

Once configured, **all template usage automatically loads your files**:

```typescript
import { quick, commit, recipe } from '@riotprompt/riotprompt';

// ✨ All these automatically include your persona & instruction files:

// Quick builders
const prompt1 = await quick.commit(diffContent, {
  basePath: __dirname,
  userDirection: "Focus on performance"
});

// Template functions  
const prompt2 = await commit({
  basePath: __dirname,
  content: [{ content: diffContent, title: 'Diff' }]
});

// Recipe builder
const prompt3 = await recipe(__dirname)
  .template('commit')  // 🎯 Automatically loads your configured files!
  .with({
    content: [{ content: diffContent, title: 'Diff' }]
  });
```

## 🎨 Template Configuration Options

### Full Configuration Example

```typescript
import { configureTemplates, TemplateConfig } from '@riotprompt/riotprompt';

const templates: Record<string, TemplateConfig> = {
  commit: {
    persona: { 
      path: 'personas/developer.md', 
      title: 'Developer Persona',
      weight: 1.0 
    },
    instructions: [
      { path: 'instructions/commit.md', title: 'Commit Guidelines' },
      { path: 'instructions/git-best-practices.md', title: 'Git Best Practices' }
    ]
  },
  
  release: {
    persona: { path: 'personas/release-manager.md' },
    instructions: [
      { path: 'instructions/release.md' },
      { path: 'instructions/changelog.md' }
    ],
    context: [
      { path: 'context/release-notes-format.md' }
    ]
  },
  
  // Custom template for your specific workflow
  bugfix: {
    persona: { path: 'personas/debugging-expert.md' },
    instructions: [
      { path: 'instructions/debugging.md' },
      { path: 'instructions/testing.md' }
    ]
  }
};

configureTemplates(templates);
```

### Content Item Types

Each template section accepts flexible content items:

```typescript
{
  // String content
  persona: "You are an expert developer",
  
  // File path
  persona: { path: "personas/expert.md" },
  
  // File path with options
  persona: { 
    path: "personas/expert.md", 
    title: "Expert Developer",
    weight: 1.0 
  },
  
  // Multiple instructions
  instructions: [
    { path: "instructions/code-review.md" },
    { path: "instructions/security.md", weight: 0.8 },
    { content: "Always prioritize readability", title: "Readability Rule" }
  ],
  
  // Directory loading
  context: [
    { directories: ["context/project", "context/team"] }
  ]
}
```

## 🔄 Runtime Template Management

### Check Current Templates

```typescript
import { getTemplates } from '@riotprompt/riotprompt';

const currentTemplates = getTemplates();
console.log('Available templates:', Object.keys(currentTemplates));
```

### Update Templates Dynamically

```typescript
// Add new template
configureTemplates({
  'custom-workflow': {
    persona: { path: 'personas/workflow-expert.md' },
    instructions: [{ path: 'instructions/workflow.md' }]
  }
});

// Update existing template
configureTemplates({
  commit: {
    ...getTemplates().commit,
    instructions: [
      ...getTemplates().commit.instructions,
      { path: 'instructions/new-guideline.md' }
    ]
  }
});
```

## 🎯 Migration Guide: Builder → Templates

### Before (Builder Pattern)

```typescript
// 50+ lines of verbose Builder code
let builder = Builder.create({
  basePath: __dirname,
  overridePaths: [overridePath || ''],
  overrides: overrides || false,
});

builder = await builder.addPersonaPath(DEFAULT_PERSONA_YOU_FILE);
builder = await builder.addInstructionPath(DEFAULT_INSTRUCTIONS_COMMIT_FILE);

if (userDirection) {
  builder = await builder.addContent(userDirection, { title: 'User Direction', weight: 1.0 });
}

builder = await builder.addContent(diffContent, { title: 'Diff', weight: 0.5 });

if (directories?.length) {
  builder = await builder.loadContext(directories, { weight: 0.5 });
}

// ... more manual setup ...

return await builder.build();
```

### After (Template System)

```typescript
// 1. Configure once (in setup)
configureTemplates({
  commit: {
    persona: { path: DEFAULT_PERSONA_YOU_FILE },
    instructions: [{ path: DEFAULT_INSTRUCTIONS_COMMIT_FILE }]
  }
});

// 2. Use anywhere (1-3 lines!)
const createCommitPrompt = (diffContent, options) =>
  quick.commit(diffContent, {
    basePath: __dirname,
    overridePaths: [options.overridePath || './'],
    overrides: options.overrides || false,
    userDirection: options.userDirection,
    directories: options.directories,
  });
```

## 🔍 Template Resolution Order

When using templates, the system resolves content in this priority order:

1. **User-provided content** (highest priority)
2. **Template defaults** (configured via `configureTemplates`)
3. **Built-in defaults** (fallback)

```typescript
// Template provides: persona + instructions
// User adds: custom content + context
const prompt = await commit({
  basePath: __dirname,
  // Template automatically includes persona & instructions
  content: [
    { content: userDirection, title: 'User Direction' }, // User content
    { content: diffContent, title: 'Diff' }
  ],
  context: [
    { directories: ['docs/'] } // User context
  ]
});

// Result: Template files + User content combined!
```

## ✨ Best Practices

### 1. **Setup Once, Use Everywhere**
Configure templates in your application initialization, then use simple template calls throughout your codebase.

### 2. **Use Meaningful Template Names**
```typescript
configureTemplates({
  'git-commit': { /* ... */ },      // Clear purpose
  'release-notes': { /* ... */ },   // Specific use case
  'code-review': { /* ... */ },     // Obvious workflow
});
```

### 3. **Leverage Overrides with Templates**
Templates work seamlessly with the override system:

```typescript
const prompt = await quick.commit(diffContent, {
  basePath: __dirname,
  overridePaths: ['./project-overrides', '~/personal'],
  overrides: true
});
// Template files + Override files + User content = Perfect prompt!
```

### 4. **Template Inheritance**
Build complex templates from simpler ones:

```typescript
configureTemplates({
  // Base template
  'base-dev': {
    persona: { path: 'personas/developer.md' }
  },
  
  // Specialized templates
  'frontend-commit': {
    ...getTemplates()['base-dev'],
    instructions: [
      { path: 'instructions/frontend.md' },
      { path: 'instructions/accessibility.md' }
    ]
  },
  
  'backend-commit': {
    ...getTemplates()['base-dev'],
    instructions: [
      { path: 'instructions/backend.md' },
      { path: 'instructions/security.md' }
    ]
  }
});
```

---

## 🎉 Result: 90%+ Code Reduction

**Before**: 50+ lines of manual Builder configuration per prompt type
**After**: 1-3 lines using configured templates

The template system transforms RiotPrompt from a verbose, configuration-heavy library into an elegant, declarative prompt creation tool that "just works" with your existing file structure! 