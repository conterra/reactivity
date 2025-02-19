# @conterra/reactivity-core

## v0.5.0 (TBD)

- Introduce `ReactiveGetter<T>` to mark functions used to compute reactive values.
  This is used in the signatures of `computed` and `*watch*`.
  `ReactiveGetter<T>` is a simply type alias for `() => T`.
- Use `Object.is` instead of `===` for cleaner comparisons (e.g. around NaN)
    - Note that this does not resolve all issues around NaN: a computed signal returning `NaN` will still be considered a change.
      This is due to the underlying implementation in @preact/signals-core, which compares values using `===`.
- Relax type signature of `watch` and `syncWatch`: the array of values is no longer `readonly` (but it still must not be modified at runtime).
- Remove deprecated `syncEffectOnce`

## v0.4.4

- Introduce new `ctx` parameter to `watch` and `effect` and variants.
  `ctx` can be used to cancel the watch or effect from its own callback, even in its initial execution.
  In the following examples, the `handle` has not been returned yet, so calling `.destroy()` on it would not work.

    `effect`:

    ```js
    const handle = effect((ctx) => {
        // Would throw an error if called in the effect's first execution. `handle` has not been returned yet!
        // handle.destroy();

        // This will always work:
        ctx.destroy();
    });
    ```

    `watch`:

    ```js
    const count = reactive(0);
    const handle = watchValue(
        () => count.value,
        (count, _oldCount, ctx) => {
            if (count == 0) {
                // handle.destroy() -> error
                ctx.destroy();
            }
        },
        {
            immediate: true
        }
    );
    ```

- Use the browser's [`reportError`](https://developer.mozilla.org/en-US/docs/Web/API/Window/reportError) function (when available) to report errors from async callback executions.

## v0.4.3

- Introduce `synchronized`, a new kind of signal designed to integrate foreign data sources.
- Add missing `forEach` method to `ReactiveSet` and `ReactiveMap`.
- Deprecate `syncEffectOnce` (should not be needed any longer).
- Refactor the implementation of `watch`, `watchValue` and `effect` (async variants). This should not have any impact on users of the library.

## v0.4.2

- Fix `reactiveArray.splice()`: new elements could not be inserted.

## v0.4.1

Improved `watch` ergonomics:

- Introduce two new variants of `watch`: `watchValue` and `syncWatchValue`.
  These variants support returning a single value from the selector instead of an array of values.
  They behave the same as the existing `watch` functions in all other regards.
- All versions of `watch` now also pass the previous values to the callback (as second argument).
- Add support for a custom `equal` parameter.
  This can be used to skip callback invocations if the new value can be considered equal to the old one.

Other changes:

- Add a new helper function `nextTick` to wait for the execution of pending asynchronous callbacks.
  This can be useful in tests.
- Update dependencies

## v0.4.0

- Add support for cleanup functions returned from watch callbacks.
- Rename a few types (`EffectFunc` -> `EffectCallback`, `EffectCleanupFn` -> `CleanupFunc`)

## v0.3.2

- Switch to esbuild for building js code. There should be no difference to users of this package.

## v0.3.1

- Fix clean up of async effects / syncEffectOnce

## v0.3.0

- Rename `isReactive()` to `isReadonlyReactive()`
- Rename `isWritableReactive()` to `isReactive()`
- Ensure `watch()` / `effect` and their sync variants behave consistently when errors are thrown from callbacks
- Fix typings in `reactiveStruct` for union types

## v0.2.0

- New feature: `reactiveStruct`, a utility to create simple reactive classes.
- Fix: start the internal MessageChannel to deliver async messages

## v0.1.0

- Initial release
