import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            provider: 'v8',
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
                'vite.config.cli.ts',
                'demo-recipes.ts',
                'src/execution/provider.ts',
                'eslint.config.mjs',
                '.markdown-doctest-setup.mjs',
            ]
        }
    },
    resolve: {
        alias: {
            '@': new URL('./src', import.meta.url).pathname
        }
    }
});
