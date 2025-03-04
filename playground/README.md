# Playground

A simple playground to test the reactivity package together with a UI framework (Vue in this case).

Contains a simple integration to use reactive values from Vue (`useReactiveSnapshot`).
For the "real" test application, see `Playground.vue` and `TodosModel.ts` and their interaction.

## Start playground web app

Before you start the development server for the first time, ensure that the package `@conterra/reactivity-core` (in packages/reactivity-core) has been built at least once:

```bash
# from project root
$ cd packages/reactivity-core
$ pnpm build
```

Then, start the development server:

```bash
# in this directory
$ pnpm dev
```

You can change files in this directory and instantly see the changes reflected in the browser (hot reloading).
If you edit the source code of `reactivity-core`, you must build it again to see the changes in browser.
The simplest way to to that is to start the development mode of `reactivity-core` as well; it will continuously rebuild the package on change:

```bash
# from project root
$ cd packages/reactivity-core
$ pnpm dev
```

## Run local scripts

For instance to test example snippets:

- Create a file called `test.ts`, insert code
- Then run `pnpm tsx test.ts` from this directory to run the file
