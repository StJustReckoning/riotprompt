import { z } from "zod";

export const ParametersSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()]))]));

export type Parameters = z.infer<typeof ParametersSchema>;

export const create = (parameters: Parameters): Parameters => {
    return parameters;
}

export const apply = (text: string, parameters?: Parameters): string => {
    if (!parameters) {
        return text;
    }

    // First, trim parameters keys to handle whitespace in placeholder names
    const trimmedParams: Record<string, any> = {};
    Object.keys(parameters).forEach(key => {
        trimmedParams[key.trim()] = parameters[key];
    });

    // Process all placeholders, preserving ones that don't have matching parameters
    return text.replace(/\{\{([^{}]+)\}\}/g, (match, p1) => {
        const paramKey = p1.trim();
        const parameter = trimmedParams[paramKey];

        if (parameter === undefined) {
            // Preserve the original placeholder if parameter doesn't exist
            return match;
        } else if (typeof parameter === 'string') {
            return parameter;
        } else if (typeof parameter === 'number') {
            return parameter.toString();
        } else if (typeof parameter === 'boolean') {
            return parameter.toString();
        } else if (Array.isArray(parameter)) {
            return parameter.join(', ');
        } else {
            return match;
        }
    });
}