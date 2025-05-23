import { Weighted, WeightedOptions, WeightedOptionsSchema, create as createWeighted } from "./weighted";

export type Context = Weighted;

export const create = (text: string, options: Partial<WeightedOptions> = {}): Context => {
    const weightedOptions = WeightedOptionsSchema.parse(options);
    return createWeighted<Context>(text, weightedOptions);
}

