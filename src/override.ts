import path from 'path';
import { z } from 'zod';
import { ParametersSchema } from './items/parameters';
import { SectionOptions, SectionOptionsSchema } from './items/section';
import { DEFAULT_LOGGER, wrapLogger } from './logger';
import { Formatter, Parser, Section, Weighted } from './riotprompt';
import * as Storage from './util/storage';

const OptionsSchema = z.object({
    logger: z.any().optional().default(DEFAULT_LOGGER),
    configDir: z.string().default('./overrides'),
    overrides: z.boolean().default(false),
    parameters: ParametersSchema.optional().default({}),
});

export type Options = z.infer<typeof OptionsSchema>;

export type OptionsParam = Partial<Options>;

export interface Instance {
    customize: <T extends Weighted>(overrideFile: string, section: Section<T>, sectionOptions?: SectionOptions) => Promise<Section<T>>;
    override: <T extends Weighted>(overrideFile: string, section: Section<T>, sectionOptions?: SectionOptions) =>
        Promise<{ override?: Section<T>, prepend?: Section<T>, append?: Section<T> }>;
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
    ): Promise<{ override?: Section<T>, prepend?: Section<T>, append?: Section<T> }> => {
        const currentSectionOptions = loadOptions(sectionOptions);

        const baseFile = path.join(options.configDir, overrideFile);
        const preFile = baseFile.replace('.md', '-pre.md');
        const postFile = baseFile.replace('.md', '-post.md');

        const response: { override?: Section<T>, prepend?: Section<T>, append?: Section<T> } = {};

        if (await storage.exists(preFile)) {
            logger.silly('Found pre file %s', preFile);
            const parser = Parser.create({ logger });
            response.prepend = await parser.parseFile<T>(preFile, currentSectionOptions);
        }

        if (await storage.exists(postFile)) {
            logger.silly('Found post file %s', postFile);
            const parser = Parser.create({ logger });
            response.append = await parser.parseFile<T>(postFile, currentSectionOptions);
        }

        if (await storage.exists(baseFile)) {
            logger.silly('Found base file %s', baseFile);
            if (options.overrides) {
                logger.warn('WARNING: Core directives are being overwritten by custom configuration');
                const parser = Parser.create({ logger });
                response.override = await parser.parseFile<T>(baseFile, currentSectionOptions);
            } else {
                logger.error('ERROR: Core directives are being overwritten by custom configuration');
                throw new Error('Core directives are being overwritten by custom configuration, but overrides are not enabled.  Please enable --overrides to use this feature.');
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

        const { overrideContent, prepend, append }: { overrideContent?: Section<T>, prepend?: Section<T>, append?: Section<T> } = await override(overrideFile, section, currentSectionOptions);
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

        if (prepend) {
            logger.silly('Prepend found, adding to content from file %s', prepend);
            finalSection = finalSection.prepend(prepend);
        }

        if (append) {
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