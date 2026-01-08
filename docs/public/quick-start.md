# Quick Start Guide

Get started with RiotPrompt in under 5 minutes. This guide walks you through creating, processing, and executing your first prompt.

## Prerequisites

- **Node.js** installed (v18 or higher recommended)
- **npm** (comes with Node.js)

Don't have Node.js? [Download it here](https://nodejs.org/)

## 4-Step Workflow

### Step 1: Create a New Prompt

```bash
npx riotprompt create my-analysis-prompt
```

This command scaffolds a structured prompt directory with everything you need.

**What gets created:**

```
my-analysis-prompt/
├── persona.md          # Defines the AI's role and characteristics
├── instructions.md     # Main task instructions for the AI
└── context/            # Directory for supporting files
    └── README.md       # Placeholder explaining context usage
```

**File contents:**

- **`persona.md`**: Contains `"You are a helpful AI assistant."` by default
- **`instructions.md`**: Contains `"Please analyze the following request."` by default
- **`context/`**: Empty directory where you can add reference files, data, or examples

### Step 2: Edit the Generated Files

Open and customize the prompt files for your specific use case:

**Edit `persona.md`:**

```bash
# Using your favorite editor
code my-analysis-prompt/persona.md

# Or
nano my-analysis-prompt/persona.md
```

Example persona:

```markdown
You are an expert data analyst with 10 years of experience in business intelligence.
You excel at finding patterns in data and communicating insights clearly.
```

**Edit `instructions.md`:**

```bash
code my-analysis-prompt/instructions.md
```

Example instructions:

```markdown
Analyze the sales data and provide:
1. Key trends over the time period
2. Top performing products
3. Actionable recommendations for improvement
```

**Add context (optional):**

```bash
# Add data files, examples, or reference materials
cp sales-data.csv my-analysis-prompt/context/
cp previous-analysis.md my-analysis-prompt/context/
```

### Step 3: Process to See Formatted Output

```bash
npx riotprompt process my-analysis-prompt -m gpt-4
```

This command shows you exactly how your prompt will be formatted for the LLM, without actually calling the API.

**Example output:**

```
Processing prompt from: my-analysis-prompt
Using model: gpt-4

<Persona>
You are an expert data analyst with 10 years of experience in business intelligence.
You excel at finding patterns in data and communicating insights clearly.
</Persona>

<Instructions>
Analyze the sales data and provide:
1. Key trends over the time period
2. Top performing products
3. Actionable recommendations for improvement
</Instructions>

<Context title="sales-data.csv">
[Your CSV data content]
</Context>
```

**Why process first?**
- Verify your prompt looks correct before spending API credits
- Check that all files are being loaded properly
- Ensure the format matches your expectations

### Step 4: Execute Against an LLM

```bash
npx riotprompt execute my-analysis-prompt -m gpt-4
```

This command sends your prompt to the specified LLM and returns the response.

**Requirements:**
- Set your API key as an environment variable (see below)
- Or pass it with `-k` flag: `npx riotprompt execute my-analysis-prompt -m gpt-4 -k sk-your-key`

**Example output:**

```
Executing prompt from: my-analysis-prompt
Using model: gpt-4

--- Response ---

Based on the sales data analysis:

Key Trends:
- Sales increased 23% quarter-over-quarter
- Mobile purchases grew by 45%
- Weekend sales outperformed weekdays by 18%

Top Performing Products:
1. Product A: $125,000 (32% of total revenue)
2. Product B: $98,000 (25% of total revenue)
3. Product C: $76,000 (19% of total revenue)

Recommendations:
1. Invest more in mobile optimization
2. Consider weekend-specific promotions
3. Expand inventory for top-performing products

--- Usage ---
Input Tokens: 450
Output Tokens: 320
```

## Setting Up API Keys

Before executing prompts, set up your API key for the provider you're using:

### Option 1: Environment Variables (Recommended)

```bash
# OpenAI
export OPENAI_API_KEY=sk-proj-...

# Anthropic (Claude)
export ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
export GEMINI_API_KEY=AIza...
```

Add these to your `~/.bashrc`, `~/.zshrc`, or equivalent to make them permanent.

### Option 2: .env File

Create a `.env` file in your project directory:

```bash
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

RiotPrompt automatically loads environment variables from `.env` files.

### Option 3: Command-Line Flag

Pass the API key directly (useful for testing):

```bash
npx riotprompt execute my-analysis-prompt -m gpt-4 -k sk-proj-your-key
```

## Customizing Your Prompt

### Add More Structure

You can create additional files for more sophisticated prompts:

```bash
my-analysis-prompt/
├── persona.md
├── instructions.md
├── constraints.md      # Add constraints (keep response under 500 words, etc.)
├── examples.md         # Add few-shot examples
└── context/
    ├── data.csv
    └── guidelines.md
