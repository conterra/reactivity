# @conterra/reactivity-core

## v0.4.2

-   Fix `reactiveArray.splice()`: new elements could not be inserted.

## v0.4.1

Improved `watch` ergonomics:

-   Introduce two new variants of `watch`: `watchValue` and `syncWatchValue`.
    These variants support returning a single value from the selector instead of an array of values.
    They behave the same as the existing `watch` functions in all other regards.
-   All versions of `watch` now also pass the previous values to the callback (as second argument).
-   Add support for a custom `equal` parameter.
    This can be used to skip callback invocations if the new value can be considered equal to the old one.

Other changes:

-   Add a new helper function `nextTick` to wait for the execution of pending asynchronous callbacks.
    This can be useful in tests.
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
