import { computed as rawComputed } from "@preact/signals-core";
import { untracked } from "./ReactiveImpl";
import {
    CleanupFunc,
    CleanupHandle,
    EffectCallback,
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

    let firstExecution = true;
    let value: T;
    let cleanup: CleanupFunc | void | undefined;
    function triggerCleanup() {
        const clean = cleanup;
        cleanup = undefined;
        try {
            clean?.();
        } catch (e) {
            // Destroy a watch completely if a cleanup function throws.
            // This is consistent with the behavior of 'effect'.
            handle.destroy();
            throw e;
        }
    }

    const effectHandle = effectImpl(() => {
        const next = computedArgs.value; // Tracked
        untracked(() => {
            const prev = value;
            const shouldExecute = (firstExecution && immediate) || (!firstExecution && !equal(prev, next));
            if (shouldExecute || firstExecution) {
                value = next;
                firstExecution = false;
            }
            if (shouldExecute) {
                triggerCleanup();
                cleanup = callback(next, prev);
            }
        });
    });

    const handle: CleanupHandle = {
        destroy() {
            try {
                triggerCleanup();
            } finally {
                effectHandle.destroy();
            }
        }
    };
    return handle;
}

function trivialEquals(a: unknown, b: unknown) {
    return a === b;
}