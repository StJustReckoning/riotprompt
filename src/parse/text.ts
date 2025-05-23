import { create as createSection, Section, SectionOptions, SectionOptionsSchema } from '../items/section';
import { create as createWeighted, Weighted, WeightedOptionsSchema } from '../items/weighted';

export const parseText = <T extends Weighted>(
    input: string | Buffer,
    options: Partial<SectionOptions> = {}
): Section<T> => {

    let text;
    if (typeof input === 'string') {
        text = input;
    } else {
        text = input.toString();
    }

    const sectionOptions = SectionOptionsSchema.parse(options);

    // Set the item options
    const itemOptions = WeightedOptionsSchema.parse({
        ...sectionOptions,
        weight: sectionOptions.itemWeight,
    });

    // Split the text on newlines
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

    // Create the main section with the supplied title
    const mainSection = createSection<T>(sectionOptions);

    for (const line of lines) {
        const instruction: T = createWeighted<T>(line, itemOptions);
        mainSection.add(instruction, itemOptions);
    }

    return mainSection;
}
