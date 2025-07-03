import { transform } from '@babel/core';
// eslint-disable-next-line import/extensions
import * as riotprompt from './dist/riotprompt.js';

export default {
    "require": {
        '@riotprompt/riotprompt': riotprompt
    },
    "globals": {
        // Make commonly used exports available as globals for convenience in examples
        'Builder': riotprompt.Builder,
        'Parser': riotprompt.Parser,
        'Formatter': riotprompt.Formatter,
        'Loader': riotprompt.Loader,
        'Override': riotprompt.Override,
        'Chat': riotprompt.Chat,
        'createSection': riotprompt.createSection,
        'createPrompt': riotprompt.createPrompt,
        'createContent': riotprompt.createContent,
        'createContext': riotprompt.createContext,
        'createInstruction': riotprompt.createInstruction,
        'createTrait': riotprompt.createTrait,
        'createWeighted': riotprompt.createWeighted,
        'createParameters': riotprompt.createParameters
    },
    transformCode: (code) => {
        // Wrap code in async function to support await syntax
        const wrappedCode = `(async () => {
            ${code}
        })();`;

        // transform the code using @babel/preset-typescript
        const transformedCode = transform(wrappedCode, {
            filename: 'test.ts',
            presets: ['@babel/preset-typescript'],
            plugins: [
                '@babel/plugin-transform-typescript',
                '@babel/plugin-transform-modules-commonjs'
            ],
            comments: true // Preserve comments
        })?.code;

        return transformedCode;
    }
}