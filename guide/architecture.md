# Architecture

**Purpose**: High-level overview of the internal design of `riotprompt`.

## Core Concepts

### Prompt Structure
A `Prompt` in RiotPrompt is not a string; it is a structured object containing four main components:

1.  **Persona**: Defines *who* the AI is (System Prompt).
2.  **Instructions**: Defines *what* the AI should do (User Prompt / Task).
3.  **Context**: Background information, data, or documents needed to perform the task.
4.  **Content**: Specific input data to be processed in this execution (optional, often merged with Context in simpler use cases).

### Section System
The fundamental building block is the `Section<T>`.
*   A `Section` contains a list of items (of type `T`) and can also contain nested `Sections`.
*   This allows for recursive, hierarchical structures (e.g., a Context section containing a "Market Data" section, which contains a "Q1 Results" section).
*   **Weighted Items**: Most items extend `Weighted`, allowing them to have associated weights or parameters for advanced optimization (though simple usage ignores this).

## Module Structure

The project is organized into distinct logical modules:

*   **`src/riotprompt.ts`**: The main entry point. Exports all sub-modules.
*   **`src/prompt.ts`**: Defines the `Prompt` interface and factory.
*   **`src/items/`**: Contains definitions for `Section`, `Instruction`, `Context`, `Content`.
*   **`src/loader.ts`**: Logic for loading prompt parts from the filesystem. It handles traversing directories and parsing Markdown files (extracting headers as section titles).
*   **`src/formatter.ts`**: Responsible for taking a `Prompt` object and converting it into a specific format (e.g., a Chat Request object or a flat string). It handles model-specific nuances via adapters.
*   **`src/serializer.ts`**: Handles converting the internal `Prompt` structure to portable formats like JSON and XML.
*   **`src/cli.ts`**: The command-line interface implementation, using `commander` and `cardigantime` for config.

## Data Flow (CLI)

1.  **Input**: User provides a directory path.
2.  **Loader**: `loader.ts` scans the directory.
    *   `persona.md` or `persona/` -> `Section<Instruction>` (Persona)
    *   `instructions.md` or `instructions/` -> `Section<Instruction>` (Instructions)
    *   `context/` -> `Section<Context>` (Context)
3.  **Assembly**: Parts are combined into a `Prompt` object.
4.  **Processing**:
    *   If **Serialization** is requested: `Serializer` converts `Prompt` to JSON/XML.
    *   If **Formatting** is requested: `Formatter` applies model-specific rules (e.g., role assignment) to generate a Chat Request.
5.  **Output**: Result is written to stdout or file.

## Design Decisions

*   **Composition over Concatenation**: By keeping prompt parts separate until the final moment, we allow for dynamic injection, reordering, and model-specific formatting without string manipulation hell.
*   **FileSystem as Source**: We treat the filesystem as a primary way to organize complex prompts. Folders represent Sections, files represent Items. This makes prompts version-controllable and easy to navigate.
*   **Type Safety**: Extensive use of TypeScript generic types (`Section<T>`) ensures that we don't accidentally mix up Context (data) with Instructions (logic).

