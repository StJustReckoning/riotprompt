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

    // Content sections
    persona: ContentItemSchema.optional(),
    instructions: z.array(ContentItemSchema).optional().default([]),
    content: z.array(ContentItemSchema).optional().default([]),
    context: z.array(ContentItemSchema).optional().default([]),

    // Templates and inheritance
    extends: z.string().optional(), // Extend another recipe
    template: z.string().optional(), // Generic template name
});

type RecipeConfig = z.infer<typeof RecipeConfigSchema>;
type ContentItem = z.infer<typeof ContentItemSchema>;

// ===== CONFIGURABLE TEMPLATE SYSTEM =====

export interface TemplateConfig {
    persona?: ContentItem;
    instructions?: ContentItem[];
    content?: ContentItem[];
    context?: ContentItem[];
}

// User-customizable template registry
let TEMPLATES: Record<string, TemplateConfig> = {};

/**
 * Register custom templates with the recipes system
 * 
 * @example
 * ```typescript
 * // Register your own templates
 * registerTemplates({
 *   myWorkflow: {
 *     persona: { path: "personas/my-persona.md" },
 *     instructions: [{ path: "instructions/my-instructions.md" }]
 *   },
 *   anotherTemplate: {
 *     persona: { content: "You are a helpful assistant" },
 *     instructions: [{ content: "Follow these steps..." }]
 *   }
 * });
 * ```
 */
export const registerTemplates = (templates: Record<string, TemplateConfig>): void => {
    TEMPLATES = { ...TEMPLATES, ...templates };
};

/**
 * Get currently registered templates
 */
export const getTemplates = (): Record<string, TemplateConfig> => ({ ...TEMPLATES });

/**
 * Clear all registered templates
 */
export const clearTemplates = (): void => {
    TEMPLATES = {};
};

// ===== CORE RECIPE ENGINE =====

export const cook = async (config: Partial<RecipeConfig> & { basePath: string }): Promise<Prompt> => {
    // Parse and validate configuration with defaults
    const validatedConfig = RecipeConfigSchema.parse({
        overridePaths: ["./"],
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
            finalConfig = {
                ...validatedConfig,
                persona: validatedConfig.persona || template.persona,
                instructions: [
                    ...(template.instructions || []),
                    ...(validatedConfig.instructions || [])
                ],
                content: [
                    ...(template.content || []),
                    ...(validatedConfig.content || [])
                ],
                context: [
                    ...(template.context || []),
                    ...(validatedConfig.context || [])
                ],
            };
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
        const parsedSection = await ctx.parser.parse(item, sectionOptions);
        section.add(parsedSection);
    } else if ('content' in item) {
        // Inline content with options
        const parsedSection = await ctx.parser.parse(item.content, {
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

// ===== FLUENT RECIPE BUILDER =====

export const recipe = (basePath: string) => {
    const config: Partial<RecipeConfig> & { basePath: string } = { basePath };

    const builder = {
        template: (name: string) => {
            config.template = name;
            return builder;
        },
        with: (partialConfig: Partial<RecipeConfig>) => {
            Object.assign(config, partialConfig);
            return builder;
        },
        persona: (persona: ContentItem) => {
            config.persona = persona;
            return builder;
        },
        instructions: (...instructions: ContentItem[]) => {
            config.instructions = [...(config.instructions || []), ...instructions];
            return builder;
        },
        content: (...content: ContentItem[]) => {
            config.content = [...(config.content || []), ...content];
            return builder;
        },
        context: (...context: ContentItem[]) => {
            config.context = [...(config.context || []), ...context];
            return builder;
        },
        parameters: (parameters: any) => {
            config.parameters = { ...config.parameters, ...parameters };
            return builder;
        },
        overrides: (enabled: boolean) => {
            config.overrides = enabled;
            return builder;
        },
        overridePaths: (paths: string[]) => {
            config.overridePaths = paths;
            return builder;
        },
        cook: () => cook(config),
    };

    return builder;
};

// Export types for external use
export type { RecipeConfig, ContentItem }; 