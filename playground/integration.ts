import {
    ReadonlyReactive,
    computed as reactivityComputed,
    subtleWatchDirty
} from "@conterra/reactivity-core";
import { Ref, customRef, onScopeDispose, watchEffect } from "vue";

/**
 * This composable integrates reactive values into the vue reactivity system.
 * From within `compute`, you can reference any reactive values any return some derived value.
 * That value will refresh (for your vue component) whenever any of its reactivity dependencies change.
 *
 * Because `compute` may be called very often (if there are many updates), it should be fast.
 *
 * > NOTE: a function such as this would usually be provided by your application / framework,
 * > there is no need to create it yourself.
 */
export function useReactiveSnapshot<T>(compute: () => T): Readonly<Ref<T>> {
    /**
     * We must accomplish two things:
     * 1. React to changes of reactive values (from reactivity-core) inside `compute`
     * 2. React to changes of *vue* values inside `compute`
     */
    let signal!: ReadonlyReactive<T>;
    let trigger!: () => void;
    const ref = customRef<T>((track, trigger_) => {
        trigger = trigger_;
        return {
            get() {
                track();
                return signal.value;
            },
            set() {
                throw new Error("Cannot write to the reactive snapshot.");
            }
        };
    });
    const dispose = watchEffect((onCleanup) => {
        // Setup the computed signal every time the vue dependencies change.
        signal = reactivityComputed(compute);
        signal.value;

        // Watch for changes in the reactive signal (non-vue dependencies).
        const handle = subtleWatchDirty(signal, trigger);
        onCleanup(() => handle.destroy());

        trigger();
    });
    onScopeDispose(dispose);
    return ref;
}
