# @conterra/reactivity-core

## v0.5.0

-   Update dependencies

## v0.4.0

-   Add support for cleanup functions returned from watch callbacks.
-   Rename a few types (`EffectFunc` -> `EffectCallback`, `EffectCleanupFn` -> `CleanupFunc`)

## v0.3.2

-   Switch to esbuild for building js code. There should be no difference to users of this package.

## v0.3.1

-   Fix clean up of async effects / syncEffectOnce

## v0.3.0

-   Rename `isReactive()` to `isReadonlyReactive()`
-   Rename `isWritableReactive()` to `isReactive()`
-   Ensure `watch()` / `effect` and their sync variants behave consistently when errors are thrown from callbacks
-   Fix typings in `reactiveStruct` for union types

## v0.2.0

-   New feature: `reactiveStruct`, a utility to create simple reactive classes.
-   Fix: start the internal MessageChannel to deliver async messages

## v0.1.0

-   Initial release
