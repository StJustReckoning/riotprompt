import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';
import replace from '@rollup/plugin-replace';
// import { visualizer } from 'rollup-plugin-visualizer';
import { execSync } from 'child_process';
import shebang from 'rollup-plugin-preserve-shebang';
import dts from 'vite-plugin-dts';
import path from 'path';

let gitInfo = {
    branch: '',
    commit: '',
    tags: '',
    commitDate: '',
};

try {
    gitInfo = {
        branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
        commit: execSync('git rev-parse --short HEAD').toString().trim(),
        tags: '',
        commitDate: execSync('git log -1 --format=%cd --date=iso').toString().trim(),
    };

    try {
        gitInfo.tags = execSync('git tag --points-at HEAD | paste -sd "," -').toString().trim();
    } catch {
        gitInfo.tags = '';
    }
} catch {
    // eslint-disable-next-line no-console
    console.log('Directory does not have a Git repository, skipping git info');
}


export default defineConfig({
    server: {
        port: 3000
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    plugins: [
        ...VitePluginNode({
            adapter: 'express',
            appPath: './src/riotprompt.ts',
            exportName: 'viteNodeApp',
            tsCompiler: 'swc',
            swcOptions: {
                sourceMaps: true,
            },
        }),
        // visualizer({
        //     template: 'network',
        //     filename: 'network.html',
        //     projectRoot: process.cwd(),
        // }),
        replace({
            '__VERSION__': process.env.npm_package_version,
            '__GIT_BRANCH__': gitInfo.branch,
            '__GIT_COMMIT__': gitInfo.commit,
            '__GIT_TAGS__': gitInfo.tags === '' ? '' : `T:${gitInfo.tags}`,
            '__GIT_COMMIT_DATE__': gitInfo.commitDate,
            '__SYSTEM_INFO__': `${process.platform} ${process.arch} ${process.version}`,
            preventAssignment: true,
        }),
        dts({
            entryRoot: 'src',
            outDir: 'dist',
            exclude: ['**/*.test.ts'],
            include: ['**/*.ts'],
        }),
    ],
    build: {
        target: 'esnext',
        outDir: 'dist',
        lib: {
            entry: './src/riotprompt.ts',
            formats: ['es', 'cjs'],
            fileName: (format) => `riotprompt.${format === 'es' ? 'js' : 'cjs'}`,
        },
        rollupOptions: {
            external: [
                '@riotprompt',
                '@riotprompt/formatter',
                '@riotprompt/chat'
            ],
            output: [
                {
                    format: 'esm',
                    entryFileNames: '[name].js',
                    preserveModules: true,
                    exports: 'named',
                },
                {
                    format: 'cjs',
                    entryFileNames: 'riotprompt.cjs',
                    preserveModules: false,
                    exports: 'named',
                }
            ],
            plugins: [
                shebang({
                    shebang: '#!/usr/bin/env node',
                }),
            ],
        },
        modulePreload: false,
        minify: false,
        sourcemap: true
    },
}); 