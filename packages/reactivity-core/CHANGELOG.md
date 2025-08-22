# @conterra/reactivity-core

## 0.8.0

### Minor Changes

- 8667eff: Deprecate `syncEffect()`, `syncWatch()` and `syncWatchValue()`.
  Use `effect()`, `watch()` and `watchValue()` with the new `dispatch` option instead.
- e7690b7: `synchronized`: add support for the `equal` option
- 8667eff: Introduce `dispatch` option to `effect()`, `watch()` and `watchValue`:
    - `"async"`: callbacks are executed in the next major task (the default, and the existing behavior)
    - `"sync"`: callbacks are executed synchronously (like `syncEffect` etc.)

    Example:

    ```ts
    import { effect, reactive } from "@conterra/reactivity-core";

    const signal = reactive(0);

    effect(
        () => {
            console.log(signal.value);
        },
        { dispatch: "sync" } // default: "async"
    );

    signal.value = 1; // effect triggers immediately
    ```

- e7690b7: Change implementation of `synchronized` signals.

    When a synchronized signal is being accessed without it currently being watched,
    the package will now briefly subscribe to that signal's source to be notified about changes.
    The current value is now being cached more aggressively while the underlying data source does _not_ report any changes.

### Patch Changes

- 6ee0459: Update `@preact/signals-core` to 1.12.0
- 7f6e38d: Ensure `isReactive()` returns true for linked signals.
- 29fc994: Refactor implementation of syncEffect's context argument using the dispose() feature exposed by recent @preact/signals-core

## 0.7.0

### Minor Changes

- 546f3ec: Add two new options to all signal types: `watched` and `unwatched`.
    - `watched()` is called when the _first_ watcher starts watching the signal.
      This can be used, for example, to setup some background task.
    - `unwatched()` is called when the _last_ watcher stops watching the signal.
      This can be used to clean up any resources created in `watched()`.

    Example:

    ```ts
    const signal = reactive(123, {
        watched: () => {
            console.log("Signal is now being watched");
        },
        unwatched: () => {
            console.log("Signal is no longer being watched");
        }
    });
    ```

### Patch Changes

- 546f3ec: Reimplement `synchronized()` based on preact signal's watched/unwatched callbacks instead of patching the signal's internals.
- e704f30: Bump dependency `@preact/signals-core` to 1.9.0

## 0.6.0

### Minor Changes

- 0baa4f2: Implement `linked` signals.

    Linked signals are derived from a _source_, but may change freely while _source_ remains the same.

    **Example:**

    ```ts
    import { reactive, linked } from "@conterra/reactivity-core";

    const options = reactive(["a", "b", "c"]);
    const currentOption = linked(() => options.value[0]); // default to first item

    console.log(currentOption.value); // "a"

    currentOption.value = "b";
    console.log(currentOption.value); // "b"

    options.value = ["x", "y", "z"];
    console.log(currentOption.value); // reset to "x"
    ```

    For more information, see the new section in `README.md`.

## 0.5.0

### Minor Changes

- 0e9bd35: Use `Object.is` instead of `===` for cleaner comparisons (e.g. around NaN).

    Note that this does not resolve all issues around NaN: a computed signal returning `NaN` will still be considered a change.
    This is due to the underlying implementation in `@preact/signals-core`, which compares values using `===`.

- 0e9bd35: Remove deprecated `syncEffectOnce` function.

### Patch Changes

- 0e9bd35: Relax type signature of `watch` and `syncWatch`: the array of values is no longer `readonly` (but it still must not be modified at runtime).
- 0e9bd35: Introduce `ReactiveGetter<T>` type to mark functions used to compute reactive values.
  This is used in the signatures of `computed` and `*watch*`.
  `ReactiveGetter<T>` is a simple type alias for `() => T`.
- 0e9bd35: Export `reportCallbackError` and `dispatchAsyncCallback` from this package.

## 0.4.4

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

## 0.4.3

- Introduce `synchronized`, a new kind of signal designed to integrate foreign data sources.
- Add missing `forEach` method to `ReactiveSet` and `ReactiveMap`.
- Deprecate `syncEffectOnce` (should not be needed any longer).
- Refactor the implementation of `watch`, `watchValue` and `effect` (async variants). This should not have any impact on users of the library.

## 0.4.2

- Fix `reactiveArray.splice()`: new elements could not be inserted.

## 0.4.1

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

## 0.4.0

- Add support for cleanup functions returned from watch callbacks.
- Rename a few types (`EffectFunc` -> `EffectCallback`, `EffectCleanupFn` -> `CleanupFunc`)

## 0.3.2

- Switch to esbuild for building js code. There should be no difference to users of this package.

## 0.3.1

- Fix clean up of async effects / syncEffectOnce

## 0.3.0

- Rename `isReactive()` to `isReadonlyReactive()`
- Rename `isWritableReactive()` to `isReactive()`
- Ensure `watch()` / `effect` and their sync variants behave consistently when errors are thrown from callbacks
- Fix typings in `reactiveStruct` for union types

## 0.2.0

- New feature: `reactiveStruct`, a utility to create simple reactive classes.
- Fix: start the internal MessageChannel to deliver async messages

## 0.1.0

- Initial release
