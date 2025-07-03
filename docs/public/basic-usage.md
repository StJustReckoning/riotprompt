# Basic Usage

Learn how to create, organize, and format prompts with RiotPrompt's fundamental features.

## Creating Sections

Sections are the building blocks of RiotPrompt. Here's how to create and populate them:

```js
import { createSection, Formatter, Section, Instruction, Context } from '@riotprompt/riotprompt';

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

## Formatting Options

RiotPrompt supports various formatting styles to organize your prompt elements.

### Available Formatting Options

- **`areaSeparator`**: Determines how major areas (Instructions, Content, Context) are formatted
  - `"tag"`: Uses XML-style tags `<instructions>...</instructions>`
  - `"markdown"`: Uses markdown headers `#### Instructions`

- **`sectionSeparator`**: Determines how sections within areas are formatted
  - `"tag"`: Uses XML-style tags `<section title="Best Practices">...</section>`
  - `"markdown"`: Uses markdown subheaders `#### Section : Best Practices`

### Examples of Different Separator Styles

**Tag Format:**
```js
const formatterTags = Formatter.create({
  formatOptions: { 
    areaSeparator: "tag",
    sectionSeparator: "tag" 
  }
});
const formatted = formatterTags.format(section);
```

**Output:**
```xml
<Instructions>
Follow DRY (Don't Repeat Yourself) principles

Write readable code with clear variable names

Add comments for complex logic
</Instructions>
```

**Markdown Format:**
```js
const formatterMarkdown = Formatter.create({
  formatOptions: { 
    areaSeparator: "markdown",
    sectionSeparator: "markdown" 
  }
});
const formatted = formatterMarkdown.format(section);
```

**Output:**
```markdown
#### Instructions

Follow DRY (Don't Repeat Yourself) principles

Write readable code with clear variable names

Add comments for complex logic
```

## Manipulating Section Contents

Once you have a Section object, you can dynamically modify its contents using several methods:

### Adding Content

```js
const mySection: Section<Instruction> = createSection({ title: "Example" });

// Add items to the end
mySection.add("First item");
mySection.append("Another item at the end");

// Add items to the beginning
mySection.prepend("This comes first");

// Insert at specific position
mySection.insert(1, "This goes second");
```

### Modifying and Removing Content

```js
// Replace item at specific index
mySection.replace(0, "Replaced first item");

// Remove item at specific index
mySection.remove(2);
```

### Method Chaining

All modification methods return the Section instance, allowing for fluent chaining:

```js
const mySection: Section<Instruction> = createSection({ title: "Example" });

mySection
  .add("First item")
  .prepend("Actually, this is first")
  .insert(1, "This goes second")
  .remove(2); // Removes the original "First item"

const formatter = Formatter.create({ formatOptions: { sectionSeparator: "markdown" }});
const formatted = formatter.format(mySection);
console.log(formatted);
// Output: # Example
//
//         Actually, this is first
//
//         This goes second
```

## Working with Multiple Sections

You can create complex prompt structures by combining multiple sections:

```js
import { createSection, Formatter } from '@riotprompt/riotprompt';

// Create different types of sections
const persona = createSection({ title: "Assistant Persona" });
persona.add("You are a helpful coding assistant");
persona.add("You provide clear, practical examples");

const instructions = createSection({ title: "Instructions" });
instructions.add("Review the provided code carefully");
instructions.add("Suggest improvements where applicable");
instructions.add("Explain your reasoning");

const context = createSection({ title: "Code Context" });
context.add("This is a React component for user authentication");
context.add("The team follows TypeScript best practices");

// Format each section independently
const formatter = Formatter.create();
console.log(formatter.format(persona));
console.log(formatter.format(instructions));
console.log(formatter.format(context));
```

## Next Steps

Now that you understand basic section creation and formatting, explore these advanced topics:

- **[Advanced Usage](advanced-usage.md)** - Parameters, weights, and dynamic content
- **[Recipes System](recipes.md)** - Simplified prompt creation with templates
- **[Parser](parser.md)** - Convert Markdown files to structured prompts
- **[Builder Pattern](builder.md)** - Programmatic prompt assembly 