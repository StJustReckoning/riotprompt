import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores([
        "dist/**",
        "node_modules/**",
        "**/*.test.ts",
        "docs/dist/**",
        "docs/**"
    ]),
    {
        extends: compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),

        plugins: {
            "@typescript-eslint": typescriptEslint,
            "import": importPlugin,
        },

        languageOptions: {
            globals: {
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
        },

        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/explicit-function-return-type": "off",

            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_",
            }],

            indent: ["error", 4, {
                SwitchCase: 1,
            }],

            "import/extensions": ["error", "never", {
                ignorePackages: true,
                pattern: {
                    "js": "never",
                    "ts": "never",
                    "d": "always"
                }
            }],

            "import/no-extraneous-dependencies": ["error", {
                devDependencies: true,
                optionalDependencies: true,
                peerDependencies: true,
            }],

            "no-console": ["error"],

            "no-restricted-imports": ["error", {
                paths: ["dayjs", "fs", "moment-timezone"],
                patterns: [
                    {
                        group: ["src/**"],
                        message: "Use absolute imports instead of relative imports"
                    }
                ]
            }]
        },
    }]);
