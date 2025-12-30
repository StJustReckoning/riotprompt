import { Content } from "./items/content";
import { Context } from "./items/context";
import { Instruction } from "./items/instruction";
import { Section } from "./items/section";

export interface Prompt {
    persona?: Section<Instruction>;
    instructions: Section<Instruction>;
    contents?: Section<Content>;
    contexts?: Section<Context>;
    
    // Extended sections for advanced prompting
    constraints?: Section<Instruction>;
    tone?: Section<Instruction>;
    examples?: Section<Content>;
    reasoning?: Section<Instruction>;
    responseFormat?: Section<Instruction>;
    recap?: Section<Instruction>;
    safeguards?: Section<Instruction>;
    schema?: any; // JSON Schema for the provider
    validator?: any; // Zod schema for validation
}

export const create = ({
    persona,
    instructions,
    contents,
    contexts,
    constraints,
    tone,
    examples,
    reasoning,
    responseFormat,
    recap,
    safeguards,
    schema,
    validator,
}: {
    persona?: Section<Instruction>,
    instructions: Section<Instruction>,
    contents?: Section<Content>,
    contexts?: Section<Context>,
    constraints?: Section<Instruction>,
    tone?: Section<Instruction>,
    examples?: Section<Content>,
    reasoning?: Section<Instruction>,
    responseFormat?: Section<Instruction>,
    recap?: Section<Instruction>,
    safeguards?: Section<Instruction>,
    schema?: any,
    validator?: any,
}): Prompt => {

    return {
        persona,
        instructions,
        contents,
        contexts,
        constraints,
        tone,
        examples,
        reasoning,
        responseFormat,
        recap,
        safeguards,
        schema,
        validator,
    }
}