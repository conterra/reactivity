// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import {
    CleanupHandle,
    ReactiveGetter,
    WatchCallback,
    WatchImmediateCallback,
    WatchOptions
} from "../types";
import { shallowEqual } from "../utils/equality";
import { createWatcher } from "./Watcher";

/**
 * Watches a single reactive value and executes a callback whenever that value changes.
 *
 * This function is the synchronous variant of {@link watchValue}.
 * It will re-execute after every fine grained change, even if those changes occur in immediate succession.
 * `syncWatchValue` should therefore be considered a low level primitive, for most use cases {@link watchValue} should be the right tool instead.
 *
 * Example:
 *
 * ```ts
 * import { reactive, syncWatchValue } from "@conterra/reactivity-core";
 *
 * const v1 = reactive(1);
 * const v2 = reactive(2);
 *
 * // Executes whenever the _sum_ of the two values changes.
 * syncWatchValue(() => v1.value + v2.value, (sum) => {
 *     console.log("new sum", sum);
 * });
 * ```
 *
 * `syncWatchValue` returns a handle that can be used to unsubscribe from changes.
 * That handle's `destroy()` function should be called to stop watching when you are no longer interested in updates:
 *
 * ```js
 * const handle = syncWatchValue(() => someReactive.value, () => {
 *   // ...
 * });
 * // later:
 * handle.destroy();
 * ```
 *
 * > NOTE: You must *not* modify the parameters that get passed into `callback`.
 *
 * @param selector a function that returns the value to watch.
 * @param callback a function that will be executed whenever the watched value changes.
 * @param options additional options.
 *
 * @deprecated Use {@link watchValue} with option `dispatch: "sync"` instead.
 *
 * @group Watching
 */
export function syncWatchValue<T>(
    selector: ReactiveGetter<T>,
    callback: WatchCallback<T>,
    options?: Omit<WatchOptions<T>, "dispatch"> & { immediate?: false }
): CleanupHandle;

/**
 * This overload is used when `immediate` is not set to `false`.
 *
 * @param selector a function that returns the value to watch.
 * @param callback a function that will be executed whenever the watched value changes.
 * @param options additional options.
 *
 * @deprecated Use {@link watchValue} with option `dispatch: "sync"` instead.
 *
 * @group Watching
 */
export function syncWatchValue<T>(
    selector: ReactiveGetter<T>,
    callback: WatchImmediateCallback<T>,
    options?: Omit<WatchOptions<T>, "dispatch">
): CleanupHandle;

/**
 * @deprecated Use {@link watchValue} with option `dispatch: "sync"` instead.
 */
export function syncWatchValue<T>(
    selector: ReactiveGetter<T>,
    callback: WatchImmediateCallback<T>,
    options?: Omit<WatchOptions<T>, "dispatch">
): CleanupHandle {
    return watchValue(selector, callback, {
        ...options,
        dispatch: "sync"
    });
}

/**
 * Watches reactive values and executes a callback whenever those values change.
 *
 * This function is the synchronous variant of {@link watch}.
 * It will re-execute after every fine grained change, even if those changes occur in immediate succession.
 * `syncWatch` should therefore be considered a low level primitive, for most use cases {@link watch} should be the right tool instead.
 *
 * Example:
 *
 * ```ts
 * const r1 = reactive(1);
 * const r2 = reactive(2);
 * syncWatch(
 *     // Selector: reactive code (may be complex, but should be fast).
 *     () => [r1.value, r2.value, r1.value + r2.value],
 *
 *     // Callback: only executes if selector returns different values.
 *     ([v1, v2, v3]) => {
 *         console.log(v1, v2, v3);
 *     }
 * );
 * ```
 *
 * `syncWatch` returns a handle that can be used to unsubscribe from changes.
 * That handle's `destroy()` function should be called to stop watching when you are no longer interested in updates:
 *
 * ```js
 * const handle = syncWatch(() => [someReactive.value], () => {
 *   // ...
 * });
 * // later:
 * handle.destroy();
 * ```
 *
 * > NOTE: You must *not* modify the parameters that get passed into `callback`.
 *
 * @param selector a function that returns the values to watch.
 * @param callback a function that will be executed whenever the watched values changed.
 * @param options additional options.
 *
 * @deprecated Use {@link watch} with option `dispatch: "sync"` instead.
 *
 * @group Watching
 */
export function syncWatch<const Values extends unknown[]>(
    selector: ReactiveGetter<Values>,
    callback: WatchCallback<Values>,
    options?: Omit<WatchOptions<Values>, "dispatch"> & { immediate?: false }
): CleanupHandle;

/**
 * This overload is used when `immediate` is not set to `false`.
 *
 * @param selector a function that returns the values to watch.
 * @param callback a function that will be executed whenever the watched values changed.
 * @param options additional options.
 *
 * @deprecated Use {@link watch} with option `dispatch: "sync"` instead.
 *
 * @group Watching
 */
export function syncWatch<const Values extends unknown[]>(
    selector: ReactiveGetter<Values>,
    callback: WatchImmediateCallback<Values>,
    options?: Omit<WatchOptions<Values>, "dispatch">
): CleanupHandle;

/**
 * @deprecated Use {@link watch} with option `dispatch: "sync"` instead.
 */
export function syncWatch<const Values extends unknown[]>(
    selector: ReactiveGetter<Values>,
    callback: WatchImmediateCallback<Values>,
    options?: Omit<WatchOptions<Values>, "dispatch">
): CleanupHandle {
    return watch(selector, callback, {
        equal: shallowEqual,
        ...options,
        dispatch: "sync"
    });
}

