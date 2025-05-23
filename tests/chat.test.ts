import { createRequest, getPersonaRole, Message, Model } from "../src/chat";
import { describe, expect, it } from 'vitest';

describe("chat", () => {
    describe("getPersonaRole", () => {
        it("should return 'system' for gpt-4o model", () => {
            const model: Model = "gpt-4o";
            const result = getPersonaRole(model);
            expect(result).toBe("system");
        });

        it("should return 'system' for gpt-4o-mini model", () => {
            const model: Model = "gpt-4o-mini";
            const result = getPersonaRole(model);
            expect(result).toBe("system");
        });

        it("should return default role for other models", () => {
            const models: Model[] = ["o1-preview", "o1-mini", "o1", "o3-mini", "o1-pro"];
            models.forEach(model => {
                const result = getPersonaRole(model);
                expect(result).toBe("developer");
            });
        });
    });

    describe("createChatRequest", () => {
        it("should create a chat request with empty messages array", () => {
            const model: Model = "gpt-4o";
            const request = createRequest(model);

            expect(request.model).toBe(model);
            expect(request.messages).toEqual([]);
        });

        it("should add messages to the chat request", () => {
            const model: Model = "gpt-4o";
            const request = createRequest(model);

            const message1: Message = {
                role: "user",
                content: "Hello"
            };

            const message2: Message = {
                role: "assistant",
                content: "Hi there!"
            };

            request.addMessage(message1);
            request.addMessage(message2);

            expect(request.messages).toEqual([message1, message2]);
        });
    });
});
