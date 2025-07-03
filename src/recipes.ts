import path from "path";
import { z } from "zod";
import { ParametersSchema } from "./items/parameters";
import { SectionOptions } from "./items/section";
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import { Content, Context, createPrompt, createSection, Instruction, Loader, Override, Parser, Prompt, Section, Weighted } from "./riotprompt";

// ===== CONFIGURATION SCHEMAS =====

const ContentItemSchema = z.union([
    z.string(), // Simple string content
    z.object({
        content: z.string(),
        title: z.string().optional(),
        weight: z.number().optional(),
    }),
    z.object({
        path: z.string(),
        title: z.string().optional(),
        weight: z.number().optional(),
    }),
    z.object({
        directories: z.array(z.string()),
        title: z.string().optional(),
        weight: z.number().optional(),
    })
]);

const RecipeConfigSchema = z.object({
    // Core settings
    basePath: z.string(),
    logger: z.any().optional().default(DEFAULT_LOGGER),
    overridePaths: z.array(z.string()).optional().default(["./"]),
    overrides: z.boolean().optional().default(false),
    parameters: ParametersSchema.optional().default({}),

    // Content sections - smart inference based on naming
    persona: ContentItemSchema.optional(),
    instructions: z.array(ContentItemSchema).optional().default([]),
    content: z.array(ContentItemSchema).optional().default([]),
    context: z.array(ContentItemSchema).optional().default([]),

    // Templates and inheritance
    extends: z.string().optional(), // Extend another recipe
    template: z.enum(['commit', 'release', 'documentation', 'review', 'custom']).optional(),
});

type RecipeConfig = z.infer<typeof RecipeConfigSchema>;
type ContentItem = z.infer<typeof ContentItemSchema>;

// ===== CONFIGURABLE TEMPLATE PATHS =====

// Default template configurations - can be overridden by user
export interface TemplateConfig {
    persona?: ContentItem;
    instructions?: ContentItem[];
    content?: ContentItem[];
    context?: ContentItem[];
}

// Built-in template configurations matching common patterns
const DEFAULT_TEMPLATES: Record<string, TemplateConfig> = {
    commit: {
        persona: { path: "personas/developer.md", title: "Developer Persona" },
        instructions: [
            { path: "instructions/commit.md", title: "Commit Instructions" },
        ],
    },
    release: {
        persona: { path: "personas/releaser.md", title: "Release Manager Persona" },
        instructions: [
            { path: "instructions/release.md", title: "Release Instructions" },
        ],
    },
    documentation: {
        persona: { path: "personas/technical-writer.md", title: "Technical Writer Persona" },
        instructions: [
            { path: "instructions/documentation.md", title: "Documentation Instructions" },
        ],
    },
    review: {
        persona: { path: "personas/reviewer.md", title: "Code Reviewer Persona" },
        instructions: [
            { path: "instructions/review.md", title: "Review Instructions" },
        ],
    },
};

// User-customizable template registry
let TEMPLATES = { ...DEFAULT_TEMPLATES };

/**
 * Configure custom template paths (perfect for KodrDriv constants!)
 * 
 * @example
 * ```typescript
 * // Configure using your KodrDriv constants
 * configureTemplates({
 *   commit: {
 *     persona: { path: DEFAULT_PERSONA_YOU_FILE },
 *     instructions: [{ path: DEFAULT_INSTRUCTIONS_COMMIT_FILE }]
 *   },
 *   release: {
 *     persona: { path: DEFAULT_PERSONA_RELEASER_FILE },
 *     instructions: [{ path: DEFAULT_INSTRUCTIONS_RELEASE_FILE }]
 *   }
 * });
 * ```
 */
export const configureTemplates = (customTemplates: Record<string, TemplateConfig>): void => {
    TEMPLATES = { ...DEFAULT_TEMPLATES, ...customTemplates };
};

/**
 * Get current template configuration
 */
export const getTemplates = (): Record<string, TemplateConfig> => ({ ...TEMPLATES });

// ===== CORE RECIPE ENGINE =====

export const cook = async (config: Partial<RecipeConfig> & { basePath: string }): Promise<Prompt> => {
    // Parse and validate configuration with defaults
    const validatedConfig = RecipeConfigSchema.parse({
        overridePaths: ["./"
        ],
        overrides: false,
        parameters: {},
        instructions: [],
        content: [],
        context: [],
        ...config
    });

    // Handle template inheritance
    let finalConfig = { ...validatedConfig };
    if (validatedConfig.template) {
        const template = TEMPLATES[validatedConfig.template];
        if (template) {
            finalConfig = { ...template, ...validatedConfig };
        }
    }

    // Setup internal services
    const logger = wrapLogger(finalConfig.logger, 'Recipe');
    const parser = Parser.create({ logger });
    const override = Override.create({
        logger,
        configDirs: finalConfig.overridePaths || ["./"],
        overrides: finalConfig.overrides || false
    });
    const loader = Loader.create({ logger });

    // Create sections
    const personaSection: Section<Instruction> = createSection({ title: "Persona" });
    const instructionSection: Section<Instruction> = createSection({ title: "Instruction" });
    const contentSection: Section<Content> = createSection({ title: "Content" });
    const contextSection: Section<Context> = createSection({ title: "Context" });

    // Process persona
    if (finalConfig.persona) {
        await processContentItem(finalConfig.persona, personaSection, 'persona', {
            basePath: finalConfig.basePath,
            parser,
            override,
            loader,
            parameters: finalConfig.parameters,
            logger
        });
    }

    // Process instructions
    for (const item of finalConfig.instructions || []) {
        await processContentItem(item, instructionSection, 'instruction', {
            basePath: finalConfig.basePath,
            parser,
            override,
            loader,
            parameters: finalConfig.parameters,
            logger
        });
    }

    // Process content
    for (const item of finalConfig.content || []) {
        await processContentItem(item, contentSection, 'content', {
            basePath: finalConfig.basePath,
            parser,
            override,
            loader,
            parameters: finalConfig.parameters,
            logger
        });
    }

    // Process context
    for (const item of finalConfig.context || []) {
        await processContentItem(item, contextSection, 'context', {
            basePath: finalConfig.basePath,
            parser,
            override,
            loader,
            parameters: finalConfig.parameters,
            logger
        });
    }

    // Build and return prompt
    return createPrompt({
        persona: personaSection,
        instructions: instructionSection,
        contents: contentSection,
        contexts: contextSection
    });
};

