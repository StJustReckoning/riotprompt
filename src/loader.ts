import path from "path";
import { z } from "zod";
import { DEFAULT_IGNORE_PATTERNS } from "./constants";
import { ParametersSchema } from "./items/parameters";
import { SectionOptions, SectionOptionsSchema } from "./items/section";
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import { Section, Weighted, createSection } from "./minorPrompt";
import * as Storage from "./util/storage";

const OptionsSchema = z.object({
    logger: z.any().optional().default(DEFAULT_LOGGER),
    ignorePatterns: z.array(z.string()).optional().default(DEFAULT_IGNORE_PATTERNS),
    parameters: ParametersSchema.optional().default({}),
});

export type Options = z.infer<typeof OptionsSchema>;

export type OptionsParam = Partial<Options>;

export interface Instance {
    load: <T extends Weighted>(contextDirectories?: string[], options?: SectionOptions) => Promise<Section<T>[]>;
}

/**
 * Extracts the first header from Markdown text
 * @param markdownText The Markdown text to parse
 * @returns The first header found in the Markdown or null if none is found
 */
export function extractFirstHeader(markdownText: string): string | null {
    // Regular expression to match Markdown headers (# Header, ## Header, etc.)
    const headerRegex = /^(#{1,6})\s+(.+?)(?:\n|$)/m;
    const match = markdownText.match(headerRegex);

    if (match && match[2]) {
        return match[2].trim();
    }

    return null;
}

/**
 * Removes the first header from Markdown text
 * @param markdownText The Markdown text to process
 * @returns The Markdown text without the first header
 */
export function removeFirstHeader(markdownText: string): string {
    // Regular expression to match Markdown headers (# Header, ## Header, etc.)
    const headerRegex = /^(#{1,6})\s+(.+?)(?:\n|$)/m;
    const match = markdownText.match(headerRegex);

    if (match) {
        return markdownText.replace(headerRegex, '').trim();
    }

    return markdownText;
}

export const create = (loaderOptions?: OptionsParam): Instance => {
    const options: Required<Options> = OptionsSchema.parse(loaderOptions || {}) as Required<Options>;
    const parameters = options.parameters;

    const logger = wrapLogger(options.logger, 'Loader');
    const ignorePatterns = options.ignorePatterns;

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

    /**
     * Loads context from the provided directories and returns instruction sections
     * 
     * @param contextDirectories Directories containing context files
     * @returns Array of instruction sections loaded from context directories
     */
    const load = async<T extends Weighted>(
        contextDirectories: string[] = [],
        options: Partial<SectionOptions> = {}
    ): Promise<Section<T>[]> => {
        const sectionOptions = loadOptions(options);

        logger.debug(`Loading context from ${contextDirectories}`);
        const contextSections: Section<T>[] = [];

        if (!contextDirectories || contextDirectories.length === 0) {
            logger.debug(`No context directories provided, returning empty context`);
            return contextSections;
        }

        const storage = Storage.create({ log: logger.debug });

        // Add context sections from each directory
        for (const contextDir of contextDirectories) {
            try {
                const dirName = path.basename(contextDir);
                logger.debug(`Processing context directory ${dirName}`);
                let mainContextSection: Section<T>;

                // First check if there's a context.md file
                const contextFile = path.join(contextDir, 'context.md');

                if (await storage.exists(contextFile)) {
                    logger.debug(`Found context.md file in ${contextDir}`);
                    const mainContextContent = await storage.readFile(contextFile, 'utf8');
                    // Extract the first header from the Markdown content
                    const firstHeader = extractFirstHeader(mainContextContent);

                    // Use the header from context.md as the section title, or fallback to directory name
                    const sectionTitle = firstHeader || dirName;
                    mainContextSection = createSection<T>({ ...sectionOptions, title: sectionTitle });

                    // Add content without the header
                    if (firstHeader) {
                        mainContextSection.add(removeFirstHeader(mainContextContent), { ...sectionOptions });
                    } else {
                        mainContextSection.add(mainContextContent, { ...sectionOptions });
                    }
                } else {
                    // If no context.md exists, use directory name as title
                    mainContextSection = createSection<T>({ ...sectionOptions, title: dirName });
                }

                // Get all other files in the directory
                const files = await storage.listFiles(contextDir);
                const ignorePatternsRegex = ignorePatterns.map(pattern => new RegExp(pattern, 'i'));

                const filteredFiles = files.filter(file =>
                    !ignorePatternsRegex.some(regex => regex.test(file))
                );

                for (const file of filteredFiles) {
                    // Skip the context.md file as it's already processed
                    if (file === 'context.md') continue;

                    logger.debug(`Processing file ${file} in ${contextDir}`);
                    const filePath = path.join(contextDir, file);
                    if (await storage.isFile(filePath)) {
                        const fileContent = await storage.readFile(filePath, 'utf8');
                        let sectionName = file;
                        let contentToAdd = fileContent;

                        // Extract header if it exists
                        if (file.endsWith('.md')) {
                            const fileHeader = extractFirstHeader(fileContent);
                            if (fileHeader) {
                                sectionName = fileHeader;
                                // Remove the header from the content
                                contentToAdd = removeFirstHeader(fileContent);
                            }
                        }

                        // Create a subsection with the extracted name
                        const fileSection = createSection<T>({ ...sectionOptions, title: sectionName });
                        fileSection.add(contentToAdd, { ...sectionOptions });

                        // Add this file section to the main context section
                        mainContextSection.add(fileSection as unknown as T, { ...sectionOptions });
                    }
                }

                contextSections.push(mainContextSection);
            } catch (error) {
                logger.error(`Error processing context directory ${contextDir}: ${error}`);
            }
        }

        return contextSections;
    }


    return {
        load
    }
}
