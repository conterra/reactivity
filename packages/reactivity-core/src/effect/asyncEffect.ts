import { createWatcher, RawWatcher } from "../hacks";
import { untracked } from "../signals";
import { CleanupFunc, CleanupHandle, EffectCallback, EffectContext } from "../types";
import { reportCallbackError } from "../utils/reportCallbackError";
import { dispatchAsyncCallback } from "../utils/dispatch";

// Imported for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { syncEffect } from "./syncEffect";

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

/**
 * Like the sync effect from @preact/signals-core, but dispatches its callbacks in a new task.
 */
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
                    reportCallbackError(e);
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
        this.#scheduledExecution = dispatchAsyncCallback(() => {
            try {
                this.#execute();
            } finally {
                this.#scheduledExecution = undefined;
            }
        });
    };
}
