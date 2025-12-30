import path from "path";
import fs from "fs/promises";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { Model } from "./chat";
import { ConversationBuilder } from "./conversation";
import { ParametersSchema } from "./items/parameters";
import { SectionOptions } from "./items/section";
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import { Content, Context, createPrompt, createSection, Instruction, Loader, Override, Parser, Prompt, Section, Weighted } from "./riotprompt";
import { type TokenBudgetConfig } from "./token-budget";
import { Tool, ToolRegistry } from "./tools";
import { StrategyExecutor, type IterationStrategy, type LLMClient, type StrategyResult } from "./iteration-strategy";

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

    // Advanced prompting sections
    constraints: z.array(ContentItemSchema).optional().default([]),
    tone: z.array(ContentItemSchema).optional().default([]),
    examples: z.array(ContentItemSchema).optional().default([]),
    reasoning: z.array(ContentItemSchema).optional().default([]),
    responseFormat: z.array(ContentItemSchema).optional().default([]),
    recap: z.array(ContentItemSchema).optional().default([]),
    safeguards: z.array(ContentItemSchema).optional().default([]),
    schema: z.any().optional(), // Can be string path, JSON object, or Zod schema

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
    constraints?: ContentItem[];
    tone?: ContentItem[];
    examples?: ContentItem[];
    reasoning?: ContentItem[];
    responseFormat?: ContentItem[];
    recap?: ContentItem[];
    safeguards?: ContentItem[];
    schema?: string | Record<string, any> | z.ZodType<any>;
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
        constraints: [],
        tone: [],
        examples: [],
        reasoning: [],
        responseFormat: [],
        recap: [],
        safeguards: [],
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
                constraints: [
                    ...(template.constraints || []),
                    ...(validatedConfig.constraints || [])
                ],
                tone: [
                    ...(template.tone || []),
                    ...(validatedConfig.tone || [])
                ],
                examples: [
                    ...(template.examples || []),
                    ...(validatedConfig.examples || [])
                ],
                reasoning: [
                    ...(template.reasoning || []),
                    ...(validatedConfig.reasoning || [])
                ],
                responseFormat: [
                    ...(template.responseFormat || []),
                    ...(validatedConfig.responseFormat || [])
                ],
                recap: [
                    ...(template.recap || []),
                    ...(validatedConfig.recap || [])
                ],
                safeguards: [
                    ...(template.safeguards || []),
                    ...(validatedConfig.safeguards || [])
                ],
                schema: validatedConfig.schema || template.schema,
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
    
    // Advanced sections
    const constraintSection: Section<Instruction> = createSection({ title: "Constraints" });
    const toneSection: Section<Instruction> = createSection({ title: "Tone" });
    const exampleSection: Section<Content> = createSection({ title: "Examples" });
    const reasoningSection: Section<Instruction> = createSection({ title: "Reasoning" });
    const responseFormatSection: Section<Instruction> = createSection({ title: "Response Format" });
    const recapSection: Section<Instruction> = createSection({ title: "Recap" });
    const safeguardSection: Section<Instruction> = createSection({ title: "Safeguards" });

    // Helper for processing list items
    const processList = async <T extends Weighted>(
        items: ContentItem[],
        section: Section<T>,
        type: 'persona' | 'instruction' | 'content' | 'context'
    ) => {
        for (const item of items) {
            await processContentItem(item, section, type, {
                basePath: finalConfig.basePath,
                parser,
                override,
                loader,
                parameters: finalConfig.parameters,
                logger
            });
        }
    };

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

    // Process standard sections
    await processList(finalConfig.instructions || [], instructionSection, 'instruction');
    await processList(finalConfig.content || [], contentSection, 'content');
    await processList(finalConfig.context || [], contextSection, 'context');

    // Process advanced sections
    await processList(finalConfig.constraints || [], constraintSection, 'instruction');
    await processList(finalConfig.tone || [], toneSection, 'instruction');
    await processList(finalConfig.examples || [], exampleSection, 'content');
    await processList(finalConfig.reasoning || [], reasoningSection, 'instruction');
    await processList(finalConfig.responseFormat || [], responseFormatSection, 'instruction');
    await processList(finalConfig.recap || [], recapSection, 'instruction');
    await processList(finalConfig.safeguards || [], safeguardSection, 'instruction');

    // Generate tool guidance if tools are provided
    if (finalConfig.tools) {
        const tools: Tool[] = Array.isArray(finalConfig.tools)
            ? finalConfig.tools
            : finalConfig.tools.getAll();

        // Filter by categories if specified
        const filteredTools: Tool[] = finalConfig.toolCategories
            ? tools.filter((tool: Tool) => tool.category && finalConfig.toolCategories!.includes(tool.category))
            : tools;

        if (filteredTools.length > 0 && finalConfig.toolGuidance) {
            const guidance = generateToolGuidance(filteredTools, finalConfig.toolGuidance);
            const toolSection = await parser.parse(guidance, { parameters: finalConfig.parameters });
            instructionSection.add(toolSection);
        }
    }

    // Process schema
    let schema = finalConfig.schema;
    let validator: any = undefined;

    if (schema instanceof z.ZodType) {
        // It's a Zod schema!
        validator = schema;
        const jsonSchema = zodToJsonSchema(schema, "response");
        
        // Wrap in OpenAI Structured Output format
        // zod-to-json-schema returns { "$schema": "...", "definitions": { "response": { ... } }, "$ref": "#/definitions/response" }
        // We need to extract the schema part.
        
        // Simpler usage for OpenAI: just get the schema object.
        // Actually, zod-to-json-schema produces a full JSON schema object.
        // OpenAI expects: { type: "json_schema", json_schema: { name: "...", schema: ... } }
        
        // Let's create a clean schema object
        // NOTE: OpenAI requires strict: true and additionalProperties: false
        // zod-to-json-schema generally produces compatible schemas but strictness might need tweaking if required by OpenAI.
        // For now, let's assume "response" as the name.
        
        // We'll define a simpler conversion if possible, or trust the user to configure Zod strictly if they want strict mode.
        
        // Extract the definition if it exists
        const actualSchema = (jsonSchema as any).definitions?.response || jsonSchema;
        
        schema = {
            type: "json_schema",
            json_schema: {
                name: "response",
                schema: actualSchema,
                strict: true // Try to enable strict mode for OpenAI
            }
        };
    } else if (typeof schema === 'string') {
        const schemaPath = path.resolve(finalConfig.basePath, schema);
        try {
            const schemaContent = await fs.readFile(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
        } catch (e: any) {
            throw new Error(`Failed to load schema from ${schemaPath}: ${e.message}`);
        }
    }

    // Build and return prompt
    return createPrompt({
        persona: personaSection.items.length > 0 ? personaSection : undefined,
        instructions: instructionSection,
        contents: contentSection.items.length > 0 ? contentSection : undefined,
        contexts: contextSection.items.length > 0 ? contextSection : undefined,
        constraints: constraintSection.items.length > 0 ? constraintSection : undefined,
        tone: toneSection.items.length > 0 ? toneSection : undefined,
        examples: exampleSection.items.length > 0 ? exampleSection : undefined,
        reasoning: reasoningSection.items.length > 0 ? reasoningSection : undefined,
        responseFormat: responseFormatSection.items.length > 0 ? responseFormatSection : undefined,
        recap: recapSection.items.length > 0 ? recapSection : undefined,
        safeguards: safeguardSection.items.length > 0 ? safeguardSection : undefined,
        schema,
        validator,
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
        constraints: (...constraints: ContentItem[]) => {
            config.constraints = [...(config.constraints || []), ...constraints];
            return builder;
        },
        tone: (...tone: ContentItem[]) => {
            config.tone = [...(config.tone || []), ...tone];
            return builder;
        },
        examples: (...examples: ContentItem[]) => {
            config.examples = [...(config.examples || []), ...examples];
            return builder;
        },
        reasoning: (...reasoning: ContentItem[]) => {
            config.reasoning = [...(config.reasoning || []), ...reasoning];
            return builder;
        },
        responseFormat: (...responseFormat: ContentItem[]) => {
            config.responseFormat = [...(config.responseFormat || []), ...responseFormat];
            return builder;
        },
        recap: (...recap: ContentItem[]) => {
            config.recap = [...(config.recap || []), ...recap];
            return builder;
        },
        safeguards: (...safeguards: ContentItem[]) => {
            config.safeguards = [...(config.safeguards || []), ...safeguards];
            return builder;
        },
        schema: (schema: string | Record<string, any> | z.ZodType<any>) => {
            config.schema = schema;
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
        executeWith: async (
            llm: LLMClient,
            strategy: IterationStrategy,
            model: Model = 'gpt-4o',
            tokenBudget?: TokenBudgetConfig
        ): Promise<StrategyResult> => {
            const prompt = await cook(config);
            const conversation = ConversationBuilder.create({ model }, config.logger);
            conversation.fromPrompt(prompt, model);

            if (tokenBudget) {
                conversation.withTokenBudget(tokenBudget);
            }

            const registry = builder.getToolRegistry();
            if (!registry) {
                throw new Error('Tools must be configured to use executeWith');
            }

            const executor = new StrategyExecutor(llm, config.logger);
            return executor.execute(conversation, registry, strategy);
        },
    };

    return builder;
};

// Export types for external use
export type { RecipeConfig, ContentItem };
