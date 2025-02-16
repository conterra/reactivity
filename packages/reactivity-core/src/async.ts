import { untracked } from "./ReactiveImpl";
import {
    CleanupFunc,
    CleanupHandle,
    EffectCallback,
    EffectContext,
    WatchCallback,
    WatchImmediateCallback,
    WatchOptions
} from "./types";
import { reportTaskError } from "./utils/reportTaskError";
import { shallowEqual } from "./utils/shallowEqual";
import { TaskQueue } from "./utils/TaskQueue";
import { watchImpl } from "./watch";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { syncEffect, syncWatch, syncWatchValue } from "./sync";
import { createWatcher, RawWatcher } from "./hacks";

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

class AsyncEffect implements EffectContext {
    /** The user-defined effect body. */
    #callback: EffectCallback;

    /** The cleanup function returned by an earlier effect execution (if any). */
    #cleanup: CleanupFunc | undefined;

    /** The watcher that implements notifications when signals change. */
    #watcher: RawWatcher | undefined;

    /** The currently scheduled execution for a new execution of the effect (if any). */
    #scheduledExecution: CleanupHandle | undefined;

    /** True when .destroy() was called on the effect (from user or by ourselves). */
    #isDestroyed = false;

    /** True during first run of the effect */
    #initialExecution = true;

    /** True while running the effect */
    #isExecuting = false;

    constructor(callback: EffectCallback) {
        this.#callback = callback;
        this.#watcher = createWatcher(this.#scheduleExecution);
        this.#execute();
        this.#initialExecution = false;
    }

    // NOTE: Bound `this` makes cleanup handle easier to work with.
    destroy = (): void => {
        if (this.#isDestroyed) {
            return;
        }

        this.#isDestroyed = true;
        try {
            this.#triggerCleanup();
        } finally {
            this.#watcher?.destroy();
            this.#watcher = undefined;
            this.#scheduledExecution?.destroy();
            this.#scheduledExecution = undefined;
        }
    };

    // Runs the actual effect body (once).
    // When the reactive dependencies change, an async callback is dispatched,
    // which will run the effect again at a later time.
    #execute() {
        const watcher = this.#watcher;
        if (!watcher) {
            return;
        }

        this.#isExecuting = true;
        const stop = watcher.start();
        try {
            // The branch here is for consistent behavior with the raw (sync) effect.
            if (this.#initialExecution) {
                // Invoke right here to transport the (possible) exception to the caller.
                try {
                    this.#triggerCallback();
                } catch (e) {
                    this.destroy();
                    throw e;
                }
            } else {
                // We're called from a scheduled task, log the error here and continue.
                try {
                    this.#triggerCallback();
                } catch (e) {
                    reportTaskError(e);
                }
            }
        } finally {
            stop();
            this.#isExecuting = false;
        }

        // May have been destroyed in its own execution; make sure to invoke the last cleanup function
        if (this.#isDestroyed) {
            this.#triggerCleanup();
        }
    }

    #triggerCallback() {
        if (!this.#isDestroyed) {
            this.#triggerCleanup();
            const cleanup = this.#callback(this);
            if (typeof cleanup === "function") {
                this.#cleanup = cleanup;
            }
        }
    }

    #triggerCleanup() {
        const cleanup = this.#cleanup;
        this.#cleanup = undefined;
        try {
            if (cleanup) {
                untracked(cleanup);
            }
        } catch (e) {
            this.destroy();
            throw e;
        }
    }

    #scheduleExecution = () => {
        if (this.#isDestroyed) {
            return;
        }
        if (this.#isExecuting) {
            // effect triggers itself
            throw new Error("Cycle detected");
        }

        if (this.#scheduledExecution) {
            return;
        }
        this.#scheduledExecution = dispatchCallback(() => {
            try {
                this.#execute();
            } finally {
                this.#scheduledExecution = undefined;
            }
        });
    };
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
export function watchValue<T>(
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
export function watchValue<T>(
    selector: () => T,
    callback: WatchImmediateCallback<T>,
    options?: WatchOptions<T>
): CleanupHandle;
export function watchValue<T>(
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

/**
 * Returns a promise that resolves after all _currently scheduled_ asynchronous callbacks have executed.
 *
 * This function is useful in tests to wait for the execution of side effects triggered by an asynchronous `watch` or an `effect`.
 *
 * @group Watching
 */
export function nextTick(): Promise<void> {
    return new Promise((resolve) => {
        dispatchCallback(resolve);
    });
}

const tasks = new TaskQueue();

function dispatchCallback(callback: () => void): CleanupHandle {
    return tasks.enqueue(callback);
}
