import { computed as rawComputed } from "@preact/signals-core";
import { untracked } from "./ReactiveImpl";
import { CleanupFunc, CleanupHandle, EffectCallback, WatchOptions } from "./types";
import { shallowEqual } from "./utils/shallowEqual";

type EffectSignature = (callback: EffectCallback) => CleanupHandle;

export function watchImpl<const Values extends readonly unknown[]>(
    effectImpl: EffectSignature,
    selector: () => Values,
    callback: (values: Values) => void | CleanupFunc,
    options?: WatchOptions
): CleanupHandle {
    const computedArgs = rawComputed(selector);
    const immediate = options?.immediate ?? false;

    let oldValues: Values | undefined;
    let oldCleanup: CleanupFunc | void | undefined;
    function triggerCleanup() {
        const cleanup = oldCleanup;
        oldCleanup = undefined;
        try {
            cleanup?.();
        } catch (e) {
            // Destroy a watch completely if a cleanup function throws.
            // This is consistent with the behavior of 'effect'.
            handle.destroy();
            throw e;
        }
    }

    const effectHandle = effectImpl(() => {
        const currentValues = computedArgs.value; // Tracked
        untracked(() => {
            // prettier-ignore
            const execute = 
                (!oldValues && immediate)
                || (oldValues && !shallowEqual(oldValues, currentValues));
            oldValues = currentValues;
            if (execute) {
                triggerCleanup();
                oldCleanup = callback(currentValues);
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
