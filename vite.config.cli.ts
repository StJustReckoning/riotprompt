import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        alias: {
            '@': new URL('./src', import.meta.url).pathname
        }
    },
    build: {
        target: 'node24',
        ssr: true,
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
            entry: './src/cli.ts',
            formats: ['es'],
            fileName: () => 'cli.js',
        },
        rollupOptions: {
            external: [
                'commander',
                '@theunwalked/cardigantime',
                'node:fs',
                'node:fs/promises',
                'node:path',
                'node:crypto',
                'zod',
                'marked',
                'tiktoken',
                'js-yaml',
                'fast-xml-parser',
                'openai',
                '@anthropic-ai/sdk',
                '@google/generative-ai',
                'dotenv',
                'dotenv/config'
            ],
        }
    }
});
