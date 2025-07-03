/**
 * DEMONSTRATION: Old Builder vs New Recipes Approach
 * 
 * This demo shows how the new Recipes system dramatically reduces
 * the boilerplate and complexity of creating prompts with RiotPrompt.
 */

import { Builder, quick, recipe, commit, cook } from './src/riotprompt';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// 🤮 OLD BUILDER APPROACH (25+ lines of boilerplate)
// =============================================================================

export const createCommitPromptOldWay = async (
    diffContent: string,
    userDirection?: string,
    context?: string,
    directories?: string[]
): Promise<any> => {
    // Look at all this verbose, repetitive code! 😩
    let builder: Builder.Instance = Builder.create({
        basePath: __dirname,
        overridePaths: ['./'],
        overrides: false,
    });

    // So many separate async calls to chain together...
    builder = await builder.addPersonaPath('persona/developer.md');
    builder = await builder.addInstructionPath('instructions/commit.md');

    // Manual content management with weights
    if (userDirection) {
        builder = await builder.addContent(userDirection, {
            title: 'User Direction',
            weight: 1.0
        });
    }

    builder = await builder.addContent(diffContent, {
        title: 'Diff',
        weight: 0.5
    });

    // More manual work for context
    if (directories?.length) {
        builder = await builder.loadContext(directories, { weight: 0.5 });
    }

    if (context) {
        builder = await builder.addContext(context, {
            title: 'User Context',
            weight: 1.0
        });
    }

    // Finally build after all that work
    return await builder.build();
};

// =============================================================================
// 🚀 NEW RECIPES APPROACH (3-5 lines total!)
// =============================================================================

// Approach 1: Quick Builder (1 line!)
export const createCommitPromptQuick = (
    diffContent: string,
    options: { userDirection?: string; context?: string; directories?: string[] }
) => quick.commit(diffContent, { basePath: __dirname, ...options });

// Approach 2: Template-based (2 lines!)
export const createCommitPromptTemplate = (
    diffContent: string,
    userDirection?: string
) => commit({
    basePath: __dirname,
    content: [
        ...(userDirection ? [{ content: userDirection, title: 'User Direction', weight: 1.0 }] : []),
        { content: diffContent, title: 'Diff', weight: 0.5 },
    ],
});

// Approach 3: Fluent Recipe Builder (3 lines!)
export const createCommitPromptFluent = (
    diffContent: string,
    userDirection?: string
) => recipe(__dirname)
    .template('commit')
    .with({
        content: [
            ...(userDirection ? [{ content: userDirection, title: 'User Direction', weight: 1.0 }] : []),
            { content: diffContent, title: 'Diff', weight: 0.5 }
        ],
    });

// Approach 4: Configuration-driven (Single object!)
export const createCommitPromptConfig = (
    diffContent: string,
    userDirection?: string,
    contextDir?: string[]
) => cook({
    basePath: __dirname,
    template: 'commit',
    content: [
        ...(userDirection ? [{ content: userDirection, title: 'User Direction', weight: 1.0 }] : []),
        { content: diffContent, title: 'Diff', weight: 0.5 },
    ],
    context: contextDir ? [{ directories: contextDir, weight: 0.5 }] : [],
});

// =============================================================================
// 🎯 ADVANCED RECIPES PATTERNS
// =============================================================================

// Mix and match different content types effortlessly
export const createAdvancedPrompt = () => cook({
    basePath: __dirname,
    persona: { path: 'persona/expert.md' },
    instructions: [
        { path: 'instructions/analyze.md' },
        { content: 'Focus on security implications', title: 'Security Focus' },
    ],
    content: [
        { path: 'examples/good-code.ts', weight: 0.8 },
        { content: 'Here is the code to review...', title: 'Target Code', weight: 1.0 },
    ],
    context: [
        { directories: ['docs/', 'specs/'], weight: 0.3 },
        { content: 'This is a critical production system', title: 'Context', weight: 0.7 },
    ],
});

// Custom templates can be created and reused
export const createCustomTemplate = () => cook({
    basePath: __dirname,
    template: 'custom',
    persona: { content: 'You are a helpful AI assistant specializing in code review.' },
    instructions: [
        'Analyze the provided code for potential issues',
        'Suggest improvements where applicable',
        'Explain your reasoning clearly',
    ],
    content: [
        { path: 'code-to-review.ts', title: 'Source Code', weight: 1.0 },
    ],
});

// =============================================================================
// 📊 COMPARISON SUMMARY
// =============================================================================

/*
OLD BUILDER APPROACH:
❌ 25+ lines of boilerplate code
❌ 8+ separate async method calls
❌ Manual chaining required
❌ Repetitive patterns across projects
❌ Error-prone due to complexity
❌ Hard to read and maintain

NEW RECIPES APPROACH:
✅ 1-5 lines of code
✅ Single function call
✅ Declarative configuration
✅ Reusable templates
✅ Type-safe and intuitive
✅ Easy to read and maintain
✅ Smart defaults reduce configuration
✅ Multiple APIs for different preferences

REDUCTION: 80-95% less code! 🎉
*/

// Example usage comparison:
export const exampleUsage = async () => {
    const diffContent = "diff --git a/src/app.ts...";
    const userDirection = "Focus on performance optimizations";

    // Old way: 25+ lines of builder code (see above)

    // New way: Choose your style!
    const prompt1 = await quick.commit(diffContent, {
        basePath: __dirname,
        userDirection
    });

    const prompt2 = await commit({
        basePath: __dirname,
        content: [
            { content: userDirection, title: 'User Direction', weight: 1.0 },
            { content: diffContent, title: 'Diff', weight: 0.5 },
        ],
    });

    return { prompt1, prompt2 };
}; 