```

### Use Different Models

```bash
# OpenAI GPT-4
npx riotprompt execute my-analysis-prompt -m gpt-4o

# Anthropic Claude
npx riotprompt execute my-analysis-prompt -m claude-3-5-sonnet-20241022

# Google Gemini
npx riotprompt execute my-analysis-prompt -m gemini-1.5-pro
```

### Control Response Parameters

```bash
# Adjust temperature (0 = deterministic, 1 = creative)
npx riotprompt execute my-analysis-prompt -m gpt-4 -t 0.2

# Limit response length
npx riotprompt execute my-analysis-prompt -m gpt-4 --max-tokens 500

# Combine parameters
npx riotprompt execute my-analysis-prompt -m gpt-4 -t 0.7 --max-tokens 1000
```

## Export to Different Formats

### JSON Export

```bash
npx riotprompt process my-analysis-prompt --format json --output prompt.json
```

Use this for:
- API integrations
- Programmatic prompt manipulation
- Version control of prompts

### XML Export

```bash
npx riotprompt process my-analysis-prompt --format xml --output prompt.xml
```

Use this for:
- Human-readable prompt archives
- Integration with XML-based systems

## Next Steps

Now that you've created your first prompt, explore these resources to take your prompt engineering further:

### Command Reference
- **[create command](cli-create)** - Advanced creation options
- **[process command](cli-process)** - All processing and export options
- **[execute command](cli-execute)** - Execution parameters and error handling

### Learn More
- **[Complete Tutorial](tutorial)** - Comprehensive guide to RiotPrompt
- **[Structured Outputs](structured-outputs)** - Get JSON responses with validation
- **[Configuration Options](configuration-options)** - Set up defaults
- **[Recipes System](recipes)** - Programmatic prompt creation

### Provider-Specific Guides
- **[OpenAI Provider](provider-openai)** - GPT-4 and o-series best practices
- **[Anthropic Provider](provider-anthropic)** - Claude-specific tips
- **[Gemini Provider](provider-gemini)** - Gemini features and optimization

## Common Use Cases

### Code Review

```bash
npx riotprompt create code-review \
  --persona "You are a senior software engineer" \
  --instructions "Review the code for bugs, security issues, and best practices"

# Add your code to context
cp my-code.js code-review/context/

# Execute
npx riotprompt execute code-review -m gpt-4o
```

### Document Summarization

```bash
npx riotprompt create summarizer \
  --persona "You are a professional summarizer" \
  --instructions "Create a concise summary in 3-5 bullet points"

# Add document
cp long-document.txt summarizer/context/

# Execute
npx riotprompt execute summarizer -m claude-3-5-sonnet-20241022
```

### Data Analysis

```bash
npx riotprompt create data-analyst \
  --persona "You are a data scientist" \
  --instructions "Analyze the data and provide insights"

# Add data
cp data.csv data-analyst/context/

# Execute
npx riotprompt execute data-analyst -m gemini-1.5-pro
```

## Troubleshooting

### "API key is required" Error

**Solution:** Set your API key as an environment variable or pass it with `-k` flag.

```bash
export OPENAI_API_KEY=sk-proj-...
# or
npx riotprompt execute my-prompt -k sk-proj-...
```

### "instructions.md not found" Error

**Solution:** Make sure you've created the prompt directory with the `create` command, or manually create an `instructions.md` file.

### Response is Too Short/Long

**Solution:** Adjust the `max-tokens` parameter:

```bash
# Longer responses
npx riotprompt execute my-prompt --max-tokens 2000

# Shorter responses  
npx riotprompt execute my-prompt --max-tokens 200
```

### Response is Too Random or Too Repetitive

**Solution:** Adjust the temperature:

```bash
# More consistent (lower temperature)
npx riotprompt execute my-prompt -t 0.2

# More creative (higher temperature)
npx riotprompt execute my-prompt -t 0.8
```

## Getting Help

- **[CLI Usage](cli-usage)** - Complete CLI reference
- **[Complete Tutorial](tutorial)** - In-depth guide
- **[GitHub Issues](https://github.com/kjerneverk/riotprompt/issues)** - Report bugs or request features
- **[API Documentation](api-reference)** - Programmatic usage

---

Ready to dive deeper? Check out the **[Complete Tutorial](tutorial)** for advanced techniques and best practices.

