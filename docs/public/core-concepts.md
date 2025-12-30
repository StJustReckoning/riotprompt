# Core Concepts

RiotPrompt is built around several key concepts that make prompt engineering structured and maintainable.

## WeightedText

The base type for all prompt elements. Each element has:
- **`text`**: The actual content
- **`weight`**: Optional weight value (for potential future ranking/prioritization)

WeightedText forms the foundation for all content types in RiotPrompt, allowing you to assign importance levels to different parts of your prompts.

## Prompt Structure Elements

RiotPrompt organizes prompts into four main categories:

### 1. Personas
Define who the LLM should be:
- **`name`**: The persona's identifier
- **`traits`**: Characteristics the persona should embody (e.g., "You are a developer working on a project who needs to create a commit message")
- **`instructions`**: Specific guidance for the persona

### 2. Instructions
Tell the LLM how to respond:
- General guidelines for response format, tone, etc.
- Specific task-oriented instructions
- Behavioral guidelines

### 3. Content
What the LLM should respond to:
- The actual query or task
- Input data or context
- Questions to be answered

### 4. Context
Provide background information:
- Additional context that helps the LLM understand the request
- Domain-specific knowledge
- Historical information or examples

## Sections

Groups related items together with powerful organization capabilities:
- **`title`**: Section name for clear organization
- **`items`**: Collection of related elements
- **`weight`**: Optional section-level priority
- **`parameters`**: Shared variables for dynamic content

### Section Hierarchy

Sections can contain other sections, allowing you to create nested structures:

```js
import { createSection, Section, Instruction } from '@riotprompt/riotprompt';

// Main section
const codeReview: Section<Instruction> = createSection({ title: "Code Review Guidelines" });

// Nested subsections
const securitySection = createSection({ title: "Security Checks" });
securitySection.add("Look for SQL injection vulnerabilities");
securitySection.add("Verify input validation");

const performanceSection = createSection({ title: "Performance Considerations" });
performanceSection.add("Check for N+1 query problems");
performanceSection.add("Review algorithm complexity");

// Add subsections to main section
codeReview.add(securitySection);
codeReview.add(performanceSection);
```

## Content Types

RiotPrompt supports several specialized content types:

- **`Instruction`**: Task guidance and behavioral rules
- **`ContentText`**: Primary content or queries
- **`Context`**: Background information and domain knowledge
- **`Trait`**: Persona characteristics
- **`Parameters`**: Dynamic placeholders for customization

## Formatting System

RiotPrompt's flexible formatting system supports multiple output styles:

### Tag-based Format
```xml
<Instructions>
Answer in a concise manner

Provide code examples when appropriate
</Instructions>
```

### Markdown Format
```markdown
# Instructions

Answer in a concise manner

Provide code examples when appropriate
```

This dual formatting capability ensures your prompts work across different LLM platforms and interfaces.

## Next Steps

With these core concepts in mind, you're ready to explore:
- **[Basic Usage](basic-usage.md)** - Start creating your first sections
- **[Advanced Usage](advanced-usage.md)** - Leverage parameters and weights
- **[Builder Pattern](builder.md)** - Programmatic prompt construction 