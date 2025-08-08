// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import headers from "eslint-plugin-headers";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...pluginVue.configs["flat/recommended"],
    eslintConfigPrettier,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        }
    },
    {
        plugins: {
            headers
        },

        rules: {
            "quotes": [
                "error",
                "double",
                {
                    avoidEscape: true,
                    allowTemplateLiterals: true
                }
            ],
            "semi": ["error", "always"],
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    "args": "all",
                    "argsIgnorePattern": "^_",
                    "caughtErrors": "all",
                    "caughtErrorsIgnorePattern": "^_",
                    "destructuredArrayIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "ignoreRestSiblings": true
                }
            ],
            "@typescript-eslint/no-deprecated": "warn",

            // Needed for side effects with signals
            "@typescript-eslint/no-unused-expressions": "off",

            "headers/header-format": [
                "error",
                {
                    source: "string",
                    content:
                        "SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)\n" +
                        "SPDX-License-Identifier: Apache-2.0",
                    style: "line"
                }
            ]
        }
    },
    {
        files: ["**/*.test.*"],
        rules: {
            // Allow non-null assertions and any casts in test files
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-explicit-any": "off"
        }
    },
    {
        files: ["**/*.cjs"],
        languageOptions: {
            globals: {
                module: "writable"
            }
        }
    },
    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: {
                parser: "@typescript-eslint/parser"
            },
            globals: {
                "console": "readonly"
            }
        },
        rules: {
            "vue/multi-word-component-names": "off"
        }
    },
    {
        ignores: ["**/node_modules", "**/dist"]
    },
    {
        files: ["**/*.{js,cjs,mjs,vue}"],
        extends: [tseslint.configs.disableTypeChecked]
    }
);