/**
 * Watches a single reactive value and executes a callback whenever that value changes.
 *
 * `watchValue` works like this:
 *
 * 1. The `selector` is a tracked function that shall return a value.
 *    This value is usually obtained by accessing one or more reactive objects.
 * 2. Whenever the value returned by `selector` changes, `callback`
 *    will be executed with the new value (the old value is available as well).
 *    The body of `callback` is not reactive.
 *
 * The values returned by the selector are compared using object identity by default (i.e. `Object.is`).
 * Note that you can provide a custom `equal` function to change this behavior.
 *
 * Example:
 *
 * ```ts
 * import { reactive, watchValue } from "@conterra/reactivity-core";
 *
 * const v1 = reactive(1);
 * const v2 = reactive(2);
 *
 * // Executes whenever the _sum_ of the two values changes.
 * watchValue(() => v1.value + v2.value, (sum) => {
 *     console.log("new sum", sum);
 * });
 * ```
 *
 * `watchValue` returns a handle that can be used to unsubscribe from changes.
 * That handle's `destroy()` function should be called to stop watching when you are no longer interested in updates:
 *
 * ```js
 * const handle = watchValue(() => someReactive.value, () => {
 *   // ...
 * });
 * // later:
 * handle.destroy();
 * ```
 *
 * > NOTE: You must *not* modify the parameters that get passed into `callback`.
 *
 * > NOTE: This function will slightly defer re-executions of the given `callback`.
 * > In other words, the re-execution does not happen _immediately_ after a reactive dependency changed.
 * > This is done to avoid redundant executions as a result of many fine-grained changes.
 * >
 * > If you need more control, take a look at {@link syncWatchValue}.
 *
 * @param selector a function that returns the value to watch.
 * @param callback a function that will be executed whenever the watched value changes.
 * @param options additional options.
 */
export function watchValue<T>(
    selector: ReactiveGetter<T>,
    callback: WatchCallback<T>,
    options?: WatchOptions<T> & { immediate?: false }
): CleanupHandle;

/**
 * This overload is used when `immediate` is not set to `false`.
 *
 * @param selector a function that returns the value to watch.
 * @param callback a function that will be executed whenever the watched value changed.
 * @param options additional options.
 * @group Watching
 */
export function watchValue<T>(
    selector: ReactiveGetter<T>,
    callback: WatchImmediateCallback<T>,
    options?: WatchOptions<T>
): CleanupHandle;
export function watchValue<T>(
    selector: ReactiveGetter<T>,
    callback: WatchImmediateCallback<T>,
    options?: WatchOptions<T>
): CleanupHandle {
    return createWatcher(selector, callback, options);
}

/**
 * Watches reactive values and executes a callback whenever those values change.
 *
 * `watch` works like this:
 *
 * 1. The `selector` is a tracked function that shall return an array of values.
 *    Those values are usually obtained by accessing one or more reactive objects.
 * 2. Whenever the values inside the array returned by `selector` change, `callback`
 *    will be executed with those values (the old values are available as well).
 *    The body of `callback` is not reactive.
 *
 * The arrays returned by the selector are compared using shallow equality by default: the callback
 * runs if the length of the array changes or if one of its entries has a different identity.
 * Note that you can provide a custom `equal` function to change this behavior.
 *
 * Example:
 *
 * ```ts
 * const r1 = reactive(1);
 * const r2 = reactive(2);
 * watch(
 *     // Selector: reactive code (may be complex, but should be fast).
 *     () => [r1.value, r2.value, r1.value + r2.value],
 *
 *     // Callback: only executes if selector returns different values.
 *     ([v1, v2, v3]) => {
 *         console.log(v1, v2, v3);
 *     }
 * );
 * ```
 *
 * `watch` returns a handle that can be used to unsubscribe from changes.
 * That handle's `destroy()` function should be called to stop watching when you are no longer interested in updates:
 *
 * ```js
 * const handle = watch(() => [someReactive.value], () => {
 *   // ...
 * });
 * // later:
 * handle.destroy();
 * ```
 *
 * > NOTE: You must *not* modify the parameters that get passed into `callback`.
 *
 * > NOTE: This function will slightly defer re-executions of the given `callback`.
 * > In other words, the re-execution does not happen _immediately_ after a reactive dependency changed.
 * > This is done to avoid redundant executions as a result of many fine-grained changes.
 * >
 * > If you need more control, take a look at {@link syncWatch}.
 *
 * @param selector a function that returns the values to watch.
 * @param callback a function that will be executed whenever the watched values changed.
 * @param options additional options.
 * @group Watching
 */
export function watch<const Values extends unknown[]>(
    selector: ReactiveGetter<Values>,
    callback: WatchCallback<Values>,
    options?: WatchOptions<Values> & { immediate?: false }
): CleanupHandle;

/**
 * This overload is used when `immediate` is not set to `false`.
 *
 * @param selector a function that returns the values to watch.
 * @param callback a function that will be executed whenever the watched values changed.
 * @param options additional options.
 * @group Watching
 */
export function watch<const Values extends unknown[]>(
    selector: ReactiveGetter<Values>,
    callback: WatchImmediateCallback<Values>,
    options?: WatchOptions<Values>
): CleanupHandle;
export function watch<const Values extends unknown[]>(
    selector: ReactiveGetter<Values>,
    callback: WatchImmediateCallback<Values>,
    options?: WatchOptions<Values>
): CleanupHandle {
    return createWatcher(selector, callback, {
        equal: shallowEqual,
        ...options
    });
}
