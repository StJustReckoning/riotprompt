import path from 'path';
import { z } from 'zod';
import { ParametersSchema } from './items/parameters';
import { SectionOptions, SectionOptionsSchema } from './items/section';
import { DEFAULT_LOGGER, wrapLogger } from './logger';
import { Formatter, Parser, Section, Weighted } from './riotprompt';
import * as Storage from './util/storage';

const OptionsSchema = z.object({
    logger: z.any().optional().default(DEFAULT_LOGGER),
    configDirs: z.array(z.string()).default(['./overrides']),
    overrides: z.boolean().default(false),
    parameters: ParametersSchema.optional().default({}),
});

export type Options = z.infer<typeof OptionsSchema>;

export type OptionsParam = Partial<Options>;

export interface Instance {
    customize: <T extends Weighted>(overrideFile: string, section: Section<T>, sectionOptions?: SectionOptions) => Promise<Section<T>>;
    override: <T extends Weighted>(overrideFile: string, section: Section<T>, sectionOptions?: SectionOptions) =>
        Promise<{ override?: Section<T>, prepends: Section<T>[], appends: Section<T>[] }>;
}

export const create = (overrideOptions: OptionsParam = {}): Instance => {
    const options: Required<Options> = OptionsSchema.parse(overrideOptions) as Required<Options>;

    const parameters = options.parameters;

    const logger = wrapLogger(options?.logger, 'Override');
    const storage = Storage.create({ log: logger.debug });

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

    const override = async <T extends Weighted>(
        overrideFile: string,
        section: Section<T>,
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<{ override?: Section<T>, prepends: Section<T>[], appends: Section<T>[] }> => {
        const currentSectionOptions = loadOptions(sectionOptions);

        const response: { override?: Section<T>, prepends: Section<T>[], appends: Section<T>[] } = {
            prepends: [],
            appends: []
        };

        // Process directories in order (closest to furthest)
        for (let i = 0; i < options.configDirs.length; i++) {
            const configDir = options.configDirs[i];
            const baseFile = path.join(configDir, overrideFile);
            const preFile = baseFile.replace('.md', '-pre.md');
            const postFile = baseFile.replace('.md', '-post.md');

            // Check for prepend files (-pre.md)
            if (await storage.exists(preFile)) {
                logger.silly('Found pre file %s (layer %d)', preFile, i + 1);
                const parser = Parser.create({ logger });
                const prependSection = await parser.parseFile<T>(preFile, currentSectionOptions);
                response.prepends.push(prependSection);
            }

            // Check for append files (-post.md)
            if (await storage.exists(postFile)) {
                logger.silly('Found post file %s (layer %d)', postFile, i + 1);
                const parser = Parser.create({ logger });
                const appendSection = await parser.parseFile<T>(postFile, currentSectionOptions);
                response.appends.push(appendSection);
            }

            // Check for complete override files - use the first (closest) one found
            if (!response.override && await storage.exists(baseFile)) {
                logger.silly('Found base file %s (layer %d)', baseFile, i + 1);
                if (options.overrides) {
                    logger.warn('WARNING: Core directives are being overwritten by custom configuration at layer %d', i + 1);
                    const parser = Parser.create({ logger });
                    response.override = await parser.parseFile<T>(baseFile, currentSectionOptions);
                } else {
                    logger.error('ERROR: Core directives are being overwritten by custom configuration');
                    throw new Error('Core directives are being overwritten by custom configuration, but overrides are not enabled.  Please enable --overrides to use this feature.');
                }
            }
        }

        return response;
    }

    const customize = async <T extends Weighted>(
        overrideFile: string,
        section: Section<T>,
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Section<T>> => {
        const currentSectionOptions = loadOptions(sectionOptions);

        const { override: overrideContent, prepends, appends }: { override?: Section<T>, prepends: Section<T>[], appends: Section<T>[] } = await override(overrideFile, section, currentSectionOptions);
        let finalSection: Section<T> = section;

        if (overrideContent) {
            if (options.overrides) {
                logger.warn('Override found, replacing content from file %s', overrideContent);
                finalSection = overrideContent;
            } else {
                logger.error('ERROR: Core directives are being overwritten by custom configuration');
                throw new Error('Core directives are being overwritten by custom configuration, but overrides are not enabled.  Please enable --overrides to use this feature.');
            }
        }

        // Apply prepends in order (closest layer first)
        for (const prepend of prepends) {
            logger.silly('Prepend found, adding to content from file %s', prepend);
            finalSection = finalSection.prepend(prepend);
        }

        // Apply appends in reverse order (furthest layers first, then closest)
        // Create a copy to avoid mutating the original array
        const reversedAppends = [...appends].reverse();
        for (const append of reversedAppends) {
            logger.silly('Append found, adding to content from file %s', append);
            finalSection = finalSection.append(append);
        }

        const formatter = Formatter.create({ logger });
        logger.silly('Final section %s:\n\n%s\n\n', logger.name, formatter.format(finalSection));

        return finalSection;
    }

    return {
        override,
        customize,
    }
}
