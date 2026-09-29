# AGENTS.md

Framework-agnostic TypeScript reactive library published under `@conterra/` scope. pnpm monorepo with two publishable packages and a private playground app.

## Requirements

- Node >= 24
- pnpm 11.1.0 (pinned via `packageManager` field — use exactly this version)

## Monorepo layout

```
packages/reactivity-core/     @conterra/reactivity-core
packages/reactivity-events/   @conterra/reactivity-events  (depends on reactivity-core)
playground/                   private Vue 3 demo (not published)
```

`pnpm-workspace.yaml` sets `linkWorkspacePackages: false`. Always use `workspace:*` or `workspace:^` explicitly; local packages are never auto-linked.

## Key commands

```bash
pnpm install               # install all deps
pnpm build                 # build all packages (recursive)
pnpm test                  # run all tests (vitest)
pnpm check-types           # tsc noEmit across all packages
pnpm lint                  # oxlint .
pnpm lint:fix              # oxlint . --fix
pnpm fmt                   # format all files in place (oxfmt)
pnpm fmt:check             # check formatting without writing
pnpm clean                 # remove all dist/ dirs
pnpm dev                   # watch-build all packages in parallel
pnpm build-docs            # typedoc → dist/docs
```

### Focused runs

```bash
# test one package
pnpm test packages/reactivity-core

# test one file
pnpm test packages/reactivity-core/src/signals.test.ts

# type-check only
pnpm check-types

# lint only
pnpm lint
```

## Pre-commit hook

Set `NO_VERIFY=1` to skip (only appropriate for release commits or non-code changes). `CI=1` causes vitest to fail if any test uses `.only`.

## Per-package build

Each package runs two steps:

```bash
pnpm run build:types   # tsc → dist/*.d.ts only
pnpm run build:js      # esbuild → dist/index.js (ESM, external packages, source maps)
```

`esbuild` defines `import.meta.env.VITEST=false` to tree-shake vitest code from production builds.

## File header requirement

**Every source file must begin with these two lines** (enforced by `@tony.ganchev/eslint-plugin-header`, loaded as an oxlint JS plugin; `pnpm lint` fails without them):

```ts
// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
```

## Lint / format conventions

Linting uses oxlint (`oxlint.config.ts`), formatting uses oxfmt (`oxfmt.config.ts`). ESLint and Prettier are not used; the only eslint-related dependency is the header plugin.

- Double quotes, semicolons, 4-space indent, no trailing commas, `printWidth: 100`
- `no-unused-expressions` is **disabled** — signal reads like `someSignal.value;` are intentional side effects
- Test files (`**/*.test.*`, `**/test/**`): `typescript/no-explicit-any` and `no-await-in-loop` are off
- `vitest/expect-expect` treats `testWatch` as an assertion helper

## TypeScript

- Base: `tsconfig.base.json` — `moduleResolution: bundler`, `isolatedModules: true`, `noUncheckedIndexedAccess: true`, target ES2022
- Root `tsconfig.json` (noEmit) covers `packages/`, `playground/`, and `vitest.config.ts`
- Each package has `tsconfig.prod.json` for emit (excludes test files)

## Testing quirk

`packages/reactivity-core/vitest.config.ts` sets `execArgv: ["--expose-gc"]`. This is required for `FinalizationRegistry`-based tests. Do not remove it.

## Versioning / releases

All `@conterra/*` packages are **fixed-versioned** (a changeset for one bumps all). Managed via `@changesets/cli`. `baseBranch: main`. Release flow: add changeset → merge → Changesets bot opens release PR → merge to publish.
