import { z } from "zod";
import { ParametersSchema, apply as applyParameters } from "./parameters";

export const WeightedSchema = z.object({
    text: z.string(),
    weight: z.number().optional(),
});

export type Weighted = z.infer<typeof WeightedSchema>;

export const WeightedOptionsSchema = z.object({
    weight: z.number().optional(),
    parameters: ParametersSchema.optional(),
});

export type WeightedOptions = z.infer<typeof WeightedOptionsSchema>;


export const create = <T extends Weighted>(
    text: string,
    options: Partial<WeightedOptions> = {}
): T => {
    const weightedOptions = WeightedOptionsSchema.parse(options);
    const parameterizedText = applyParameters(text, weightedOptions.parameters);

    return {
        text: parameterizedText,
        weight: weightedOptions.weight,
    } as T;
}