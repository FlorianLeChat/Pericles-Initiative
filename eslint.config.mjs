import eslint from "@eslint/js";
import tslint from "typescript-eslint";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";
import sveltelint from "eslint-plugin-svelte";
import svelteConfig from "./svelte.config.js";
import { defineConfig } from "eslint/config";

export default defineConfig(
    {
        ignores: [ "**/app.d.ts", ".svelte-kit/**", "build/**" ]
    },
    eslint.configs.recommended,
    tslint.configs.strict,
    tslint.configs.stylistic,
    stylistic.configs.recommended,
    sveltelint.configs.recommended,
    {
        plugins: {
            "@stylistic": stylistic
        },
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser
            },
            parserOptions: {
                parser: tslint.parser,
                svelteConfig,
                projectService: true,
                extraFileExtensions: [ ".svelte" ]
            }
        },
        rules: {
            "no-shadow": "off",
            "camelcase": [
                "error",
                {
                    properties: "never",
                    ignoreImports: true,
                    ignoreDestructuring: false
                }
            ],
            "no-unused-vars": "off",
            "no-param-reassign": [
                "error",
                {
                    props: false
                }
            ],

            "@stylistic/semi": [ "error", "always" ],
            "@stylistic/indent": [ "error", 4 ],
            "@stylistic/quotes": [ "error", "double" ],
            "@stylistic/brace-style": [
                "error",
                "allman",
                {
                    allowSingleLine: true
                }
            ],
            "@stylistic/arrow-parens": [ "error", "always" ],
            "@stylistic/comma-dangle": [
                "error",
                {
                    arrays: "never",
                    objects: "never",
                    imports: "never",
                    exports: "never",
                    functions: "never",
                    importAttributes: "never",
                    dynamicImports: "never"
                }
            ],
            "@stylistic/object-curly-newline": [
                "error",
                {
                    ImportDeclaration: {
                        minProperties: 0
                    }
                }
            ],
            "@stylistic/comma-style": [ "error", "last" ],
            "@stylistic/space-in-parens": [ "error", "always" ],
            "@stylistic/linebreak-style": [ "error", "unix" ],
            "@stylistic/array-bracket-spacing": [ "error", "always" ],
            "@stylistic/template-curly-spacing": [ "error", "always" ],
            "@stylistic/member-delimiter-style": [
                "error",
                {
                    overrides: {
                        interface: {
                            multiline: {
                                delimiter: "semi",
                                requireLast: true
                            }
                        }
                    }
                }
            ],
            "@stylistic/computed-property-spacing": [ "error", "always" ],

            "svelte/no-at-html-tags": "off"
        }
    },
    {
        // The service worker is excluded from the application's `tsconfig.json`,
        // since `lib.dom` and `lib.webworker` cannot share a program. Without this,
        // the project service finds no configuration covering it and refuses to
        // parse it at all.
        files: [ "src/service-worker.ts" ],
        languageOptions: {
            globals: {
                ...globals.serviceworker
            },
            parserOptions: {
                project: "./tsconfig.worker.json",
                projectService: false
            }
        }
    }
);
