import { getPersonaRole as getPersonaRoleFromRegistry } from "./model-config";

export type Role = "user" | "assistant" | "system" | "developer";

// Model is now a flexible string type
export type Model = string;

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
    return getPersonaRoleFromRegistry(model);
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
