import path from "path";
import { z } from "zod";
import { ParametersSchema } from "./items/parameters";
import { SectionOptions, SectionOptionsSchema } from "./items/section";
import { DEFAULT_LOGGER, wrapLogger } from "./logger";
import { Content, Context, createPrompt, createSection, Instruction, Loader, Override, Parser, Prompt, Section, Weighted } from "./riotprompt";

const OptionSchema = z.object({
    logger: z.any().optional().default(DEFAULT_LOGGER),
    basePath: z.string(),
    overridePath: z.string().optional().default("./"),
    overrides: z.boolean().optional().default(false),
    parameters: ParametersSchema.optional().default({}),
});

export type Options = z.infer<typeof OptionSchema>;

export type OptionsParam = Required<Pick<Options, 'basePath'>> & Partial<Omit<Options, 'basePath'>>;

export interface Instance {
    addPersonaPath(contentPath: string, sectionOptions?: Partial<SectionOptions>): Promise<Instance>;
    addContextPath(contentPath: string, sectionOptions?: Partial<SectionOptions>): Promise<Instance>;
    addInstructionPath(contentPath: string, sectionOptions?: Partial<SectionOptions>): Promise<Instance>;
    addContentPath(contentPath: string, sectionOptions?: Partial<SectionOptions>): Promise<Instance>;
    addContent(content: string, sectionOptions?: Partial<SectionOptions>): Promise<Instance>;
    addContext(context: string, sectionOptions?: Partial<SectionOptions>): Promise<Instance>;
    loadContext(contextDirectories: string[], sectionOptions?: Partial<SectionOptions>): Promise<Instance>;
    loadContent(contentDirectories: string[], sectionOptions?: Partial<SectionOptions>): Promise<Instance>;
    build(): Promise<Prompt>;
}

export const create = (builderOptions: OptionsParam): Instance => {
    const options: Required<Options> = OptionSchema.parse(builderOptions) as Required<Options>;

    const logger = wrapLogger(options.logger, 'Builder');
    const parser = Parser.create({ logger });
    const override = Override.create({
        logger, configDir: options.overridePath || "./",
        overrides: options.overrides || false
    });
    const loader = Loader.create({ logger });

    const personaSection: Section<Instruction> = createSection({ title: "Persona" });
    const contextSection: Section<Context> = createSection({ title: "Context" });
    const instructionSection: Section<Instruction> = createSection({ title: "Instruction" });
    const contentSection: Section<Content> = createSection({ title: "Content" });
    const parameters = options.parameters;


    const instance: Partial<Instance> = {}

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

    const loadDirectories = async <T extends Weighted>(
        directories: string[],
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Section<T>[]> => {
        const currentOptions = loadOptions(sectionOptions);
        logger.debug("Loading directories", directories);
        const sections: Section<T>[] = await loader.load<T>(directories, currentOptions);
        return sections;
    }

    const loadContext = async (
        contextDirectories: string[],
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Instance> => {
        const currentOptions = loadOptions(sectionOptions);
        logger.debug('Loading context', contextDirectories);
        const context: Section<Context>[] = await loadDirectories<Context>(contextDirectories, currentOptions);
        contextSection.add(context);
        return instance as Instance;
    }
    instance.loadContext = loadContext;

    const loadContent = async (
        contentDirectories: string[],
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Instance> => {
        const currentOptions = loadOptions(sectionOptions);
        const content: Section<Content>[] = await loadDirectories<Content>(contentDirectories, currentOptions);
        contentSection.add(content);
        return instance as Instance;
    }
    instance.loadContent = loadContent;

    const loadPath = async <T extends Weighted>(
        contentPath: string,
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Section<T>> => {
        const currentOptions = loadOptions(sectionOptions);
        const defaultPath = path.join(options.basePath as string, contentPath);
        const section: Section<T> = await parser.parseFile<T>(defaultPath, currentOptions);
        const overrideSection = await override.customize<T>(contentPath, section, currentOptions);
        return overrideSection;
    }

    const addPersonaPath = async (
        contentPath: string,
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Instance> => {
        const currentOptions = loadOptions(sectionOptions);
        const persona: Section<Instruction> = await loadPath<Instruction>(contentPath, currentOptions);
        personaSection.add(persona);
        return instance as Instance;
    }
    instance.addPersonaPath = addPersonaPath;

    const addContextPath = async (
        contentPath: string,
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Instance> => {
        logger.debug("Adding context path", contentPath);
        const currentOptions = loadOptions(sectionOptions);
        const context: Section<Context> = await loadPath<Context>(contentPath, currentOptions);
        contextSection.add(context);
        return instance as Instance;
    }
    instance.addContextPath = addContextPath;

    const addInstructionPath = async (
        contentPath: string,
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Instance> => {
        logger.debug("Adding instruction path", contentPath);
        const currentOptions = loadOptions(sectionOptions);
        const instruction: Section<Instruction> = await loadPath<Instruction>(contentPath, currentOptions);
        instructionSection.add(instruction);
        return instance as Instance;
    }
    instance.addInstructionPath = addInstructionPath;

    const addContentPath = async (
        contentPath: string,
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Instance> => {
        logger.debug("Adding content path", contentPath);
        const currentOptions = loadOptions(sectionOptions);
        const content: Section<Content> = await loadPath<Content>(contentPath, currentOptions);
        contentSection.add(content);
        return instance as Instance;
    }
    instance.addContentPath = addContentPath;

    const addContent = async (
        content: string | Buffer,
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Instance> => {
        logger.debug("Adding content", typeof content);
        const currentOptions = loadOptions(sectionOptions);
        const parsedContentSection: Section<Content> = parser.parse<Content>(content, currentOptions);
        contentSection.add(parsedContentSection);
        return instance as Instance;
    }
    instance.addContent = addContent;

    const addContext = async (
        context: string | Buffer,
        sectionOptions: Partial<SectionOptions> = {}
    ): Promise<Instance> => {
        logger.debug("Adding context", typeof context);
        const currentOptions = loadOptions(sectionOptions);
        const parsedContextSection: Section<Context> = parser.parse<Context>(context, currentOptions);
        contextSection.add(parsedContextSection);
        return instance as Instance;
    }
    instance.addContext = addContext;

    const build = async () => {
        logger.debug("Building prompt", {});
        const prompt = createPrompt({ persona: personaSection, contexts: contextSection, instructions: instructionSection, contents: contentSection });
        return prompt;
    }
    instance.build = build;

    return instance as Instance;
}
