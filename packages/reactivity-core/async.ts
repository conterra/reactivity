import { CleanupHandle } from "./Reactive";
import { TaskQueue } from "./TaskQueue";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EffectFunc, syncEffectOnce, syncEffect, WatchOptions, syncWatch } from "./sync";

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
 * > NOTE: This function will slightly defer re-executions of the given `callback`.
 * > In other words, the re-execution does not happen _immediately_ after a reactive dependency changed.
 * > This is done to avoid redundant executions as a result of many fine-grained changes.
 * >
 * > If you need more control, take a look at {@link syncEffect}.
 * 
 * @group Watching
 */
export function effect(callback: EffectFunc): CleanupHandle {
    let currentSyncEffect: CleanupHandle | undefined;
    let currentDispatch: CleanupHandle | undefined;

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
    function rerunEffect() {
        currentSyncEffect?.destroy();
        currentSyncEffect = undefined;

        currentSyncEffect = syncEffectOnce(callback, () => {
            currentSyncEffect = undefined;
            if (currentDispatch) {
                return;
            }

            currentDispatch = dispatchCallback(() => {
                try {
                    rerunEffect();
                } finally {
                    currentDispatch = undefined;
                }
            });
        });
    }

    function destroy() {
        currentSyncEffect?.destroy();
        currentSyncEffect = undefined;
        currentDispatch?.destroy();
        currentDispatch = undefined;
    }

    rerunEffect();
    return { destroy };
}

/**
 * Watches reactive values and executes a callback whenever those values change.
 *
 * `watch` works like this:
 *
 * 1. The `selector` is a tracked function that should return an array of values.
 *    Those values are usually obtained by accessing one or more reactive objects.
 * 2. Whenever the values inside the array returned by `selector` change, `callback`
 *    will be executed with those values.
 *    The body of `callback` is not reactive.
 *
 * The arrays returned by the selector are compared using shallow equality: the callback
 * runs if the length of the array changes or if one of its entries has a different identity (determined via `!==`).
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
 * `watch` returns a dispose function that can be used to unsubscribe from changes.
 * That function should be called to stop watching when you are no longer interested in updates:
 *
 * ```js
 * const dispose = watch(() => [someReactive.value], () => {
 *   // ...
 * });
 * // later:
 * dispose();
 * ```
 *
 * > NOTE: You must *not* modify the array that gets passed into `callback`.
 *
 * > NOTE: This function will slightly defer re-executions of the given `callback`.
 * > In other words, the re-execution does not happen _immediately_ after a reactive dependency changed.
 * > This is done to avoid redundant executions as a result of many fine-grained changes.
 * >
 * > If you need more control, take a look at {@link syncWatch}.
 * 
 * @group Watching
 */
export function watch<const Values extends readonly unknown[]>(
    selector: () => Values,
    callback: (values: Values) => void,
    options?: WatchOptions
): CleanupHandle {
    let currentValues: Values;
    let currentDispatch: CleanupHandle | undefined;
    let initialSyncExecution = true;
    const watchHandle = syncWatch(
        selector,
        (values) => {
            currentValues = values;
            
            // If the user passed 'immediate: true', the initial execution is not deferred sync.
            if (initialSyncExecution) {
                callback(currentValues);
                return;
            }

            if (currentDispatch) {
                return;
            }
            currentDispatch = dispatchCallback(() => {
                try {
                    callback(currentValues); // receives latest value, even if old dispatch
                } finally {
                    currentDispatch = undefined;
                }
            });
        },
        options
    );
    initialSyncExecution = false;

    function destroy() {
        currentDispatch?.destroy();
        currentDispatch = undefined;
        watchHandle.destroy();
    }

    return { destroy };
}

const tasks = new TaskQueue();

function dispatchCallback(callback: () => void): CleanupHandle {
    return tasks.enqueue(callback);
}
