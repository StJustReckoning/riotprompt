import { describe, it, expect } from 'vitest';
import { ConfigSchema } from '../src/config';

describe('Config', () => {
    it('should validate default config', () => {
        const result = ConfigSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.defaultModel).toBe('gpt-4');
            expect(result.data.promptsDir).toBe('.');
            expect(result.data.outputDir).toBeUndefined();
        }
    });

    it('should validate valid custom config', () => {
        const input = {
            defaultModel: 'claude-3-opus',
            promptsDir: './prompts',
            outputDir: './dist'
        };
        const result = ConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual(input);
        }
    });

    it('should reject invalid types', () => {
        const input = {
            defaultModel: 123 // should be string
        };
        const result = ConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
    });

    it('should strip unknown keys', () => {
        const input = {
            defaultModel: 'gpt-4',
            unknownKey: 'value'
        };
        const result = ConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
        // Zod by default strips unknown keys if not configured otherwise (strict/passthrough)
        // But let's check the output doesn't contain it if we didn't use strict
        if (result.success) {
           expect((result.data as any).unknownKey).toBeUndefined();
        }
    });
});

