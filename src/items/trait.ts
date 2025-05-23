import { Weighted, WeightedOptions, WeightedOptionsSchema, create as createWeighted } from "./weighted";

export type Trait = Weighted;

export const create = (text: string, options: WeightedOptions = {}): Trait => {
    const weightedOptions = WeightedOptionsSchema.parse(options);
    return createWeighted<Trait>(text, weightedOptions);
}