import { Weighted, WeightedOptions, WeightedOptionsSchema, create as createWeighted } from "./weighted";

export type Instruction = Weighted;

export const create = (text: string, options: Partial<WeightedOptions> = {}): Instruction => {
    const weightedOptions = WeightedOptionsSchema.parse(options);
    return createWeighted<Instruction>(text, weightedOptions);
}