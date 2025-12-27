import path from "path";
import { z } from "zod";
import { Model } from "./chat";
import { ConversationBuilder } from "./conversation";
import { ParametersSchema } from "./items/parameters";
import { SectionOptions } from "./items/section";
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import { Content, Context, createPrompt, createSection, Instruction, Loader, Override, Parser, Prompt, Section, Weighted } from "./riotprompt";
import { type TokenBudgetConfig } from "./token-budget";
import { Tool, ToolRegistry } from "./tools";

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

    // Tool integration
    tools: z.any().optional(), // Tool[] | ToolRegistry
    toolGuidance: z.union([
        z.enum(['auto', 'minimal', 'detailed']),
        z.object({
            strategy: z.enum(['adaptive', 'prescriptive', 'minimal']),
            includeExamples: z.boolean().optional(),
            explainWhenToUse: z.boolean().optional(),
            includeCategories: z.boolean().optional(),
            customInstructions: z.string().optional(),
        })
    ]).optional(),
    toolCategories: z.array(z.string()).optional(),
});

type RecipeConfig = z.infer<typeof RecipeConfigSchema>;
type ContentItem = z.infer<typeof ContentItemSchema>;

// ===== CONFIGURABLE TEMPLATE SYSTEM =====

export interface ToolGuidanceConfig {
    strategy: 'adaptive' | 'prescriptive' | 'minimal';
    includeExamples?: boolean;
    explainWhenToUse?: boolean;
    includeCategories?: boolean;
    customInstructions?: string;
}

export interface TemplateConfig {
    persona?: ContentItem;
    instructions?: ContentItem[];
    content?: ContentItem[];
    context?: ContentItem[];
    tools?: Tool[] | ToolRegistry;
    toolGuidance?: Partial<ToolGuidanceConfig> | 'auto' | 'minimal' | 'detailed';
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

// ===== TOOL GUIDANCE GENERATION =====

/**
 * Generate tool guidance instructions based on strategy
 */
export const generateToolGuidance = (
    tools: Tool[],
    guidance: ToolGuidanceConfig | 'auto' | 'minimal' | 'detailed'
): string => {
    if (tools.length === 0) {
        return '';
    }

    // Normalize guidance config
    let config: ToolGuidanceConfig;
    if (typeof guidance === 'string') {
        switch (guidance) {
            case 'auto':
            case 'detailed':
                config = { strategy: 'adaptive', includeExamples: true, explainWhenToUse: true };
                break;
            case 'minimal':
                config = { strategy: 'minimal', includeExamples: false, explainWhenToUse: false };
                break;
            default:
                config = { strategy: 'adaptive' };
        }
    } else {
        config = guidance;
    }

    let output = '## Available Tools\n\n';

    if (config.customInstructions) {
        output += config.customInstructions + '\n\n';
    }

    // Group by category if enabled
    if (config.includeCategories) {
        const categorized = new Map<string, Tool[]>();
        tools.forEach(tool => {
            const category = tool.category || 'General';
            if (!categorized.has(category)) {
                categorized.set(category, []);
            }
            categorized.get(category)!.push(tool);
        });

        categorized.forEach((categoryTools, category) => {
            output += `### ${category}\n\n`;
            categoryTools.forEach(tool => {
                output += formatToolGuidance(tool, config);
            });
        });
    } else {
        tools.forEach(tool => {
            output += formatToolGuidance(tool, config);
        });
    }

    return output;
};

const formatToolGuidance = (tool: Tool, config: ToolGuidanceConfig): string => {
    let output = `**${tool.name}**`;

    if (tool.cost) {
        output += ` _(${tool.cost})_`;
    }

    output += `\n${tool.description}\n\n`;

    if (config.strategy !== 'minimal') {
        // Parameters
        const required = tool.parameters.required || [];
        const paramList = Object.entries(tool.parameters.properties)
            .map(([name, param]) => {
                const isRequired = required.includes(name);
                return `- \`${name}\`${isRequired ? ' (required)' : ''}: ${param.description}`;
            })
            .join('\n');

        if (paramList) {
            output += 'Parameters:\n' + paramList + '\n\n';
        }

        // When to use (adaptive and prescriptive)
        if (config.explainWhenToUse && (config.strategy === 'adaptive' || config.strategy === 'prescriptive')) {
            output += `**When to use:** ${tool.description}\n\n`;
        }

        // Examples
        if (config.includeExamples && tool.examples && tool.examples.length > 0) {
            output += '**Examples:**\n';
            tool.examples.forEach(example => {
                output += `- ${example.scenario}: \`${tool.name}(${JSON.stringify(example.params)})\`\n`;
            });
            output += '\n';
        }
    }

    output += '---\n\n';

    return output;
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

    // Generate tool guidance if tools are provided
    if (finalConfig.tools) {
        const tools: Tool[] = Array.isArray(finalConfig.tools)
            ? finalConfig.tools
            : finalConfig.tools.getAll();

        // Filter by categories if specified
        const filteredTools: Tool[] = finalConfig.toolCategories
            ? tools.filter((tool: Tool) => finalConfig.toolCategories!.includes(tool.category || ''))
            : tools;

        if (filteredTools.length > 0 && finalConfig.toolGuidance) {
            const guidance = generateToolGuidance(filteredTools, finalConfig.toolGuidance);
            const toolSection = await parser.parse(guidance, { parameters: finalConfig.parameters });
            instructionSection.add(toolSection);
        }
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
        tools: (tools: Tool[] | ToolRegistry) => {
            config.tools = tools;
            return builder;
        },
        toolRegistry: (registry: ToolRegistry) => {
            config.tools = registry;
            return builder;
        },
        toolGuidance: (guidance: ToolGuidanceConfig | 'auto' | 'minimal' | 'detailed') => {
            config.toolGuidance = guidance as any;
            return builder;
        },
        toolCategories: (categories: string[]) => {
            config.toolCategories = categories;
            return builder;
        },
        cook: () => cook(config),
        buildConversation: async (model: Model, tokenBudget?: TokenBudgetConfig) => {
            const prompt = await cook(config);
            const conversation = ConversationBuilder.create({ model }, config.logger);
            conversation.fromPrompt(prompt, model);

            // Apply token budget if provided
            if (tokenBudget) {
                conversation.withTokenBudget(tokenBudget);
            }

            return conversation;
        },
        getToolRegistry: (): ToolRegistry | undefined => {
            if (config.tools instanceof ToolRegistry) {
                return config.tools;
            } else if (Array.isArray(config.tools)) {
                const registry = ToolRegistry.create({}, config.logger);
                registry.registerAll(config.tools);
                return registry;
            }
            return undefined;
        },
    };

    return builder;
};

// Export types for external use
export type { RecipeConfig, ContentItem };
