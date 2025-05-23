import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { ParametersSchema } from './items/parameters';
import { Section, SectionOptions, SectionOptionsSchema } from './items/section';
import { Weighted } from './items/weighted';
import { DEFAULT_LOGGER, wrapLogger } from './logger';
import { parseMarkdown } from './parse/markdown';
import { parseText } from './parse/text';
import { isMarkdown } from './util/markdown';
import { isText } from './util/text';

const OptionsSchema = z.object({
    logger: z.any().optional().default(DEFAULT_LOGGER),
    parameters: ParametersSchema.optional().default({}),
});

export type Options = z.infer<typeof OptionsSchema>;

export type OptionsParam = Partial<Options>;

export interface Instance {
    parse: <T extends Weighted>(input: string | Buffer, options?: SectionOptions) => Section<T>;
    parseFile: <T extends Weighted>(filePath: string, options?: SectionOptions) => Promise<Section<T>>;
}

export const create = (parserOptions?: OptionsParam): Instance => {
    const options: Required<Options> = OptionsSchema.parse(parserOptions || {}) as Required<Options>;
    const parameters = options.parameters;

    const logger = wrapLogger(options.logger, 'Parser');

    const loadOptions = (sectionOptions: Partial<SectionOptions> = {}): SectionOptions => {
        const currentOptions = SectionOptionsSchema.parse(sectionOptions);
        return {
            ...currentOptions,
            parameters: {
                ...parameters,
                ...currentOptions.parameters
            }
        }
    }

    const parseFile = async <T extends Weighted>(
        filePath: string,
        options: Partial<SectionOptions> = {}
    ): Promise<Section<T>> => {
        const currentOptions = loadOptions(options);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            // Only use the filename as title if no title was explicitly provided
            const fileName = path.basename(filePath, path.extname(filePath));
            return parse(content, {
                ...currentOptions,
                title: currentOptions?.title || fileName
            });
        } catch (error) {
            // Log the error or handle it appropriately
            logger.error(`Error reading or parsing file with marked at ${filePath}:`, error);
            throw new Error(`Failed to parse instructions from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Reads Markdown content and parses it into a single Section.
     * 
     * - If the content starts with a heading, that becomes the title of the returned Section
     * - If no heading at the start, creates a Section with no title
     * - Headers within the content create nested sections based on their depth
     * - All content is organized in a hierarchical structure based on heading levels
     *
     * @param content The content to parse
     * @returns A Section containing all content in a hierarchical structure
     */
    const parse = <T extends Weighted>(
        content: string | Buffer,
        options: Partial<SectionOptions> = {}
    ): Section<T> => {
        const currentOptions = loadOptions(options);

        let mainSection: Section<T>;
        if (isMarkdown(content)) {
            mainSection = parseMarkdown<T>(content, currentOptions);
        } else if (isText(content)) {
            mainSection = parseText<T>(content, currentOptions);
        } else {
            throw new Error(`Unsupported content supplied to parse, riotprompt currently only supports markdown and text`);
        }
        return mainSection;
    }

    return {
        parse,
        parseFile
    }
}