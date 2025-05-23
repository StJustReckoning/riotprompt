# riotprompt

A structured prompt engineering library for LLMs - because you have better things to do than worry about prompt formatting.

> "I don't wanna hear it, know you're full of sh*t" - Minor Threat

## Table of Contents
- [Why riotprompt?](#why-riotprompt)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Core Concepts](#core-concepts)
  - [WeightedText](#weightedtext)
  - [Prompt Structure Elements](#prompt-structure-elements)
  - [Sections](#sections)
- [Advanced Usage](#advanced-usage)
  - [Creating Sections](#creating-sections)
  - [Setting Section and Item Weights](#setting-section-and-item-weights)
  - [Using Parameters for Customization](#using-parameters-for-customization)
  - [Parsing Markdown for Section Creation](#parsing-markdown-for-section-creation)
  - [Overriding Prompt Content](#overriding-prompt-content)
  - [Building Prompts](#building-prompts)
  - [Manipulating Section Contents](#manipulating-section-contents)
  - [Using the riotprompt Loader for File-Based Prompts](#using-the-riotprompt-loader-for-file-based-prompts)
  - [Customizing Format Options](#customizing-format-options)
- [Model Support](#model-support)
- [Why the Name?](#why-the-name)
- [Contributing](#contributing)
- [License](#license)

## Why riotprompt?

Tired of spending hours crafting and formatting the perfect LLM prompt? riotprompt provides a structured way to organize your prompts, allowing you to focus on the content rather than the formatting.

riotprompt helps you:
- Organize prompt elements into logical categories (instructions, content, context)
- Create reusable persona definitions with traits and instructions
- Group related items into sections
- Format everything consistently for different LLM models

## Installation

```bash
npm install @riotprompt
```

## Basic Usage

```js
import { createSection, createPrompt, Formatter, Section, Instruction } from '@riotprompt';

// Create a new prompt
const section: Section<Instruction> = createSection<Instruction>({ title: "Instructions" });

// Add instructions
section.add("Answer in a concise manner");
section.add("Provide code examples when appropriate");

// Verify parts of the output
console.log('Number of instructions:', section.items.length);
// Output: Number of instructions: 2

// Formatting a Section using Tags
const formatterTags = Formatter.create();
const formattedTags = formatterTags.format(section);
console.log(formattedTags);
// Output: <Instructions>
//         Answer in a concise manner
//
//         Provide code examples when appropriate
//         </Instructions>

// Formatting a Section using Markdown
const formatterMarkdown = Formatter.create({ formatOptions: { sectionSeparator: "markdown" }});
const formattedMarkdown = formatterMarkdown.format(section)
console.log(formattedMarkdown);
// Output: # Instructions
//
//         Answer in a concise manner
//
//         Provide code examples when appropriate


```

## Core Concepts

riotprompt is built around several key concepts:

### WeightedText

The base type for all prompt elements. Each element has:
- `text`: The actual content
- `weight`: Optional weight value (for potential future ranking/prioritization)

### Prompt Structure Elements

riotprompt organizes prompts into four main categories:

1. **Personas**: Define who the LLM should be
   - `name`: The persona's identifier
   - `traits`: Characteristics the persona should embody (e.g., "You are a developer working on a project who needs to create a commit message")
   - `instructions`: Specific guidance for the persona

2. **Instructions**: Tell the LLM how to respond
   - General guidelines for response format, tone, etc.

3. **Content**: What the LLM should respond to
   - The actual query or task

4. **Context**: Provide background information
   - Additional context that helps the LLM understand the request

### Sections

Groups related items together:
- `title`: Section name
- `items`: Collection of related elements

## Advanced Usage

### Creating Sections

```js
import { createSection, Formatter, Section, Instruction, Context } from '@riotprompt';

// Create a section for coding best practices
const instructions: Section<Instruction> = createSection<Instruction>({ title: "Instructions" });
instructions.add("Follow DRY (Don't Repeat Yourself) principles");
instructions.add("Write readable code with clear variable names");
instructions.add("Add comments for complex logic");

const writerPersona: Section<Instruction> = createSection<Instruction>({ title: "Writer Persona" });
writerPersona.add("You are an amazingly talented writer who is awesome.");

const literatureContext: Section<Context> = createSection<Context>({ title: "Literature Context" });
literatureContext.add("Here is the full text of a really long book.");
```

### Setting Section and Item Weights

riotprompt allows you to assign weights to sections and individual items within those sections. This can be useful for future enhancements where prompt elements might be prioritized or selected based on their weight.

You can define `weight` for the section itself and a default `itemWeight` for items added to that section using `SectionOptions`. Additionally, `parameters` can be defined at the section level and will be passed down to items added to that section.

```js
import { createSection, Formatter, Section, Instruction } from '@riotprompt';

// Create a section with specific weights and parameters
const weightedSection: Section<Instruction> = createSection<Instruction>({ 
  title: "Weighted Topics",
  weight: 10, // Weight for the entire section
  itemWeight: 5, // Default weight for items in this section
  parameters: { topic: "advanced" } // Parameters passed to items
});

// Items added to this section will inherit the itemWeight and parameters
// unless overridden individually.
weightedSection.add("Discuss {{topic}} caching strategies");
weightedSection.add("Explain {{topic}} database indexing", { weight: 7 }); // Override itemWeight
```

### Using Parameters for Customization

riotprompt supports dynamic content in your prompts through the use of parameters. Parameters allow you to define placeholders in your prompt text (e.g., `{{variable}}`) and replace them with specific values when the prompt is created or formatted. This is a simple yet powerful way to customize prompts for different scenarios without altering the core structure.

Parameters can be passed when creating a prompt, a persona, or a section. They can also be supplied directly when adding individual items like instructions, content, or context if those items are strings with placeholders.

```js
import { createSection, createParameters, Formatter, Section, Instruction, Parameters } from '@riotprompt';

const parameters: Parameters = createParameters({
  "targetLanguage": "Spanish",
})

const instructions: Section<Instruction> = createSection({ title: "Instructions", parameters });
instructions.add("Translate the following text to {{targetLanguage}}.");

const formatter = Formatter.create({ formatOptions: { sectionSeparator: "markdown" }});
const formatted = formatter.format(instructions);
console.log(formatted);
// Output: # Instructions
//         Translate the following text to Spanish
//
```

### Parsing Markdown for Section Creation

riotprompt can simplify the process of structuring your prompts by parsing Markdown content. When you provide Markdown text, riotprompt can automatically convert Markdown headers (e.g., `# Title`, `## Subtitle`) into `Section` objects. The text of the header becomes the title of the `Section`.

This allows you to draft complex prompt structures in a familiar Markdown format and then easily import them into riotprompt. For instance, a document like this:

```markdown
# Main Topic
Some general instructions or content.

## Sub-Topic 1
Details about the first sub-topic.

### Sub-Sub-Topic A
Further details.

## Sub-Topic 2
Details about the second sub-topic.
```

Could be parsed into a main section titled "Main Topic" containing text and two sub-sections: "Sub-Topic 1" (which itself contains a nested section "Sub-Sub-Topic A") and "Sub-Topic 2". The content under each header would become items within the respective sections.

```js
import { Parser, Formatter } from '@riotprompt';

// Markdown content with sections
const markdownContent = `
# Instructions
Follow these guidelines when writing code.

## Best Practices
- Keep functions small and focused
- Use meaningful variable names

## Documentation
- Comment complex logic
- Document public APIs thoroughly
`;

// Parse the Markdown into a Section structure
const parser = Parser.create();

const parsedSection = parser.parse(markdownContent);

// Now you can manipulate the parsed sections
const bestPracticesSection = parsedSection.items[1]; // Accessing the "Best Practices" section
bestPracticesSection.add("- Write tests for your code");

// Format the resulting section structure
const formatter = Formatter.create();
const formattedPrompt = formatter.format(parsedSection);
console.log(formattedPrompt);
/* Output:
<Instructions>
Follow these guidelines when writing code.

<section title="Best Practices">
- Keep functions small and focused
- Use meaningful variable names
- Write tests for your code
</section>

<section title="Documentation">
- Comment complex logic
- Document public APIs thoroughly
</section>
</Instructions>
*/
```

For more information, see the [riotprompt Parser Documentation](docs/parser.md)

### Overriding Prompt Content

riotprompt's Override utility allows you to customize or replace parts of a prompt without altering the original prompt files. This is particularly useful in larger applications where you have default prompt templates but want to adjust certain sections for specific use cases, users, or environments. By using overrides, you can maintain a clean separation between core prompt content and custom modifications.

The override system works by looking for specially-named files in an override directory that correspond to your prompt files. You can completely override a section (replace it entirely), prepend content (insert before the original), or append content (insert after the original). This is all done through a simple file naming convention where files with the same name fully override, files ending in `-pre.md` prepend content, and files ending in `-post.md` append content.

For more information, see the [riotprompt Override Documentation](docs/override.md)

### Building Prompts

The riotprompt library provides a powerful Builder pattern for constructing complex prompts programmatically. The Builder allows you to assemble prompts from various sources including files, directories, and inline content.

#### Using the Builder

The Builder provides a fluent interface for assembling prompts from various sources:

<!-- skip-example -->
```js
import { Builder } from '@riotprompt';

// Create a builder instance
const builder = Builder.create({
  basePath: './prompts',         // Base directory for prompt files
  overridePath: './overrides',   // Optional directory for override files
  overrides: true,               // Whether to apply overrides
  parameters: { role: 'expert' } // Optional parameters for substitution
});

// Build a prompt from various sources
const prompt: Prompt = await builder
  .addPersonaPath('personas/developer.md')
  .addInstructionPath('instructions/code-review.md')
  .loadContext(['./context/people', './context/projects'])
  .addContent('Here is some code I want you to look at.')
  .build();

// Format and use the prompt with your LLM API
```

#### Builder Methods

The Builder supports the following methods:

- **`addPersonaPath(path)`**: Load a persona from a file
- **`addContextPath(path)`**: Load context from a file
- **`addInstructionPath(path)`**: Load instructions from a file  
- **`addContentPath(path)`**: Load content from a file
- **`addContent(text)`**: Add content directly as a string
- **`addContext(text)`**: Add context directly as a string
- **`loadContext(directories)`**: Load context from multiple directories
- **`loadContent(directories)`**: Load content from multiple directories
- **`build()`**: Assemble the final prompt

All methods return the builder instance for chaining, and the `build()` method returns a Promise that resolves to a `Prompt` object.

#### Loading from Directories

The Builder can load content from entire directories:

<!-- skip-example -->
```js
import { Builder } from '@riotprompt/builder';

const builder = Builder.create({
  basePath: './prompts',
});

// Load all files from specific directories
const prompt = await builder
  .loadContext(['context/user', 'context/project'])
  .loadContent(['content/queries'])
  .build();
```

### Manipulating Section Contents

Once you have a `Section` object, whether created directly, through Markdown parsing, or as part of a `riotprompt` instance (e.g., `prompt.instructionsSection`), you have several methods to manage its contents. These methods allow for dynamic construction and modification of your prompt structure.

The `Section` interface provides the following methods for item manipulation:

- **`add(item: T | Section<T> | string, options?: WeightedOptions): Section<T>`**
  Appends a new item or a nested section to the end of the section's item list. If a string is provided, it's typically converted into an appropriate `WeightedText` object (e.g., `Instruction`, `ContentText`).
  ```typescript
  mySection.add("New item at the end");
  const nestedSection = createSection("Nested");
  mySection.add(nestedSection);
  ```

- **`append(item: T | Section<T> | string, options?: WeightedOptions): Section<T>`**
  Alias for `add`. Appends an item or nested section to the end.
  ```typescript
  mySection.append("Another item at the end");
  ```

- **`prepend(item: T | Section<T> | string, options?: WeightedOptions): Section<T>`**
  Adds a new item or a nested section to the beginning of the section's item list.
  ```typescript
  mySection.prepend("Item at the very beginning");
  ```

- **`insert(index: number, item: T | Section<T> | string, options?: WeightedOptions): Section<T>`**
  Inserts an item or nested section at a specific zero-based `index` within the item list.
  ```typescript
  mySection.insert(1, "Item at index 1"); // Inserts after the first item
  ```

- **`replace(index: number, item: T | Section<T> | string, options?: WeightedOptions): Section<T>`**
  Replaces the item at the specified `index` with a new item or nested section.
  ```typescript
  mySection.replace(0, "Replaced first item");
  ```

- **`remove(index: number): Section<T>`**
  Removes the item at the specified `index` from the item list.
  ```typescript
  mySection.remove(0); // Removes the first item
  ```

These methods return the `Section` instance itself, allowing for fluent chaining of operations:

```js
import { createSection, Formatter, Section, Instruction } from '@riotprompt';

const mySection: Section<Instruction> = createSection({ title: "Example" });

mySection
  .add("First item")
  .prepend("Actually, this is first")
  .insert(1, "This goes second")
  .remove(2); // Removes "First item"

const formatter = Formatter.create({ formatOptions: { sectionSeparator: "markdown" }})
const formatted = formatter.format( mySection );
console.log( formatted );
// Output: # Example
//
//         Actually, this is first
//
//         This goes second
```
```

### Using the riotprompt Loader for File-Based Prompts

riotprompt provides a Loader utility that allows you to load prompt templates from external files. This is particularly useful when you want to:

- Store complex prompts as separate files
- Share prompt templates across different parts of your application
- Keep your prompt content separate from your application code

The Loader supports various file formats and can automatically parse the content into the appropriate Section structures.

The Loader works seamlessly with the Parser to convert structured content into riotprompt's internal representation, allowing you to focus on writing clear prompts rather than managing their implementation details.

For more documentation on the Loader, see the [riotprompt Loader Documentation](docs/loader.md)

### Customizing Format Options

riotprompt supports various formatting styles to organize your prompt elements:

#### Available Formatting Options

- **areaSeparator**: Determines how major areas (Instructions, Content, Context) are formatted
  - `"tag"`: Uses XML-style tags `<instructions>...</instructions>`
  - `"markdown"`: Uses markdown headers `#### Instructions`

- **sectionSeparator**: Determines how sections within areas are formatted
  - `"tag"`: Uses XML-style tags `<section title="Best Practices">...</section>`
  - `"markdown"`: Uses markdown subheaders `#### Section : Best Practices`

#### Examples of Different Separator Styles

Here's how the same prompt would be formatted using different separator styles:

**Tag Style (Default)**

```
<instructions>
  Answer in a concise manner
  Provide code examples when appropriate
  
  <section title="Best Practices">
    Follow DRY (Don't Repeat Yourself) principles
    Write readable code with clear variable names
    Add comments for complex logic
  </section>
</instructions>

<contents>
  Explain how promises work in JavaScript
</contents>

<context>
  This is for a beginner JavaScript tutorial
</context>
```

**Markdown Style**

```
#### Instructions

Answer in a concise manner
Provide code examples when appropriate

#### Section : Best Practices

Follow DRY (Don't Repeat Yourself) principles
Write readable code with clear variable names
Add comments for complex logic

#### Contents

Explain how promises work in JavaScript

#### Context

This is for a beginner JavaScript tutorial
```

Different LLM providers have different recommendations for prompt formatting:

- **Anthropic (Claude)** generally recommends using XML-style tags to clearly delineate sections of prompts
- **OpenAI (GPT)** models work well with both markdown-style formatting and XML tags

The field of prompt engineering is rapidly evolving, with new research and best practices emerging regularly. riotprompt's flexible formatting system allows you to adapt to these changes without rewriting your prompts entirely.

By separating the structure of your prompt (instructions, context, content) from its formatting, riotprompt makes it easier to experiment with different formatting approaches to find what works best for your specific use case and model.


## Model Support

The initial version of riotprompt is designed specifically for the OpenAI API with models such as:
- gpt-4o
- gpt-4o-mini
- o1-mini
- o1
- o1-preview
- o1-pro
- o3-mini

Future versions will be expanded to support other LLM providers and their respective models.

The formatter automatically adapts the prompt structure based on the model's requirements (e.g., using system messages for models that support them).

## Why the Name?

Why not?  Who are you to even ask that question?

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Apache 2.0
