# Advanced Usage

Explore RiotPrompt's powerful features for complex prompt engineering scenarios.

## Setting Section and Item Weights

RiotPrompt allows you to assign weights to sections and individual items within those sections. This can be useful for future enhancements where prompt elements might be prioritized or selected based on their weight.

You can define `weight` for the section itself and a default `itemWeight` for items added to that section using `SectionOptions`. Additionally, `parameters` can be defined at the section level and will be passed down to items added to that section.

```js
import { createSection, Formatter, Section, Instruction } from '@riotprompt/riotprompt';

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

## Using Parameters for Customization

RiotPrompt supports dynamic content in your prompts through the use of parameters. Parameters allow you to define placeholders in your prompt text (e.g., `{{variable}}`) and replace them with specific values when the prompt is created or formatted.

Parameters can be passed when creating a prompt, a persona, or a section. They can also be supplied directly when adding individual items like instructions, content, or context if those items are strings with placeholders.

```js
import { createSection, createParameters, Formatter, Section, Instruction, Parameters } from '@riotprompt/riotprompt';

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

### Advanced Parameter Usage

Parameters can be used in complex scenarios with nested placeholders and conditional content:

```js
const parameters = createParameters({
  projectName: "MyApp",
  environment: "production",
  userRole: "admin",
  features: ["authentication", "analytics", "reporting"]
});

const contextSection = createSection({ 
  title: "Project Context", 
  parameters 
});

contextSection.add("Working on {{projectName}} in {{environment}} environment");
contextSection.add("User has {{userRole}} privileges");
contextSection.add("Available features: {{features}}");

// Parameters are automatically substituted when formatting
const formatted = formatter.format(contextSection);
```

## Parsing Markdown for Section Creation

RiotPrompt can simplify the process of structuring your prompts by parsing Markdown content. When you provide Markdown text, RiotPrompt can automatically convert Markdown headers (e.g., `# Title`, `## Subtitle`) into `Section` objects.

```js
import { Parser, Formatter } from '@riotprompt/riotprompt';

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

For more information, see the [Parser Documentation](parser.md).

## Working with Complex Nested Structures

You can create sophisticated prompt hierarchies by nesting sections multiple levels deep:

```js
const mainProject = createSection({ title: "Project Analysis" });

// Create domain-specific subsections
const frontend = createSection({ title: "Frontend Review" });
const frontendReact = createSection({ title: "React Components" });
frontendReact.add("Check for proper state management");
frontendReact.add("Verify component lifecycle usage");

const frontendStyling = createSection({ title: "Styling" });
frontendStyling.add("Ensure responsive design");
frontendStyling.add("Check CSS naming conventions");

frontend.add(frontendReact);
frontend.add(frontendStyling);

const backend = createSection({ title: "Backend Review" });
const backendAPI = createSection({ title: "API Design" });
backendAPI.add("Verify RESTful principles");
backendAPI.add("Check error handling");

const backendDB = createSection({ title: "Database" });
backendDB.add("Review query performance");
backendDB.add("Check data integrity");

backend.add(backendAPI);
backend.add(backendDB);

// Assemble the complete structure
mainProject.add(frontend);
mainProject.add(backend);

// Format with nested structure preserved
const formatter = Formatter.create();
const result = formatter.format(mainProject);
```

## Using Parameters with Complex Data Types

Parameters can handle complex data structures, not just simple strings:

```js
const complexParameters = createParameters({
  user: {
    name: "Alice",
    role: "senior-developer",
    teams: ["frontend", "architecture"]
  },
  project: {
    name: "E-commerce Platform",
    tech_stack: ["React", "Node.js", "PostgreSQL"],
    deadline: "2024-03-15"
  },
  priorities: ["performance", "security", "maintainability"]
});

const reviewSection = createSection({ 
  title: "Code Review Context",
  parameters: complexParameters 
});

reviewSection.add("Reviewer: {{user.name}} ({{user.role}})");
reviewSection.add("Project: {{project.name}}");
reviewSection.add("Tech Stack: {{project.tech_stack}}");
reviewSection.add("Focus Areas: {{priorities}}");
reviewSection.add("Deadline: {{project.deadline}}");
```

## Conditional Content Based on Parameters

You can create dynamic sections that adapt based on parameter values:

```js
const createReviewSection = (parameters) => {
  const section = createSection({ 
    title: "Review Guidelines",
    parameters 
  });
  
  section.add("Review the provided {{codeType}} code");
  
  if (parameters.hasTests) {
    section.add("Pay special attention to test coverage");
    section.add("Verify test quality and effectiveness");
  }
  
  if (parameters.isProduction) {
    section.add("This code will be deployed to production");
    section.add("Extra scrutiny required for security and performance");
  }
  
  return section;
};

// Usage
const prodReview = createReviewSection({
  codeType: "React component",
  hasTests: true,
  isProduction: true
});
```

## Next Steps

You're now ready for the most advanced RiotPrompt features:

- **[Recipes System](recipes.md)** - Revolutionary prompt creation with templates
- **[Structured Outputs](structured-outputs.md)** - Define schemas for validated LLM responses
- **[Override System](override.md)** - Multi-layered prompt customization
- **[Builder Pattern](builder.md)** - Programmatic prompt construction
- **[Loader](loader.md)** - File-based prompt management 