import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs["flat/recommended"],
    eslintConfigPrettier,
    {
        rules: {
            "linebreak-style": ["error", "unix"],
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

            // Needed for side effects with signals
            "@typescript-eslint/no-unused-expressions": "off"
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
            }
        },
        rules: {
            "vue/multi-word-component-names": "off"
        }
    },
    {
        ignores: ["**/node_modules", "**/dist"]
    }
);
