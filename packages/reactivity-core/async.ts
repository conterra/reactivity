import { untracked } from "./ReactiveImpl";
import {
    CleanupFunc,
    CleanupHandle,
    EffectCallback,
    WatchCallback,
    WatchImmediateCallback,
    WatchOptions
} from "./types";
import { reportTaskError } from "./utils/reportTaskError";
import { shallowEqual } from "./utils/shallowEqual";
import { TaskQueue } from "./utils/TaskQueue";
import { watchImpl } from "./watch";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { syncEffect, syncEffectOnce, syncWatch, syncWatchValue } from "./sync";

/**
 * Runs the callback function and tracks its reactive dependencies.
 * Whenever one of those dependencies changes, the callback will be executed again.
 *
 * Example:
 *
 * ```js
 * const count = reactive(0);
 * effect(() => {
 *     console.log(count.value);
 * });
 * // Effect runs immediately, prints "0"
 *
 * // Triggers re-execution of the effect (with a minimal delay), prints "1"
 * count.value = 1;
 * ```
 *
 * `effect` returns a handle that allows you to unsubscribe from changes.
 * That handle's `destroy()` function should be called in order to clean up the effect when you no longer need it,
 * otherwise the effect will keep running forever:
 *
 * ```js
 * const handle = effect(() => {
 *     // ...
 * });
 * // later:
 * handle.destroy();
 * ```
 *
 * You can also return a _function_ from your effect callback.
 * It will be called automatically when either the effect will be re-executed or when the effect is being destroyed.
 * This can be very convenient to revert (or clean up) the side effects made by an effect:
 *
 * ```js
 * effect(() => {
 *     const job = startAJob();
 *     return () => job.stop();
 * });
 * ```
 *
 * > NOTE: This function will slightly defer re-executions of the given `callback`.
 * > In other words, the re-execution does not happen _immediately_ after a reactive dependency changed.
 * > This is done to avoid redundant executions as a result of many fine-grained changes.
 * >
 * > If you need more control, take a look at {@link syncEffect}.
 *
 * @group Watching
 */
export function effect(callback: EffectCallback): CleanupHandle {
    const effect = new AsyncEffect(callback);
    return {
        destroy: effect.destroy.bind(effect)
    };
}

class AsyncEffect {
    private callback: EffectCallback;
    private cleanup: CleanupFunc | void | undefined;
    private effectHandle: CleanupHandle | undefined;
    private scheduledExecution: CleanupHandle | undefined;
    private isDestroyed = false;

    // True during first run of the effect
    private initialExecution = true;

    // True while running the effect
    private isExecuting = false;

    constructor(callback: EffectCallback) {
        this.callback = callback;
        this.execute();
        this.initialExecution = false;
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;
        try {
            this.triggerCleanup();
        } finally {
            this.effectHandle?.destroy();
            this.effectHandle = undefined;
            this.scheduledExecution?.destroy();
            this.scheduledExecution = undefined;
        }
    }

    // Runs the actual effect body (once).
    // When the reactive dependencies change, an async callback is dispatched,
    // which will run the effect again at a later time.
    //
    // NOTE: this implementation is not very efficient because it will continuously recreate
    // new syncEffects behind the scenes (this will probably fine for now).
    //
    // A better implementation would allow us to
    // 1) create a computed signal and
    // 2) listen to that signal's invalidation, __without__ computing the new value.
    //
    // There is currently no API for that in @preact/signals-core (subscribing to a signal implies computing its value).
    private execute() {
        this.isExecuting = true;
        try {
            const effectHandle = syncEffectOnce(
                () => {
                    if (this.initialExecution) {
                        this.triggerCallback();
                    } else {
                        try {
                            this.triggerCallback();
                        } catch (e) {
                            // Don't let the error escape in later executions;
                            // we need to return normally so we get triggered again.
                            // This is done to preserve consistent behavior w.r.t. syncEffect
                            reportTaskError(e);
                        }
                    }
                },
                () => this.scheduleExecution()
            );
            if (this.isDestroyed) {
                // Effect may have been destroyed in the execution of `triggerCallback()`
                effectHandle.destroy();
            } else {
                this.effectHandle = effectHandle;
            }
        } finally {
            this.isExecuting = false;
        }
    }

    private triggerCallback() {
        this.triggerCleanup();
        if (!this.isDestroyed) {
            this.cleanup = this.callback();
        }
    }

    private triggerCleanup() {
        const cleanup = this.cleanup;
        this.cleanup = undefined;
        try {
            if (cleanup) {
                untracked(cleanup);
            }
        } catch (e) {
            this.destroy();
            throw e;
        }
    }

    private scheduleExecution() {
        if (this.isDestroyed) {
            return;
        }

        this.effectHandle?.destroy();
        this.effectHandle = undefined;
        if (this.isExecuting) {
            // effect triggers itself
            throw new Error("Cycle detected");
        }

        if (this.scheduledExecution) {
            return;
        }
        this.scheduledExecution = dispatchCallback(() => {
            try {
                this.execute();
            } finally {
                this.scheduledExecution = undefined;
            }
        });
    }
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
 * The values returned by the selector are compared using object identity by default (i.e. `===`).
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
export function watchValue<T> (
    selector: () => T,
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
export function watchValue<T> (
    selector: () => T,
    callback: WatchImmediateCallback<T>,
    options?: WatchOptions<T>
): CleanupHandle;
export function watchValue<T> (
    selector: () => T,
    callback: WatchImmediateCallback<T>,
    options?: WatchOptions<T>
): CleanupHandle {
    return watchImpl(effect, selector, callback, options);
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
export function watch<const Values extends readonly unknown[]>(
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
export function watch<const Values extends readonly unknown[]>(
    selector: () => Values,
    callback: WatchImmediateCallback<Values>,
    options?: WatchOptions<Values>
): CleanupHandle;
export function watch<const Values extends readonly unknown[]>(
    selector: () => Values,
    callback: WatchImmediateCallback<Values>,
    options?: WatchOptions<Values>
): CleanupHandle {
    return watchImpl(effect, selector, callback, {
        equal: shallowEqual,
        ...options
    });
}

const tasks = new TaskQueue();

function dispatchCallback(callback: () => void): CleanupHandle {
    return tasks.enqueue(callback);
}
