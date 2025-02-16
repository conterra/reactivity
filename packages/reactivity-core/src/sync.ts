import { effect as rawEffect } from "@preact/signals-core";
import { untracked } from "./ReactiveImpl";
import {
    CleanupHandle,
    EffectCallback,
    EffectContext,
    WatchCallback,
    WatchImmediateCallback,
    WatchOptions
} from "./types";
import { shallowEqual } from "./utils/shallowEqual";
import { watchImpl } from "./watch";

// Import required for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { effect, watch, watchValue } from "./async";

/**
 * Runs the callback function and tracks its reactive dependencies.
 * Whenever one of those dependencies changes, the callback will be executed again.
 *
 * This function is the synchronous variant of {@link effect}.
 * It will re-execute after every fine grained change, even if they occur in immediate succession.
 * `syncEffect` should therefore be considered a low level primitive, for most use cases {@link effect} should be the right tool instead.
 *
 * Example:
 *
 * ```js
 * const count = reactive(0);
 * syncEffect(() => {
 *     console.log(count.value);
 * });
 * // Effect runs immediately, prints "0"
 *
 * count.value = 1; // Effect runs again, prints "1"
 * count.value = 2; // Effect runs again, prints "2"
 * ```
 *
 * `syncEffect` returns a handle that allows you to unsubscribe from changes.
 * That handle's `destroy()` function should be called in order to clean up the effect when you no longer need it,
 * otherwise the effect will keep running forever:
 *
 * ```js
 * const handle = syncEffect(() => {
 *     // ...
 * });
 * // later:
 * handle.destroy();
 * ```
 *
 * @group Watching
 */
export function syncEffect(callback: EffectCallback): CleanupHandle {
    let isDestroyed = false;
    let destroy: (() => void) | undefined = undefined;
    const context: EffectContext = {
        destroy() {
            if (isDestroyed) {
                return;
            }

            isDestroyed = true;
            destroy?.(); // undefined on effect's first run
        }
    };
    destroy = rawEffect(() => {
        return callback(context);
    });

    // Handle immediate self-destruction
    if (isDestroyed) {
        destroy();
    }
    return context;
}

/**
 * A variant of {@link syncEffect} that only executes the main `callback` once.
 *
 * As soon as one or more reactive dependencies of `callback` have changed, `onInvalidate` will be invoked.
 *
 * This gives users of this API the ability to listen for values that _might_ have changed without doing much work.
 * Typically, `onInvalidate` will be very cheap (e.g. schedule a new render).
 *
 * Note that `onInvalidate` will never be invoked more than once.
 *
 * @deprecated This function is no longer needed and will be removed in a future release.
 *
 * @group Watching
 */
export function syncEffectOnce(callback: EffectCallback, onInvalidate: () => void): CleanupHandle {
    let execution = 0;
    return syncEffect((ctx) => {
        const thisExecution = execution++;
        if (thisExecution === 0) {
            return callback(ctx);
        } else if (thisExecution === 1) {
            untracked(() => {
                try {
                    onInvalidate();
                } finally {
                    ctx.destroy();
                }
            });
        }
    });
}

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
 * @group Watching
 */
export function syncWatchValue<T>(
    selector: () => T,
    callback: WatchCallback<T>,
    options?: WatchOptions<T> & { immediate?: false }
): CleanupHandle;
/**
 * This overload is used when `immediate` is not set to `false`.
 *
 * @param selector a function that returns the value to watch.
 * @param callback a function that will be executed whenever the watched value changes.
 * @param options additional options.
 * @group Watching
 */
export function syncWatchValue<T>(
    selector: () => T,
    callback: WatchImmediateCallback<T>,
    options?: WatchOptions<T>
): CleanupHandle;
export function syncWatchValue<T>(
    selector: () => T,
    callback: WatchImmediateCallback<T>,
    options?: WatchOptions<T>
): CleanupHandle {
    return watchImpl(syncEffect, selector, callback, options);
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
 * const handle = watch(() => [someReactive.value], () => {
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
 * @group Watching
 */
export function syncWatch<const Values extends readonly unknown[]>(
    selector: () => Values,
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
export function syncWatch<const Values extends readonly unknown[]>(
    selector: () => Values,
    callback: WatchImmediateCallback<Values>,
    options?: WatchOptions<Values>
): CleanupHandle;
export function syncWatch<const Values extends readonly unknown[]>(
    selector: () => Values,
    callback: WatchImmediateCallback<Values>,
    options?: WatchOptions<Values>
): CleanupHandle {
    return watchImpl(syncEffect, selector, callback, {
        equal: shallowEqual,
        ...options
    });
}