// ===== CONTENT PROCESSING =====

interface ProcessingContext {
    basePath: string;
    parser: any;
    override: any;
    loader: any;
    parameters: any;
    logger: any;
}

const processContentItem = async <T extends Weighted>(
    item: ContentItem,
    section: Section<T>,
    type: 'persona' | 'instruction' | 'content' | 'context',
    ctx: ProcessingContext
): Promise<void> => {
    const sectionOptions: SectionOptions = {
        parameters: ctx.parameters,
    };

    if (typeof item === 'string') {
        // Simple string content
        const parsedSection = ctx.parser.parse(item, sectionOptions);
        section.add(parsedSection);
    } else if ('content' in item) {
        // Inline content with options
        const parsedSection = ctx.parser.parse(item.content, {
            ...sectionOptions,
            title: item.title,
            weight: item.weight,
        });
        section.add(parsedSection);
    } else if ('path' in item) {
        // File path
        const fullPath = path.join(ctx.basePath, item.path);
        const parsedSection = await ctx.parser.parseFile(fullPath, {
            ...sectionOptions,
            title: item.title,
            weight: item.weight,
        });
        const overrideSection = await ctx.override.customize(item.path, parsedSection, sectionOptions);
        section.add(overrideSection);
    } else if ('directories' in item) {
        // Directory loading
        const sections = await ctx.loader.load(item.directories, {
            ...sectionOptions,
            title: item.title,
            weight: item.weight,
        });
        section.add(sections);
    }
};

// ===== CONVENIENCE FUNCTIONS =====

export const commit = (config: Partial<RecipeConfig> & { basePath: string }): Promise<Prompt> =>
    cook({ ...config, template: 'commit' });

export const release = (config: Partial<RecipeConfig> & { basePath: string }): Promise<Prompt> =>
    cook({ ...config, template: 'release' });

export const documentation = (config: Partial<RecipeConfig> & { basePath: string }): Promise<Prompt> =>
    cook({ ...config, template: 'documentation' });

export const review = (config: Partial<RecipeConfig> & { basePath: string }): Promise<Prompt> =>
    cook({ ...config, template: 'review' });

// ===== QUICK BUILDERS =====

export const quick = {
    /**
   * Create a commit prompt with minimal configuration
   */
    commit: async (diffContent: string, options: {
        basePath: string;
        overridePaths?: string[];
        overrides?: boolean;
        userDirection?: string;
        context?: string;
        directories?: string[];
    }): Promise<Prompt> => {
        return cook({
            basePath: options.basePath,
            overridePaths: options.overridePaths,
            overrides: options.overrides,
            template: 'commit',
            content: [
                ...(options.userDirection ? [{ content: options.userDirection, title: 'User Direction', weight: 1.0 }] : []),
                { content: diffContent, title: 'Diff', weight: 0.5 },
            ],
            context: [
                ...(options.context ? [{ content: options.context, title: 'User Context', weight: 1.0 }] : []),
                ...(options.directories ? [{ directories: options.directories, weight: 0.5 }] : []),
            ],
        });
    },

    /**
   * Create a release prompt with minimal configuration
   */
    release: async (logContent: string, diffContent: string, options: {
        basePath: string;
        overridePaths?: string[];
        overrides?: boolean;
        releaseFocus?: string;
        context?: string;
        directories?: string[];
    }): Promise<Prompt> => {
        return cook({
            basePath: options.basePath,
            overridePaths: options.overridePaths,
            overrides: options.overrides,
            template: 'release',
            content: [
                ...(options.releaseFocus ? [{ content: options.releaseFocus, title: 'Release Focus', weight: 1.0 }] : []),
                { content: logContent, title: 'Log', weight: 0.5 },
                { content: diffContent, title: 'Diff', weight: 0.5 },
            ],
            context: [
                ...(options.context ? [{ content: options.context, title: 'User Context', weight: 1.0 }] : []),
                ...(options.directories ? [{ directories: options.directories, weight: 0.5 }] : []),
            ],
        });
    },
};

// ===== FLUENT RECIPE BUILDER =====

export const recipe = (basePath: string) => ({
    template: (name: 'commit' | 'release' | 'documentation' | 'review') => ({
        with: (config: Partial<RecipeConfig>) =>
            cook({ basePath, template: name, ...config }),
    }),

    persona: (persona: ContentItem) => ({
        instructions: (...instructions: ContentItem[]) => ({
            content: (...content: ContentItem[]) => ({
                context: (...context: ContentItem[]) => ({
                    cook: () => cook({ basePath, persona, instructions, content, context }),
                }),
                cook: () => cook({ basePath, persona, instructions, content }),
            }),
            cook: () => cook({ basePath, persona, instructions }),
        }),
        cook: () => cook({ basePath, persona }),
    }),

    cook: (config: Partial<RecipeConfig>) => cook({ basePath, ...config }),
});

// Export types for external use
export type { RecipeConfig, ContentItem }; 