import { Content } from "./items/content";
import { Context } from "./items/context";
import { Instruction } from "./items/instruction";
import { Section } from "./items/section";

export interface Prompt {
    persona?: Section<Instruction>;
    instructions: Section<Instruction>;
    contents?: Section<Content>;
    contexts?: Section<Context>;
}

export const create = ({
    persona,
    instructions,
    contents,
    contexts,
}: {
    persona?: Section<Instruction>,
    instructions: Section<Instruction>,
    contents?: Section<Content>,
    contexts?: Section<Context>
}): Prompt => {

    return {
        persona,
        instructions,
        contents,
        contexts,
    }
}