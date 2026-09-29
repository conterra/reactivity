// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, type OxlintConfig } from "oxlint";

export default defineConfig({
    plugins: ["typescript", "eslint", "import", "oxc", "promise", "vitest", "vue"],
    jsPlugins: ["@tony.ganchev/eslint-plugin-header"],
    categories: {
        correctness: "error",
        perf: "warn"
    },
    env: {
        builtin: true,
        browser: true,
        node: true
    },
    ignorePatterns: ["**/dist", "**/node_modules", "**/.*"],
    options: {
        reportUnusedDisableDirectives: "error"
    },
    rules: {
        "no-array-constructor": "error",
        "no-case-declarations": "error",
        "no-empty": "error",
        "no-fallthrough": "error",
        "no-prototype-builtins": "error",
        "no-regex-spaces": "error",
        "no-var": "error",
        "import/no-duplicates": "error",
        "prefer-const": "error",
        "prefer-rest-params": "error",
        "prefer-spread": "error",
        "oxc/no-accumulating-spread": "warn",
        "oxc/no-this-in-exported-function": "error",

        // Needed for side effects with signals
        "no-unused-expressions": "off",

        // Prefix vars with "_" to silence this warning.
        "no-unused-vars": [
            "warn",
            {
                vars: "all",
                varsIgnorePattern: "^_",
                caughtErrors: "all",
                caughtErrorsIgnorePattern: "^_",
                args: "all",
                argsIgnorePattern: "^_",
                destructuredArrayIgnorePattern: "^_",
                ignoreRestSiblings: true
            }
        ],

        // Enforce copyright header on top of the file.
        "@tony.ganchev/header/header": [
            "error",
            {
                header: {
                    commentType: "line",
                    lines: [
                        " SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)",
                        " SPDX-License-Identifier: Apache-2.0"
                    ]
                },
                // Separate imports from license header
                trailingEmptyLines: {
                    minimum: 2
                }
            }
        ],

        // TypeScript rules
        "typescript/ban-ts-comment": "error",
        "typescript/no-empty-object-type": "off",
        "typescript/no-explicit-any": "error",
        "typescript/no-namespace": "error",
        "typescript/no-non-null-assertion": "error",
        "typescript/no-require-imports": "error",
        "typescript/no-this-alias": "error",
        "typescript/no-unnecessary-type-constraint": "error",
        "typescript/no-unsafe-function-type": "error",
        "typescript/triple-slash-reference": "error",

        // Vitest rules
        "vitest/expect-expect": [
            "error",
            {
                assertFunctionNames: ["expect", "testWatch"]
            }
        ],
        "vitest/no-commented-out-tests": "error",
        "vitest/require-mock-type-parameters": "off"
    },
    overrides: [
        {
            // Allow "as any" casts and sequential awaits in tests and test helpers.
            files: ["**/*.test.*", "**/test/**"],
            rules: {
                "typescript/no-explicit-any": "off",
                "typescript/no-non-null-assertion": "off",
                "no-await-in-loop": "off"
            }
        }
    ]
} satisfies OxlintConfig);
