// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
// See https://typedoc.org/options/
module.exports = {
    name: "Reactive APIs",
    readme: "none",
    out: "dist/docs",
    entryPointStrategy: "packages",
    entryPoints: ["./packages/reactivity-core"],
    skipErrorChecking: true,
    validation: {
        notExported: false,
        invalidLink: true,
        notDocumented: true
    }
};
