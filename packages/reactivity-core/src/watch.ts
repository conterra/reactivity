import { computed as rawComputed, ReadonlySignal as RawReadonlySignal } from "@preact/signals-core";
import { untracked } from "./ReactiveImpl";
import {
    CleanupFunc,
    CleanupHandle,
    EffectCallback,
    WatchContext,
    WatchImmediateCallback,
    WatchOptions
} from "./types";

type EffectSignature = (callback: EffectCallback) => CleanupHandle;

export function watchImpl<T>(
    effectImpl: EffectSignature,
    selector: () => T,
    callback: WatchImmediateCallback<T>,
    options?: WatchOptions<T>
): CleanupHandle {
    const computedArgs = rawComputed(selector);
    const immediate = options?.immediate ?? false;
    const equal = options?.equal ?? trivialEquals;
    return new WatchImpl(effectImpl, callback, computedArgs, equal, immediate);
}

class WatchImpl<T> implements WatchContext, CleanupHandle {
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

function trivialEquals(a: unknown, b: unknown) {
    return a === b;
}
