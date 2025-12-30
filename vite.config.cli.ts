import { defineConfig } from 'vite';
import path from 'path';
import shebang from 'rollup-plugin-preserve-shebang';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        target: 'node18',
        ssr: true, // Enable SSR mode for Node.js build
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
            entry: './src/cli.ts',
            formats: ['cjs'],
            fileName: () => 'cli.cjs',
        },
        rollupOptions: {
            external: [
                'commander',
                '@theunwalked/cardigantime',
                'fs',
                'fs/promises',
                'path',
                'crypto',
                'zod',
                'marked',
                'tiktoken',
                'glob',
                'js-yaml',
                'fast-xml-parser',
                'openai',
                '@anthropic-ai/sdk',
                '@google/generative-ai',
                'dotenv',
                'dotenv/config'
            ],
            plugins: [
                shebang({
                    shebang: '#!/usr/bin/env node',
                }),
            ]
        }
    }
});

