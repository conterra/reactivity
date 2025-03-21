# Reactivity

Framework agnostic library for building reactive applications.

> [!WARNING]
> The APIs implemented in this repository are still under active development and may change based on feedback.

## Reactivity-API

Packages developed in this repository:

- [`@conterra/reactivity-core`](./packages/reactivity-core): Core reactivity library.
- [`@conterra/reactivity-events`](./packages/reactivity-events): Emitting and subscribing to events.

View API docs:

- [Latest release](https://conterra.github.io/reactivity/latest/)
- [Current main brach](https://conterra.github.io/reactivity/dev/)

## Setup

Install [pnpm](https://pnpm.io/), for example by running `npm install -g pnpm`.

Install dependencies:

```bash
$ pnpm install
```

Build all packages:

```bash
$ pnpm build
```

## Tests

```bash
# Runs all tests
$ pnpm test
```

```bash
# Runs tests for a specific package (or file path)
$ pnpm test packages/reactivity-core
```

Watch TypeScript errors:

```bash
$ pnpm watch-types
```

When developing features across package boundaries, use the `dev` script in your dependencies.
This way, they will be rebuilt automatically:

```bash
$ cd packages/reactivity-core
$ pnpm dev
```

## Playground

You can try this library together with Vue3 in the `playground` directory.
See [README](./playground/README.md) for more details.

## Render typedoc

Build typedoc output (to `dist/docs`).

```bash
$ pnpm build-docs
```

Then, use any local web server to serve the documentation.
The following example uses [serve](https://www.npmjs.com/package/serve):

```bash
$ pnpm install -g serve # global installation; only necessary once
$ serve dist/docs
```

## Releasing

This repository uses [Changesets](https://github.com/changesets/changesets) to manage changes.
Before releasing, make sure that all pending changes are properly documented using changeset files.

Then, review and merge the current release pull request.
The commit created by the merge will in turn publish the packages to npm.

## License

Apache-2.0 (see `LICENSE` file)
