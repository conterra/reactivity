import { computed as rawComputed, effect as rawEffect } from "@preact/signals-core";
import { untracked } from "./ReactiveImpl";

// Import required for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { effect, watch } from "./async";

/**
 * A handle returned by various functions to dispose of a resource,
 * such as a watcher or an effect.
 *
 * @group Watching
 */
export interface CleanupHandle {
    /**
     * Performs the cleanup action associated with the resource.
     */
    destroy(): void;
}

/**
 * A cleanup function returned from an effect.
 *
 * This function will be invoked before the effect is triggered again,
 * or when the effect is disposed.
 *
 * @group Watching
 */
export type EffectCleanupFn = () => void;

/**
 * The body of an effect.
 *
 * Instructions in this function are tracked: when any of its reactive
 * dependencies change, the effect will be triggered again.
 *
 * @group Watching
 */
export type EffectFunc = (() => void) | (() => EffectCleanupFn);

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
export function syncEffect(callback: EffectFunc): CleanupHandle {
    const destroy = rawEffect(callback);
    return { destroy };
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
 * @group Watching
 */
export function syncEffectOnce(callback: EffectFunc, onInvalidate: () => void): CleanupHandle {
    let execution = 0;
    let syncExecution = true;
    let handle: CleanupHandle | undefined = undefined;
    handle = syncEffect(() => {
        const thisExecution = execution++;
        if (thisExecution === 0) {
            callback();
        } else if (thisExecution === 1) {
            untracked(() => {
                try {
                    onInvalidate();
                } finally {
                    if (syncExecution) {
                        Promise.resolve().then(() => handle?.destroy());
                    } else {
                        handle?.destroy();
                    }
                }
            });
        }
    });
    syncExecution = false;
    return handle;
}

/**
 * Options that can be passed to {@link syncWatch}.
 *
 * @group Watching
 */
export interface WatchOptions {
    /**
     * Whether to call the watch callback once during setup.
     *
     * If this is `false`, the watch callback will only be invoked
     * after at least a single value changed.
     */
    immediate?: boolean;
}

/**
 * Watches reactive values and executes a callback whenever those values change.
 *
 * This function is the synchronous variant of {@link watch}.
 * It will re-execute after every fine grained change, even if they occur in immediate succession.
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
 * > NOTE: You must *not* modify the array that gets passed into `callback`.
 *
 * @group Watching
 */
export function syncWatch<const Values extends readonly unknown[]>(
    selector: () => Values,
    callback: (values: Values) => void,
    options?: WatchOptions
): CleanupHandle {
    const computedArgs = rawComputed(selector);
    const immediate = options?.immediate ?? false;
    let oldValues: Values | undefined;
    return syncEffect(() => {
        const currentValues = computedArgs.value; // Tracked
        untracked(() => {
            const execute =
                (!oldValues && immediate) || (oldValues && !shallowEqual(oldValues, currentValues));
            oldValues = currentValues;
            if (execute) {
                callback(currentValues);
            }
        });
    });
}

function shallowEqual(oldValue: readonly unknown[], newValue: readonly unknown[]): boolean {
    if (oldValue === newValue) {
        return true;
    }
    return oldValue.length === newValue.length && oldValue.every((v, i) => v === newValue[i]);
}
