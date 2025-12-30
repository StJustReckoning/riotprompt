import { Instruction } from "riotprompt";
import { z } from "zod";
import * as Chat from "./chat";
import { getPersonaRole, Message, Model } from "./chat";
import { DEFAULT_FORMAT_OPTIONS } from "./constants";
import { Section } from "./items/section";
import { Weighted } from "./items/weighted";
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import { Prompt } from "./prompt";
import { clean, stringifyJSON } from "./util/general";

export const SectionSeparatorSchema = z.enum(["tag", "markdown"]);
export const SectionTitlePropertySchema = z.enum(["title", "name"]);

export type SectionSeparator = z.infer<typeof SectionSeparatorSchema>;
export type SectionTitleProperty = z.infer<typeof SectionTitlePropertySchema>;


export const FormatOptionsSchema = z.object({
    sectionSeparator: SectionSeparatorSchema,
    sectionIndentation: z.boolean(),
    sectionTitleProperty: SectionTitlePropertySchema,
    sectionTitlePrefix: z.string().optional(),
    sectionTitleSeparator: z.string().optional(),
    sectionDepth: z.number().default(0),
});

export type FormatOptions = z.infer<typeof FormatOptionsSchema>;


export const OptionSchema = z.object({
    logger: z.any().optional().default(DEFAULT_LOGGER),
    formatOptions: FormatOptionsSchema.partial().optional().default(DEFAULT_FORMAT_OPTIONS),
});

export type Options = z.infer<typeof OptionSchema>;

export type OptionsParam = Partial<Options>;

export interface Instance {
    formatPersona: (model: Model, persona: Section<Instruction>) => Message;
    format: <T extends Weighted>(weightedText: T | Section<T>, sectionDepth?: number) => string;
    formatArray: <T extends Weighted>(items: (T | Section<T>)[], sectionDepth?: number) => string;
    formatPrompt: (model: Model, prompt: Prompt) => Chat.Request;
}

// Type guard to check if an object is a Section
function isSection<T extends Weighted>(obj: T | Section<T>): obj is Section<T> {
    return obj && typeof obj === 'object' && 'items' in obj && Array.isArray((obj as Section<T>).items);
}

// Type guard to check if an object is a Section
function isWeighted<T extends Weighted>(obj: T | Section<T>): obj is T {
    return obj && typeof obj === 'object' && 'text' in obj;
}


export const create = (formatterOptions?: OptionsParam): Instance => {
    const options: Required<Options> = OptionSchema.parse(formatterOptions || {}) as Required<Options>;

    const logger = wrapLogger(options.logger, 'Formatter');

    let formatOptions: FormatOptions = DEFAULT_FORMAT_OPTIONS;
    if (options?.formatOptions) {
        formatOptions = {
            ...formatOptions,
            ...clean(options.formatOptions),
        };
    }

    const formatPersona = (model: Model, persona: Section<Instruction>): Message => {
        logger.silly(`Formatting persona`);
        if (persona) {
            const formattedPersona = formatSection(persona);

            return {
                role: getPersonaRole(model),
                content: `${formattedPersona}`,
            }
        } else {
            throw new Error("Persona is required");
        }
    }

    const format = <T extends Weighted>(
        item: T | Section<T>,
        sectionDepth?: number,
    ): string => {
        logger.silly(`Formatting ${isSection(item) ? "section" : "item"} Item: %s`, stringifyJSON(item));
        const currentSectionDepth = sectionDepth ?? formatOptions.sectionDepth;
        logger.silly(`\t\tCurrent section depth: ${currentSectionDepth}`);

        let result: string = "";
        if (isSection(item)) {
            result = formatSection(item, currentSectionDepth + 1);
        } else if (isWeighted(item)) {
            result = item.text;
        } else {
            //If the item is neither a section nor a weighted item, it is empty.
            result = '';
        }
        return result;
    }

    const formatSection = <T extends Weighted>(section: Section<T>, sectionDepth?: number): string => {
        logger.silly(`Formatting section`);
        const currentSectionDepth = sectionDepth ?? formatOptions.sectionDepth;
        logger.silly(`\t\tCurrent section depth: ${currentSectionDepth}`);

        if (section) {
            const formattedItems = section.items.map(item => format(item, currentSectionDepth)).join("\n\n");

            if (formatOptions.sectionSeparator === "tag") {
                return `<${section.title ?? "section"}>\n${formattedItems}\n</${section.title ?? "section"}>`;
            } else {
                // Use the current section depth for heading level
                const headingLevel = currentSectionDepth;
                const hashes = '#'.repeat(headingLevel);
                logger.silly(`\t\tHeading level: ${headingLevel}`);
                logger.silly(`\t\tSection title: ${section.title}`);
                return `${hashes} ${formatOptions.sectionTitlePrefix ? `${formatOptions.sectionTitlePrefix} ${formatOptions.sectionTitleSeparator} ` : ""}${section.title}\n\n${formattedItems}`;
            }
        } else {
            return '';
        }
    }

    // Helper function to format arrays of items or sections
    const formatArray = <T extends Weighted>(
        items: (T | Section<T>)[],
        sectionDepth?: number
    ): string => {
        logger.silly(`Formatting array`);
        const currentSectionDepth = sectionDepth ?? formatOptions.sectionDepth;
        return items.map(item => format(item, currentSectionDepth)).join("\n\n");
    }

    const formatPrompt = (model: Model, prompt: Prompt): Chat.Request => {
        logger.silly('Formatting prompt');
        const chatRequest: Chat.Request = Chat.createRequest(model);

        // --- System/Role Message Construction ---
        // Collect sections that belong in the system/developer prompt (Persona, Tone, Constraints, etc.)
        const systemSections: Section<Instruction>[] = [];
        if (prompt.persona) systemSections.push(prompt.persona);
        if (prompt.tone) systemSections.push(prompt.tone);
        if (prompt.constraints) systemSections.push(prompt.constraints);
        if (prompt.safeguards) systemSections.push(prompt.safeguards);
        if (prompt.responseFormat) systemSections.push(prompt.responseFormat);

        if (systemSections.length > 0) {
            // Combine all system sections into one system message content
            const systemContent = systemSections
                .map(section => formatSection(section))
                .join('\n\n');
            
            chatRequest.addMessage({
                role: getPersonaRole(model),
                content: systemContent
            });
        }

        // --- User/Task Message Construction ---
        // Logical flow: Context -> Examples -> Instructions -> Content -> Reasoning -> Recap
        // This structure guides the model through the context and examples before presenting the core task
        const userSections: (Section<any> | undefined)[] = [
            prompt.contexts,
            prompt.examples,
            prompt.instructions,
            prompt.contents,
            prompt.reasoning,
            prompt.recap
        ];

        let formattedUserContent = "";
        
        for (const section of userSections) {
            if (section) {
                formattedUserContent += formatSection(section) + '\n\n';
            }
        }

        // Ensure we always have a user message, or if we have content to send
        if (formattedUserContent.trim().length > 0 || systemSections.length === 0) {
            chatRequest.addMessage({
                role: "user",
                content: formattedUserContent.trim() || " ", // Empty user message if needed (though usually not ideal)
            });
        }

        if (prompt.schema) {
            chatRequest.responseFormat = prompt.schema;
        }

        if (prompt.validator) {
            chatRequest.validator = prompt.validator;
        }

        return chatRequest;
    }

    return {
        formatPersona,
        format,
        formatPrompt,
        formatArray,
    }
}
