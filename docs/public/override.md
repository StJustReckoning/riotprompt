# riotprompt Override Utility

## Overview

The **Override** utility in riotprompt allows you to customize or replace parts of a prompt without altering the original prompt files. This is particularly useful in larger applications or frameworks (like Cortalyne) where you have default prompt templates but want to adjust certain sections for specific use cases, users, or environments. By using overrides, you can maintain a clean separation between **core prompt content** and **custom modifications**.

In essence, overrides let you **selectively replace or augment prompt sections**:

* You can completely **override** a section (replace it entirely with new content).
* You can **prepend** content (insert additional text before the original content).
* You can **append** content (insert additional text after the original content).

All of this is done without modifying the original prompt source file; instead, riotprompt will detect override files and merge or replace content accordingly when building the final prompt.

## Multi-Layered Override System

riotprompt supports **multi-layered overrides**, allowing you to define multiple levels of customization that build upon each other. This is particularly powerful when you need to support:

1. **Project-level customizations** (e.g., `./project/overrides`)
2. **User-level customizations** (e.g., `~/customization`)
3. **Environment-specific customizations** (e.g., `./config/prod`)

### Override Priority and Layering

When multiple override paths are provided, riotprompt processes them with a **closest-to-furthest** priority system:

- **Array order determines priority**: The first path in the `overridePaths` array has the highest priority (closest layer)
- **Complete overrides**: Only the **closest** override file replaces the original content
- **Prepend content**: Applied in **closest-first** order (closest layer appears first in the final content)
- **Append content**: Applied in **furthest-first** order (furthest layers appear first, closest layer appears last)

### Example Layering Scenario

Consider this configuration:

```ts
const builder = Builder.create({
  basePath: './prompts',
  overridePaths: ['./project', '~/customization'], // closest to furthest
  overrides: true
});
```

With these override files:

- `./project/personas/you-pre.md` (Level 1 - closest)
- `~/customization/personas/you-pre.md` (Level 2 - further)
- `./project/personas/you-post.md` (Level 1 - closest) 
- `~/customization/personas/you-post.md` (Level 2 - further)

**For prepend content (you-pre.md files):**
```
* Level 1 - Pre Content (from ./project)
* Level 2 - Pre Content (from ~/customization)  
* You Persona Content - Core
```

**For append content (you-post.md files):**
```
* You Persona Content - Core
* Level 2 - Post Content (from ~/customization)
* Level 1 - Post Content (from ./project)
```

**For complete overrides:**
If both `./project/personas/you.md` and `~/customization/personas/you.md` exist, only the closest override (`./project/personas/you.md`) will be used, completely replacing the original content.

## How Overrides Work

riotprompt's override system works by looking for specially-named files in an "override" directory that correspond to your prompt files. When you build a prompt (for example, using the Builder), you can specify an `overridePath` where your override files live and enable overrides.

For each prompt file loaded from the base path, riotprompt will check if there is a corresponding override file. The correspondence is determined by **filename and path**:

* If an override file with the *exact same name* exists in the override directory (mirroring the relative path of the original file), riotprompt will treat that as a **full override** for that prompt file.
* Additionally, riotprompt recognizes two suffix conventions for partial overrides:

  * A file ending in **`-pre.md`** is treated as content to **prepend** (placed before the base content).
  * A file ending in **`-post.md`** is treated as content to **append** (placed after the base content).

This naming scheme allows you to choose the override mode by how you name the file, without needing additional configuration in code for each file.

**Example:**

Suppose you have a base prompt file `prompts/instructions/email.md` that defines instructions for drafting an email. To modify this via overrides:

* Place a file at `overrides/instructions/email.md` – this will completely replace the content of `email.md` when overrides are applied.
* Place a file at `overrides/instructions/email-pre.md` – this will be inserted *before* the content of the base `email.md`.
* Place a file at `overrides/instructions/email-post.md` – this will be inserted *after* the content of the base `email.md`.

You can use none, one, or all of these in combination as needed. For instance, you might only have a `email-post.md` to add a few extra instructions at the end of the default email instructions, leaving the original content intact.

For more details, see the complete [Override Documentation](override.md). 