# Architecture

**Purpose**: High-level overview of the internal design of `riotprompt`.

## Core Concepts

### Prompt Structure
A `Prompt` in RiotPrompt is not a string; it is a structured object containing multiple components that map to different aspects of prompt engineering:

1.  **Persona**: Defines *who* the AI is (System Prompt).
2.  **Instructions**: Defines *what* the AI should do (User Prompt / Task).
3.  **Context**: Background information, data, or documents needed to perform the task.
4.  **Content**: Specific input data to be processed in this execution.
5.  **Constraints**: Operational boundaries (e.g., word count, format restrictions).
6.  **Tone**: Style guidelines (e.g., professional, humorous).
7.  **Examples**: Few-shot examples to demonstrate desired behavior.
8.  **Reasoning**: Instructions on the thinking process (e.g., Chain of Thought).
9.  **ResponseFormat**: Instructions on the output structure.
10. **Recap**: Final reminders or summaries.
11. **Safeguards**: Safety guidelines.

### Section System
The fundamental building block is the `Section<T>`.
*   A `Section` contains a list of items (of type `T`) and can also contain nested `Sections`.
*   This allows for recursive, hierarchical structures.
*   **Weighted Items**: Most items extend `Weighted`, allowing them to have associated weights or parameters for advanced optimization.

## Module Structure

The project is organized into distinct logical modules:

*   **`src/riotprompt.ts`**: The main entry point. Exports all sub-modules.
*   **`src/recipes.ts`**: The **Recipes API** implementation (`cook` function). This is the high-level configuration layer that orchestrates the creation of prompts.
*   **`src/prompt.ts`**: Defines the `Prompt` interface and factory.
*   **`src/items/`**: Contains definitions for `Section` and various item types.
*   **`src/loader.ts`**: Logic for loading prompt parts from the filesystem.
*   **`src/formatter.ts`**: Responsible for taking a `Prompt` object and converting it into a specific format (e.g., a Chat Request object or a flat string). It handles model-specific rules via adapters.
*   **`src/execution/`**: Contains provider implementations (OpenAI, Anthropic, Gemini) that handle API calls and structured output adaptation.
*   **`src/serializer.ts`**: Handles converting the internal `Prompt` structure to portable formats like JSON and XML.
*   **`src/cli.ts`**: The command-line interface implementation.

## Data Flow (Recipes API)

1.  **Config**: User provides a `RecipeConfig` object (and optionally a template name).
2.  **Cook**: The `cook` function processes the config:
    *   Loads templates if specified.
    *   Merges overrides.
    *   Resolves file paths using `Loader`.
    *   Creates `Section` objects for each component (`persona`, `instructions`, etc.).
    *   Processes `zod` schemas for structured output.
3.  **Assembly**: Parts are combined into a `Prompt` object.
4.  **Execution**:
    *   `executeChat` takes the `Prompt`.
    *   `Formatter` converts it to the provider-specific format (handling roles, schema adaptation).
    *   Provider client sends request and returns result.

## Design Decisions

*   **Configuration over Code**: The Recipes API favors declarative configuration over imperative builder patterns, making prompts easier to read and maintain.
*   **Composition**: By keeping prompt parts separate until the final moment, we allow for dynamic injection, reordering, and model-specific formatting.
*   **FileSystem as Source**: We treat the filesystem as a primary way to organize complex prompts. Folders represent Sections, files represent Items.
*   **Portable Schemas**: We use `zod` as a universal schema definition language, adapting it to provider-specific formats (JSON Schema, Tools) at runtime to prevent vendor lock-in.
