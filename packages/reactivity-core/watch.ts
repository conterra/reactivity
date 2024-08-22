import { computed as rawComputed } from "@preact/signals-core";
import { untracked } from "./ReactiveImpl";
import {
    CleanupFunc,
    CleanupHandle,
    EffectCallback,
    WatchImmediateCallback,
    WatchOptions
} from "./types";
import { shallowEqual } from "./utils/shallowEqual";

type EffectSignature = (callback: EffectCallback) => CleanupHandle;

export function watchImpl<const Values extends readonly unknown[]>(
    effectImpl: EffectSignature,
    selector: () => Values,
    callback: WatchImmediateCallback<Values>,
    options?: WatchOptions
): CleanupHandle {
    const computedArgs = rawComputed(selector);
    const immediate = options?.immediate ?? false;

    let values: Values | undefined;
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
        const currentValues = computedArgs.value; // Tracked
        untracked(() => {
            // prettier-ignore
            const shouldExecute = 
                (!values && immediate)
                || (values && !shallowEqual(values, currentValues));
            const prevValues = values;
            values = currentValues;
            if (shouldExecute) {
                triggerCleanup();
                cleanup = callback(currentValues, prevValues);
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
