import { describe, it, expect } from 'vitest';
import {
    DEFAULT_PERSONA_ROLE
} from "../src/constants";

describe("constants", () => {
    it("should have correct default persona role", () => {
        expect(DEFAULT_PERSONA_ROLE).toBe("developer");
    });
});
