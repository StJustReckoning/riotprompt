import { z } from "zod";
import { ParametersSchema } from "./parameters";
import { Weighted, WeightedOptions, WeightedOptionsSchema, create as createWeighted } from "./weighted";

export interface Section<T extends Weighted> {
    title?: string;
    items: (T | Section<T>)[];
    weight?: number;
    add: (
        item: T | T[] | Section<T> | Section<T>[] | string | string[],
        options?: Partial<WeightedOptions>
    ) => Section<T>;
    append: (
        item: T | T[] | Section<T> | Section<T>[] | string | string[],
        options?: Partial<WeightedOptions>
    ) => Section<T>;
    prepend: (
        item: T | T[] | Section<T> | Section<T>[] | string | string[],
        options?: Partial<WeightedOptions>
    ) => Section<T>;
    insert: (
        index: number,
        item: T | T[] | Section<T> | Section<T>[] | string | string[],
        options?: Partial<WeightedOptions>
    ) => Section<T>;
    replace: (
        index: number,
        item: T | Section<T> | string,
        options?: Partial<WeightedOptions>
    ) => Section<T>;
    remove: (index: number) => Section<T>;
    toJSON: () => { title?: string; items: any[]; weight?: number; };
}

export const SectionOptionsSchema = z.object({
    title: z.string().optional(),
    weight: z.number().optional(),
    itemWeight: z.number().optional(),
    parameters: ParametersSchema.optional().default({}),
});

export type SectionOptions = z.infer<typeof SectionOptionsSchema>;

export const isSection = (object: any): boolean => {
    return object !== undefined && object != null && typeof object === 'object' && 'items' in object;
}

export const convertToSection = (
    object: any,
    options: Partial<SectionOptions> = {}
): Section<Weighted> => {
    const sectionOptions = SectionOptionsSchema.parse(options);

    const weightedOptions = WeightedOptionsSchema.parse({
        ...sectionOptions,
        weight: sectionOptions.itemWeight,
    });

    if (isSection(object)) {
        const section = create({ ...sectionOptions, title: object.title });
        object.items.forEach((item: any) => {
            if (isSection(item)) {
                section.append(convertToSection(item, sectionOptions));
            } else {
                section.append(createWeighted(item.text, weightedOptions));
            }
        });
        return section;
    } else {
        throw new Error('Object is not a section');
    }
}

export const create = <T extends Weighted>(
    options: Partial<SectionOptions> = {}
): Section<T> => {
    const items: (T | Section<T>)[] = [];
    const sectionOptions = SectionOptionsSchema.parse(options);

    const sectionItemOptions = WeightedOptionsSchema.parse({
        ...sectionOptions,
        weight: sectionOptions.itemWeight,
    });

    const append = (item: T | T[] | Section<T> | Section<T>[] | string | string[], options: Partial<WeightedOptions> = {}): Section<T> => {
        let itemOptions: WeightedOptions = WeightedOptionsSchema.parse(options);
        itemOptions = { ...sectionItemOptions, ...itemOptions };

        if (Array.isArray(item)) {
            item.forEach((item) => {
                append(item, options);  // Propagate options to array items
            });
        } else {
            if (typeof item === 'string') {
                items.push(createWeighted<T>(item, itemOptions));
            } else {
                items.push(item);
            }
        }
        return section;
    }

    const prepend = (item: T | T[] | Section<T> | Section<T>[] | string | string[], options: Partial<WeightedOptions> = {}): Section<T> => {
        let itemOptions: WeightedOptions = WeightedOptionsSchema.parse(options);
        itemOptions = { ...sectionItemOptions, ...itemOptions };

        if (Array.isArray(item)) {
            item.forEach((item) => {
                prepend(item, options);  // Propagate options to array items
            });
        } else {
            if (typeof item === 'string') {
                items.unshift(createWeighted<T>(item, itemOptions));
            } else {
                items.unshift(item);
            }
        }
        return section;
    }

    const insert = (index: number, item: T | T[] | Section<T> | Section<T>[] | string | string[], options: Partial<WeightedOptions> = {}): Section<T> => {
        let itemOptions: WeightedOptions = WeightedOptionsSchema.parse(options);
        itemOptions = { ...sectionItemOptions, ...itemOptions };

        if (Array.isArray(item)) {
            item.forEach((item) => {
                insert(index, item, options);  // Propagate options to array items
            });
        } else {
            if (typeof item === 'string') {
                items.splice(index, 0, createWeighted<T>(item, itemOptions));
            } else {
                items.splice(index, 0, item);
            }
        }
        return section;
    }

    const remove = (index: number): Section<T> => {
        items.splice(index, 1);
        return section;
    }

    const replace = (index: number, item: T | Section<T> | string, options: Partial<WeightedOptions> = {}): Section<T> => {
        let itemOptions: WeightedOptions = WeightedOptionsSchema.parse(options);
        itemOptions = { ...sectionItemOptions, ...itemOptions };

        if (typeof item === 'string') {
            items[index] = createWeighted<T>(item, itemOptions);
        } else {
            items[index] = item;
        }
        return section;
    }

    const add = (item: T | T[] | Section<T> | Section<T>[] | string | string[], options: Partial<WeightedOptions> = {}): Section<T> => {
        let itemOptions: WeightedOptions = WeightedOptionsSchema.parse(options);
        itemOptions = { ...sectionItemOptions, ...itemOptions };

        return append(item, itemOptions);
    }

    const toJSON = () => {
        return {
            title: section.title,
            items: items.map(item => {
                // If the item has a toJSON method, call it, otherwise return the item itself
                return typeof item === 'object' && item !== null && 'toJSON' in item && typeof item.toJSON === 'function'
                    ? item.toJSON()
                    : item;
            }),
            weight: section.weight,
        };
    };

    const section: Section<T> = {
        title: sectionOptions.title,
        items,
        weight: sectionOptions.weight,
        add,
        append,
        prepend,
        insert,
        remove,
        replace,
        toJSON,
    }

    return section;
}


