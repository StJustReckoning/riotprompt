import { DEFAULT_PERSONA_ROLE } from "./constants";

export type Role = "user" | "assistant" | "system" | "developer";

export type Model = "gpt-4o" | "gpt-4o-mini" | "o1-preview" | "o1-mini" | "o1" | "o3-mini" | "o1-pro";

export interface Message {
    role: Role;
    content: string | string[];
    name?: string;
}

export interface Request {
    messages: Message[];
    model: Model;

    addMessage(message: Message): void;
}

export const getPersonaRole = (model: Model): Role => {
    if (model === "gpt-4o" || model === "gpt-4o-mini") {
        return "system";
    }
    return DEFAULT_PERSONA_ROLE;
}

export const createRequest = (model: Model): Request => {
    const messages: Message[] = [];

    return {
        model,
        messages,
        addMessage: (message: Message) => {
            messages.push(message);
        }
    }
}
