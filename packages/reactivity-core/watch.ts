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
    options?: WatchOptions<Values>
): CleanupHandle {
    const computedArgs = rawComputed(selector);
    const immediate = options?.immediate ?? false;
    const equal = options?.equal ?? shallowEqual;

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
        const next = computedArgs.value; // Tracked
        untracked(() => {
            const prev = values;
            const shouldExecute = (!prev && immediate) || (prev && !equal(prev, next));
            if (shouldExecute || !values) {
                values = next;
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
