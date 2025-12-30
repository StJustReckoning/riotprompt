import { z } from 'zod';

export const ConfigSchema = z.object({
    defaultModel: z.string().default('gpt-4').describe('Default model to use for formatting'),
    promptsDir: z.string().default('.').describe('Directory containing prompts'),
    outputDir: z.string().optional().describe('Directory to output formatted prompts'),
});

export type Config = z.infer<typeof ConfigSchema>;

