// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import esbuild from "rollup-plugin-esbuild";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {},
    plugins: [
        // for decorators
        esbuild()
    ]
});
