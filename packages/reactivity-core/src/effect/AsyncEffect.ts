// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { createWatcher, RawWatcher } from "../hacks";
import { untracked } from "../signals";
import { CleanupFunc, CleanupHandle, EffectCallback, EffectContext } from "../types";
import { dispatchAsyncCallback } from "../utils/dispatch";
import { reportCallbackError } from "../utils/reportCallbackError";

/**
 * Like the sync effect from @preact/signals-core, but dispatches its callbacks in a new task.
 */
export class AsyncEffect implements EffectContext {
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
