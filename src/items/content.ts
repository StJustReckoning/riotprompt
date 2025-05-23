import { Weighted, WeightedOptions, WeightedOptionsSchema, create as createWeighted } from "./weighted";

// Define Content as a type alias for Weighted
export type Content = Weighted;

// Export create function
export const create = (text: string, options: Partial<WeightedOptions> = {}): Content => {
    const weightedOptions = WeightedOptionsSchema.parse(options);
    return createWeighted<Content>(text, weightedOptions);
}

