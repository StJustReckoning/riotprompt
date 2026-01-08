# Complete RiotPrompt Tutorial

A comprehensive guide to mastering RiotPrompt, from basic concepts to advanced techniques.

## Table of Contents

1. [Understanding Prompt Structure](#understanding-prompt-structure)
2. [Building Effective Prompts](#building-effective-prompts)
3. [Working with Context](#working-with-context)
4. [Advanced Prompt Strategies](#advanced-prompt-strategies)
5. [Structured Outputs](#structured-outputs)
6. [Programmatic Usage](#programmatic-usage)
7. [Best Practices](#best-practices)
8. [Real-World Examples](#real-world-examples)

## Understanding Prompt Structure

RiotPrompt organizes prompts into logical sections, each serving a specific purpose in guiding the LLM.

### Core Sections

#### 1. Persona (System Prompt)

Defines who the AI is and how it should behave.

**Purpose:**
- Set the AI's role and expertise
- Establish tone and communication style
- Define boundaries and limitations

**Example:**

```markdown
<!-- persona.md -->
You are an expert software architect with 15 years of experience designing 
scalable systems. You have deep knowledge of microservices, cloud infrastructure, 
and distributed systems. You communicate clearly and provide practical, 
actionable advice.
```

**Tips:**
- Be specific about expertise areas
- Include relevant background
- Define the communication style you want

#### 2. Instructions

The main task or question you want the AI to address.

**Purpose:**
- Specify what the AI should do
- Provide step-by-step guidance
- Set expectations for the response

**Example:**

```markdown
<!-- instructions.md -->
Review the provided system architecture diagram and:

1. Identify potential bottlenecks
2. Suggest improvements for scalability
3. Highlight security concerns
4. Recommend monitoring strategies

Provide specific, actionable recommendations with reasoning.
```

**Tips:**
- Use numbered lists for multi-step tasks
- Be explicit about what you want
- Specify the format of the response

#### 3. Context

Background information, data, or reference materials.

**Purpose:**
- Provide domain-specific knowledge
- Include relevant data or documents
- Give historical information

**Example:**

```
context/
├── current-architecture.md    # System design document
├── performance-metrics.csv    # Current performance data
├── requirements.md            # Business requirements
└── team-constraints.md        # Technical constraints
```

**Tips:**
- Organize files logically
- Use descriptive filenames
- Include only relevant information

### Advanced Sections

RiotPrompt supports additional sections for sophisticated prompt engineering:

#### Constraints

Specific limitations or requirements for the response.

```markdown
<!-- constraints.md -->
- Keep response under 1000 words
- Use only standard library features
- Assume Python 3.9+
- Code must be production-ready
```

#### Tone

How the AI should communicate.

```markdown
<!-- tone.md -->
- Professional but approachable
- Clear and concise
- Avoid jargon unless necessary
- Use examples to clarify concepts
```

#### Examples (Few-Shot Learning)

Show the AI examples of desired input/output.

```markdown
<!-- examples.md -->
Example 1:
Input: "Optimize this loop: for i in range(len(arr)): print(arr[i])"
Output: "Use direct iteration: for item in arr: print(item)"
Reasoning: Direct iteration is more Pythonic and efficient.

Example 2:
Input: "Why is my code slow: data = []; for x in items: data.append(x)"
Output: "Use list comprehension: data = [x for x in items]"
Reasoning: List comprehensions are faster than repeated append() calls.
```

#### Reasoning

Ask the AI to show its thinking process.

```markdown
<!-- reasoning.md -->
Think through this problem step-by-step:
1. Analyze the current implementation
2. Identify the root cause
3. Consider alternative approaches
4. Evaluate trade-offs
5. Recommend the best solution

Show your reasoning at each step.
```

#### Response Format

Specify exactly how you want the output structured.

```markdown
<!-- responseFormat.md -->
Format your response as follows:

## Summary
[Brief 2-3 sentence overview]

## Issues Found
- Issue 1: [description]
- Issue 2: [description]

## Recommendations
1. [Recommendation with reasoning]
2. [Recommendation with reasoning]

## Priority
[High/Medium/Low] - [Justification]
```

## Building Effective Prompts

### The Anatomy of a Good Prompt

A well-structured prompt has:

1. **Clear Persona** - Establishes expertise and tone
2. **Specific Instructions** - Unambiguous task definition
3. **Relevant Context** - All necessary background information
4. **Appropriate Constraints** - Reasonable limitations
5. **Examples** (when needed) - Demonstrate desired output
6. **Format Specification** - How to structure the response

### Progressive Prompt Building

Start simple and add complexity as needed:

#### Level 1: Basic Prompt

```bash
npx riotprompt create simple-query \
  --persona "You are a helpful assistant" \
  --instructions "Explain quantum computing"
```

#### Level 2: Add Context

```bash
# Add background material
echo "Audience: High school students" > simple-query/context/audience.md
echo "Prior knowledge: Basic physics" > simple-query/context/background.md
```

#### Level 3: Add Structure

```bash
# Add constraints
echo "- Use analogies and examples
- Avoid mathematical equations
- Keep under 500 words" > simple-query/constraints.md
```

#### Level 4: Refine with Examples

```bash
# Show what good explanations look like
echo "Good explanation example:
Think of an atom like a miniature solar system..." > simple-query/examples.md
```

## Working with Context

Context files provide the AI with necessary background information.

### Organizing Context

**By Type:**

```
context/
├── data/
│   ├── sales-q1.csv
│   └── sales-q2.csv
├── docs/
│   ├── business-requirements.md
│   └── technical-specs.md
└── examples/
    ├── good-report.md
    └── bad-report.md
```

**By Topic:**

```
context/
├── current-system.md
├── pain-points.md
├── user-feedback.md
└── technical-constraints.md
```

### Loading Large Context

For providers with large context windows (Claude 200K, Gemini 2M tokens):

```bash
# Load entire directories
npx riotprompt execute analysis \
  --context ./research-papers/ \
  -m claude-3-5-sonnet-20241022
```

### Context Best Practices

1. **Relevance**: Only include what's necessary
2. **Organization**: Use clear directory structure
3. **Naming**: Use descriptive filenames
4. **Format**: Use markdown for text, appropriate formats for data
5. **Size**: Be mindful of token limits

## Advanced Prompt Strategies

### Chain of Thought Prompting

Ask the AI to think step-by-step:

```markdown
<!-- reasoning.md -->
Solve this problem using chain-of-thought reasoning:

1. Break down the problem into smaller parts
2. Solve each part sequentially
3. Show your work at each step
4. Combine the results
5. Verify the solution
```

### Few-Shot Learning

Provide examples to guide the AI:

```markdown
<!-- examples.md -->
Example 1: Bug Fix
Code: `if user = None:`
Issue: Assignment instead of comparison
Fix: `if user is None:`

Example 2: Bug Fix
Code: `for i in range(len(items)):`
Issue: Unpythonic iteration
Fix: `for item in items:`

Now analyze the provided code...
```

### Role-Playing

Create specific personas for specialized tasks:

```markdown
<!-- persona.md -->
You are three experts collaborating:

1. **Security Expert**: Identifies vulnerabilities
2. **Performance Engineer**: Optimizes for speed
3. **UX Designer**: Ensures usability

Each expert provides their perspective on the problem.
```

### Constraint-Based Prompting

Use constraints to guide responses:

```markdown
<!-- constraints.md -->
- Must be implementable in 1 sprint (2 weeks)
- Cannot require new infrastructure
- Must maintain backward compatibility
- Should reduce API calls by 30%
- Total budget: $5,000
```

## Structured Outputs

Get validated, type-safe JSON responses.

### Basic Structured Output

Create a prompt programmatically with a schema:

```typescript
import { cook } from 'riotprompt';
import { z } from 'zod';

const analysisSchema = z.object({
  score: z.number().min(0).max(10),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high', 'critical'])
});

const prompt = await cook({
  basePath: __dirname,
  persona: { path: 'analyst-persona.md' },
  instructions: [{ content: 'Analyze this code for issues' }],
  content: [{ content: sourceCode }],
  schema: analysisSchema
});
```

### Complex Nested Schemas

```typescript
const reportSchema = z.object({
  metadata: z.object({
    analyzedAt: z.string(),
    version: z.string(),
    confidence: z.number()
  }),
  findings: z.array(z.object({
    type: z.enum(['bug', 'security', 'performance', 'style']),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    location: z.object({
      file: z.string(),
      line: z.number(),
      column: z.number().optional()
    }),
    description: z.string(),
    recommendation: z.string(),
    estimatedEffort: z.string()
  })),
  summary: z.object({
    totalIssues: z.number(),
    criticalCount: z.number(),
    highCount: z.number(),
    estimatedTotalEffort: z.string(),
    overallRisk: z.enum(['low', 'medium', 'high'])
  })
});
```

[Learn more about Structured Outputs →](structured-outputs)

## Programmatic Usage

Use RiotPrompt in your applications.

### Basic Recipe

```typescript
import { cook, executeChat } from 'riotprompt';

const prompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a helpful assistant' },
  instructions: [
    { content: 'Answer the user question' }
  ],
  content: [
    { content: userQuestion, title: 'Question' }
  ]
});

const result = await executeChat(prompt, {
  model: 'gpt-4o',
  temperature: 0.7
});

console.log(result.content);
```

### Using Templates

```typescript
import { registerTemplates, cook } from 'riotprompt';

// Define reusable templates
registerTemplates({
  codeReview: {
    persona: { content: 'You are a senior code reviewer' },
    constraints: [
      { content: 'Focus on security and performance' }
    ]
  },
  documentation: {
    persona: { content: 'You are a technical writer' },
    tone: [
      { content: 'Clear and beginner-friendly' }
    ]
  }
});

// Use template
const prompt = await cook({
  basePath: __dirname,
  template: 'codeReview',
  content: [{ content: code }]
});
```

### Building Complex Workflows

```typescript
// Step 1: Generate code
const codePrompt = await cook({
  basePath: __dirname,
  template: 'codeGenerator',
  content: [{ content: requirements }]
});

const generatedCode = await executeChat(codePrompt, { model: 'gpt-4o' });

// Step 2: Review code
const reviewPrompt = await cook({
  basePath: __dirname,
  template: 'codeReview',
  content: [{ content: generatedCode.content }]
});

const review = await executeChat(reviewPrompt, { model: 'claude-3-5-sonnet-20241022' });

// Step 3: Document code
const docsPrompt = await cook({
  basePath: __dirname,
  template: 'documentation',
  content: [
    { content: generatedCode.content, title: 'Code' },
    { content: review.content, title: 'Review Notes' }
  ]
});

const documentation = await executeChat(docsPrompt, { model: 'gpt-4o' });
```

[Learn more about the Recipes System →](recipes)

## Best Practices

### 1. Start Simple, Iterate

Begin with a basic prompt and refine based on results:

```bash
# V1: Basic prompt
npx riotprompt execute simple-prompt -m gpt-4

# V2: Add constraints based on output
# V3: Add examples to guide behavior
# V4: Refine persona for better tone
```

### 2. Use Version Control

Track your prompts in Git:

```bash
git init
git add prompts/
git commit -m "Initial prompt structure"
```

### 3. Test with Different Models

Different models have different strengths:

```bash
# Try multiple models
npx riotprompt execute my-prompt -m gpt-4o
npx riotprompt execute my-prompt -m claude-3-5-sonnet-20241022
npx riotprompt execute my-prompt -m gemini-1.5-pro
```

### 4. Monitor Token Usage

Keep an eye on costs:

```typescript
const result = await executeChat(prompt, { model: 'gpt-4o' });

console.log(`Input tokens: ${result.usage.inputTokens}`);
console.log(`Output tokens: ${result.usage.outputTokens}`);
console.log(`Total cost: $${calculateCost(result.usage)}`);
```

### 5. Use Structured Outputs for Data

Always use schemas when you need structured data:

```typescript
// ✅ Good: Type-safe and validated
const schema = z.object({ /* ... */ });
const prompt = await cook({ schema, /* ... */ });

// ❌ Bad: Unreliable parsing
const prompt = await cook({
  instructions: [
    { content: 'Return your response as JSON' }
  ]
});
```

### 6. Provide Clear Examples

Show, don't just tell:

```markdown
Example of good output:
{
  "issue": "SQL Injection vulnerability",
  "severity": "critical",
  "line": 42,
  "fix": "Use parameterized queries"
}

Example of bad output:
{
  "issue": "there's a problem",
  "line": null
}
```

### 7. Set Appropriate Temperature

Match temperature to task:

- **0.0-0.3**: Factual, deterministic tasks (data extraction, classification)
- **0.4-0.7**: Balanced tasks (analysis, summarization)
- **0.8-1.0**: Creative tasks (writing, brainstorming)

## Real-World Examples

### Example 1: API Documentation Generator

```typescript
const docSchema = z.object({
  endpoint: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  description: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    description: z.string()
  })),
  responses: z.array(z.object({
    status: z.number(),
    description: z.string(),
    example: z.string()
  }))
});

const prompt = await cook({
  basePath: __dirname,
  persona: {
    content: 'You are a technical writer specializing in API documentation'
  },
  instructions: [
    { content: 'Generate comprehensive API documentation' }
  ],
  context: [
    { path: 'api-code.ts' }
  ],
  schema: docSchema
});
```

### Example 2: Code Security Audit

```bash
# Create audit prompt
npx riotprompt create security-audit \
  --persona "You are a security engineer with OWASP expertise" \
  --instructions "Audit this code for security vulnerabilities"

# Add security guidelines
cp owasp-top-10.md security-audit/context/
cp secure-coding-guide.md security-audit/context/

# Add code to audit
cp application.py security-audit/context/

# Execute
npx riotprompt execute security-audit -m gpt-4o
```

### Example 3: Data Analysis Pipeline

```typescript
// Analyze data
const analysisSchema = z.object({
  insights: z.array(z.string()),
  trends: z.array(z.string()),
  anomalies: z.array(z.string()),
  recommendations: z.array(z.string())
});

const analysis = await cook({
  basePath: __dirname,
  persona: { content: 'You are a data scientist' },
  content: [{ path: 'data.csv' }],
  schema: analysisSchema
});

const result = await executeChat(analysis, { model: 'claude-3-5-sonnet-20241022' });

// Generate report
const reportPrompt = await cook({
  basePath: __dirname,
  persona: { content: 'You are a business analyst' },
  instructions: [
    { content: 'Create an executive summary for stakeholders' }
  ],
  content: [
    { content: JSON.stringify(result.content), title: 'Analysis Results' }
  ]
});

const report = await executeChat(reportPrompt, { model: 'gpt-4o' });
```

## Next Steps

### Explore Advanced Features

- **[Structured Outputs](structured-outputs)** - Master schema-based responses
- **[Recipes System](recipes)** - Advanced programmatic creation
- **[Configuration](configuration-options)** - Optimize your setup
- **[Provider Guides](provider-openai)** - Provider-specific optimization

### Get Help

- **[API Reference](api-reference)** - Complete API documentation
- **[GitHub Issues](https://github.com/kjerneverk/riotprompt/issues)** - Report bugs or request features
- **[CLI Reference](cli-usage)** - Complete command-line documentation

### Join the Community

- Share your prompts and templates
- Learn from others' use cases
- Contribute to the project

---

Happy prompting! 🚀

