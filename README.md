# Reactivity

Framework agnostic library for building reactive applications.

> [!WARNING]
> The APIs implemented in this repository are highly experimental and subject to change.

## Setup

Install [pnpm](https://pnpm.io/), for example by running `npm install -g pnpm`.

Install dependencies:

```bash
$ pnpm install
```

## Tests

```bash
# Runs all tests
$ pnpm test
```

```bash
$ cd packages/reactivity-core
$ pnpm test # watch mode
```

Watch TypeScript errors:

```bash
$ pnpm watch-types
```

## Playground

You can try this library together with Vue3 in the `playground` directory.
See [README](./playground/README.md) for more details.

## Releasing

The release process is semi-automatic at this time.
To prepare for a new release:

1. Set the version of `@conterra/reactivity-core` (in `packages/reactivity-core`) to the desired new version.
2. Ensure the `CHANGELOG.md` in that package is up to date.
3. Commit and push your changes.
4. Trigger the [Build Action](https://github.com/conterra/reactivity/actions/workflows/build.yml) (via _run workflow_) and tick the **RELEASE** checkbox.
   This action will build the package and publish it to npm.
