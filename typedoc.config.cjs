// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
// See https://typedoc.org/options/
module.exports = {
    name: "Reactive APIs",
    readme: "none",
    out: "dist/docs",
    entryPointStrategy: "packages",
    entryPoints: ["./packages/reactivity-core", "./packages/reactivity-events"],
    skipErrorChecking: true,
    validation: {
        notExported: false,
        invalidLink: true,
        notDocumented: true
    }
};
