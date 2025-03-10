// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { computed as rawComputed, ReadonlySignal as RawReadonlySignal } from "@preact/signals-core";
import { untracked } from "../signals";
import {
    CleanupFunc,
    CleanupHandle,
    EffectCallback,
    ReactiveGetter,
    WatchContext,
    WatchImmediateCallback,
    WatchOptions
} from "../types";
import { defaultEquals } from "../utils/equality";

export type EffectSignature = (callback: EffectCallback) => CleanupHandle;

export function createWatcher<T>(
    effectImpl: EffectSignature,
    selector: ReactiveGetter<T>,
    callback: WatchImmediateCallback<T>,
    options?: WatchOptions<T>
): CleanupHandle {
    const computedArgs = rawComputed(selector);
    const immediate = options?.immediate ?? false;
    const equal = options?.equal ?? defaultEquals;
    return new Watcher(effectImpl, callback, computedArgs, equal, immediate);
}

/**
 * Watches a computed signal and executes a callback whenever that signal's value changes.
 * Supports both async and sync dispatch via the `effectImpl` parameter.
 */
class Watcher<T> implements WatchContext, CleanupHandle {
    /** User callback. */
    #callback: WatchImmediateCallback<T>;

    /** True if callback runs in constructor. */
    #immediate: boolean;

    /** Equality function to detect changes in watched value. */
    #equal: (a: T, b: T) => boolean;

    /** True during initial callback execution. */
    #firstExecution = true;

    /** Last observed value for which callback was triggered. */
    #value: T | undefined;

    /** Cleanup function of last callback invocation. */
    #cleanup: CleanupFunc | undefined;

    #isDestroyed = false;
    #effectHandle: CleanupHandle | undefined;

    constructor(
        effectImpl: EffectSignature,
        callback: WatchImmediateCallback<T>,
        computedArgs: RawReadonlySignal<T>,
        equal: (a: T, b: T) => boolean,
        immediate: boolean
    ) {
        this.#callback = callback;
        this.#immediate = immediate;
        this.#equal = equal;
        this.#effectHandle = effectImpl(() => {
            const nextValue = computedArgs.value; // Tracked
            untracked(() => {
                this.#execute(nextValue);
            });
        });
        if (this.#isDestroyed) {
            // Handle self-destruction in initial execution
            this.#effectHandle.destroy();
            this.#effectHandle = undefined;
        }
    }

    // NOTE: May be called during construction if immediate is true.
    // Bound `this` makes cleanup handle easier to work with.
    destroy = (): void => {
        this.#isDestroyed = true;
        this.#effectHandle?.destroy(); // undefined if destroyed before fully constructed
        this.#effectHandle = undefined;
        this.#triggerCleanup();
    };

    #execute(nextValue: T): void {
        const prev = this.#value;
        const shouldExecute =
            (this.#firstExecution && this.#immediate) ||
            (!this.#firstExecution && !this.#equal(prev as T, nextValue));
        if (shouldExecute || this.#firstExecution) {
            this.#value = nextValue;
            this.#firstExecution = false;
        }
        if (shouldExecute) {
            this.#triggerCleanup();
            const cleanup = this.#callback(nextValue, prev, this);
            if (typeof cleanup === "function") {
                this.#cleanup = cleanup;
            }
        }

        if (this.#isDestroyed) {
            this.#triggerCleanup();
        }
    }

    #triggerCleanup(): void {
        const clean = this.#cleanup;
        this.#cleanup = undefined;
        try {
            clean?.();
        } catch (e) {
            // Destroy a watch completely if a cleanup function throws.
            // This is consistent with the behavior of 'effect'.
            this.destroy();
            throw e;
        }
    }
}
