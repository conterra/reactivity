// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0

import { defineConfig, type OxfmtConfig } from "oxfmt";

export default defineConfig({
    semi: true,
    tabWidth: 4,
    trailingComma: "none",
    singleQuote: false,
    quoteProps: "preserve",
    printWidth: 100,
    sortPackageJson: true,
    sortImports: {
        newlinesBetween: false
    },
    ignorePatterns: ["**/dist", "**/node_modules", "**/.*", "pnpm-lock.yaml"],
    overrides: [
        {
            files: ["**/*.yaml", "**/*.yml"],
            options: {
                tabWidth: 2
            }
        }
    ]
} satisfies OxfmtConfig);
