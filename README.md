# 🔥 RiotPrompt

A powerful, flexible prompt building library for AI applications with zero hardcoded assumptions.

## 🎯 Features

- **Generic & Extensible**: No hardcoded domain concepts - build any type of prompt
- **Template System**: Create reusable templates for common patterns
- **Declarative Configuration**: Simple object-based prompt creation
- **Type-Safe**: Full TypeScript support with excellent IntelliSense
- **Override System**: Customize prompts with hierarchical overrides
- **Multiple Content Types**: Support for files, directories, and inline content

## 🚀 Quick Start

```typescript
import { cook, registerTemplates } from 'riotprompt';

// Simple prompt creation
const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a helpful AI assistant' },
  instructions: [
    { content: 'Analyze the provided content carefully' },
    { path: 'instructions/guidelines.md' },
  ],
  content: [
    { content: sourceData, title: 'Source Data', weight: 1.0 },
    { directories: ['examples/'], weight: 0.5 },
  ],
  context: [
    { content: 'Additional context', title: 'Context' },
  ],
});

// Register and use templates
registerTemplates({
  'analysis': {
    persona: { content: 'You are an expert analyst' },
    instructions: [{ content: 'Provide detailed analysis' }],
  },
});

const analysisPrompt = await cook({
  basePath: __dirname,
  template: 'analysis',
  content: [{ content: dataToAnalyze, title: 'Data' }],
});
```

## 📚 Documentation

- [Core Concepts](docs/public/core-concepts.md)
- [Recipes System](docs/public/recipes.md)
- [API Reference](docs/public/api-reference.md)
- [Template Configuration](docs/public/template-configuration.md)

## 🔧 Installation

```bash
npm install riotprompt
```

## 💡 Philosophy

RiotPrompt is designed to be completely generic and unopinionated. Unlike other prompt libraries that assume specific use cases, RiotPrompt provides the building blocks for any prompt-based application while maintaining type safety and developer experience.

## 🏗️ Architecture

- **Cook Function**: Core prompt creation engine
- **Template System**: Reusable configuration patterns
- **Content Processing**: Flexible content handling (files, directories, inline)
- **Override System**: Hierarchical customization
- **Type Safety**: Full TypeScript support throughout

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

Apache-2.0 License - see [LICENSE](LICENSE) for details.

---

*Build better prompts, faster.*
