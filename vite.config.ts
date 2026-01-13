import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';
import replace from '@rollup/plugin-replace';
import { execSync } from 'child_process';
import dts from 'vite-plugin-dts';

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
            '@': new URL('./src', import.meta.url).pathname
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
            formats: ['es'],
            fileName: () => 'riotprompt.js',
        },
        rollupOptions: {
            external: [
                '@riotprompt',
                '@riotprompt/formatter',
                '@riotprompt/chat'
            ],
            output: {
                format: 'esm',
                entryFileNames: '[name].js',
                preserveModules: true,
                exports: 'named',
            },
        },
        modulePreload: false,
        minify: false,
        sourcemap: true
    },
});
