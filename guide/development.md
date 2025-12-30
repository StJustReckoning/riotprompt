# Development Guide

**Purpose**: Instructions for contributing to and developing `riotprompt`.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Build**:
    ```bash
    npm run build
    ```
    This builds both the library (`dist/riotprompt.js`) and the CLI (`dist/cli.cjs`).

## Testing

We use **Vitest** for testing.

*   **Run Tests**:
    ```bash
    npm test
    ```
*   **Run with Coverage**:
    ```bash
    npm run test:coverage
    ```

### Test Structure

*   `tests/unit/`: Tests for individual modules (Serializer, Writer, etc.).
*   `tests/execution/`: Tests for LLM providers (mocked).
*   `tests/integration/`: End-to-end tests for the CLI.

### Mocking

Tests that involve LLM APIs or filesystem operations MUST use mocks (`vi.mock`).
*   **Filesystem**: Use `fs/promises` mocks or temporary directories (via `fs.mkdtemp`).
*   **APIs**: Mock the SDKs (`openai`, `@anthropic-ai/sdk`) to avoid making real network calls and incurring costs.

## Project Structure

*   `src/`: Source code.
    *   `items/`: Core data structures (Section, Instruction, etc.).
    *   `execution/`: LLM provider implementations.
    *   `util/`: Helpers (filesystem, text processing).
*   `tests/`: Unit and integration tests.
*   `input/`: Sample prompts for manual testing.

## Adding Features

1.  **Serialization**: If adding a new format, update `src/serializer.ts` and add the option to `src/cli.ts`.
2.  **New Item Types**: If adding a new prompt component (e.g., `Example`), create a new file in `src/items/` and update `Prompt` interface in `src/prompt.ts`.
3.  **CLI Commands**: Update `src/cli.ts` using `commander` syntax.
4.  **New Providers**: Implement the `Provider` interface in `src/execution/` and register it in `ExecutionManager`.

## Linting

*   **Check**: `npm run lint`
*   **Fix**: `npm run lint:fix`
