import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            provider: 'v8', // or 'istanbul'
            reporter: ['text', 'json', 'html'],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80
            },
            exclude: [
                'node_modules/',
                'src/test/',
                'docs/**',
                'dist/**',
                'vitest.config.ts',
                'vite.config.ts',
                'demo-recipes.ts',
                'eslint.config.mjs',
                '.markdown-doctest-setup.mjs',
            ]
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});

