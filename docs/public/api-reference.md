# API Reference

Complete API documentation for RiotPrompt's core interfaces and methods.

## Core Interfaces

### Section<T>

The main building block for organizing prompt content.

```typescript
interface Section<T extends WeightedText> {
  title: string;
  items: (T | Section<T>)[];
  weight?: number;
  parameters?: Parameters;
  
  // Methods
  add(item: T | Section<T> | string, options?: WeightedOptions): Section<T>;
  append(item: T | Section<T> | string, options?: WeightedOptions): Section<T>;
  prepend(item: T | Section<T> | string, options?: WeightedOptions): Section<T>;
  insert(index: number, item: T | Section<T> | string, options?: WeightedOptions): Section<T>;
  replace(index: number, item: T | Section<T> | string, options?: WeightedOptions): Section<T>;
  remove(index: number): Section<T>;
}
```

### WeightedText

Base interface for all prompt content types.

```typescript
interface WeightedText {
  text: string;
  weight?: number;
  parameters?: Parameters;
}
```

### Content Types

```typescript
interface Instruction extends WeightedText {}
interface ContentText extends WeightedText {}
interface Context extends WeightedText {}
interface Trait extends WeightedText {}
```

## Factory Functions

### createSection<T>()

Creates a new section with the specified options.

```typescript
function createSection<T extends WeightedText>(options: SectionOptions): Section<T>

interface SectionOptions {
  title: string;
  weight?: number;
  itemWeight?: number;
  parameters?: Parameters;
}
```

**Example:**
```typescript
const section = createSection<Instruction>({ 
  title: "Instructions",
  weight: 1.0,
  itemWeight: 0.8,
  parameters: { role: "developer" }
});
```

### createParameters()

Creates a parameters object for placeholder substitution.

```typescript
function createParameters(params: Record<string, any>): Parameters
```

**Example:**
```typescript
const params = createParameters({
  projectName: "MyApp",
  environment: "production"
});
```

## Formatter

Converts sections into formatted prompt strings.

### Formatter.create()

```typescript
class Formatter {
  static create(options?: FormatterOptions): Formatter
  
  format(section: Section<any>): string
}

interface FormatterOptions {
  formatOptions?: {
    areaSeparator?: "tag" | "markdown";
    sectionSeparator?: "tag" | "markdown";
  }
}
```

**Example:**
```typescript
const formatter = Formatter.create({
  formatOptions: {
    areaSeparator: "markdown",
    sectionSeparator: "tag"
  }
});

const formatted = formatter.format(section);
```

## Parser

Converts Markdown content to structured sections.

### Parser.create()

```typescript
class Parser {
  static create(options?: ParserOptions): Parser
  
  parse(markdown: string): Section<any>
  parseFile(filePath: string): Section<any>
}

interface ParserOptions {
  logger?: Logger;
  parameters?: Parameters;
}
```

**Example:**
```typescript
const parser = Parser.create({
  parameters: { version: "1.0" }
});

const section = parser.parse(`
# Instructions
Follow {{version}} guidelines.
`);
```

## Loader

Loads prompt content from files and directories.

### Loader.create()

```typescript
class Loader {
  static create(options?: LoaderOptions): Loader
  
  load<T extends WeightedText>(directories: string[]): Promise<Section<T>[]>
}

interface LoaderOptions {
  parameters?: Parameters;
  ignorePatterns?: string[];
}
```

**Example:**
```typescript
const loader = Loader.create({
  parameters: { env: "prod" },
  ignorePatterns: ["*.tmp", "draft-*"]
});

const sections = await loader.load<Context>(['./context']);
```

## Builder

Programmatic prompt construction with fluent interface.

### Builder.create()

```typescript
class Builder {
  static create(options: BuilderOptions): Builder
  
  addPersonaPath(path: string): Promise<Builder>
  addInstructionPath(path: string): Promise<Builder>
  addContextPath(path: string): Promise<Builder>
  addContentPath(path: string): Promise<Builder>
  
  addContent(content: string, options?: WeightedOptions): Promise<Builder>
  addContext(context: string, options?: WeightedOptions): Promise<Builder>
  
  loadContext(directories: string[], options?: WeightedOptions): Promise<Builder>
  loadContent(directories: string[], options?: WeightedOptions): Promise<Builder>
  
  build(): Promise<Prompt>
}

interface BuilderOptions {
  basePath: string;
  overridePaths?: string[];
  overrides?: boolean;
  parameters?: Parameters;
}
```

## Override

Multi-layered prompt customization system.

### Override.create()

```typescript
class Override {
  static create(options: OverrideOptions): Override
  
  customize(filePath: string, section: Section<any>): Promise<void>
}

interface OverrideOptions {
  configDirs: string[];
  overrides: boolean;
  parameters?: Parameters;
  logger?: Logger;
}
```

## Recipes API

### Configuration-Driven Recipe Creation

```typescript
function cook(config: RecipeConfig): Promise<Prompt>

interface RecipeConfig {
  basePath: string;
  overridePaths?: string[];
  overrides?: boolean;
  parameters?: Parameters;
  
  // Template inheritance
  template?: string;
  
  // Content sections
  persona?: ContentItem;
  instructions?: ContentItem[];
  content?: ContentItem[];
  context?: ContentItem[];
}

type ContentItem = string | {
  content?: string;
  path?: string;
  directories?: string[];
  title?: string;
  weight?: number;
}
```

### Fluent Recipe Builder

```typescript
function recipe(basePath: string): RecipeBuilder

interface RecipeBuilder {
  template(name: string): RecipeBuilder;
  with(config: Partial<RecipeConfig>): RecipeBuilder;
  persona(persona: ContentItem): RecipeBuilder;
  instructions(...instructions: ContentItem[]): RecipeBuilder;
  content(...content: ContentItem[]): RecipeBuilder;
  context(...context: ContentItem[]): RecipeBuilder;
  parameters(params: Parameters): RecipeBuilder;
  overrides(enabled: boolean): RecipeBuilder;
  overridePaths(paths: string[]): RecipeBuilder;
  cook(): Promise<Prompt>;
}
```

### Template Configuration

```typescript
function registerTemplates(templates: Record<string, TemplateConfig>): void
function getTemplates(): Record<string, TemplateConfig>
function clearTemplates(): void

interface TemplateConfig {
  persona?: ContentItem;
  instructions?: ContentItem[];
  content?: ContentItem[];
  context?: ContentItem[];
}
```

## Prompt

The final assembled prompt with formatting capabilities.

```typescript
interface Prompt {
  personaSection?: Section<Trait>;
  instructionsSection?: Section<Instruction>;
  contentSection?: Section<ContentText>;
  contextSection?: Section<Context>;
  
  format(formatter?: Formatter): string;
}
```

## Utility Types

### WeightedOptions

```typescript
interface WeightedOptions {
  weight?: number;
  title?: string;
  parameters?: Parameters;
}
```

### Parameters

```typescript
type Parameters = Record<string, any>
```

### Logger

```typescript
interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  verbose(message: string, ...args: any[]): void;
  silly(message: string, ...args: any[]): void;
}
```

## Import Examples

```typescript
// Core functionality
import { 
  createSection, 
  createParameters, 
  Formatter,
  Section,
  Instruction,
  ContentText,
  Context,
  Trait
} from '@riotprompt/riotprompt';

// Advanced features
import {
  Parser,
  Loader,
  Builder,
  Override
} from '@riotprompt/riotprompt';

// Recipes system
import {
  cook,
  recipe,
  registerTemplates,
  getTemplates,
  clearTemplates
} from '@riotprompt/riotprompt';
``` 