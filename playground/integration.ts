import { effect as reactivityEffect } from "@conterra/reactivity-core";
import { Ref, computed, onScopeDispose, ref, watchEffect } from "vue";

/**
 * This composable integrates reactive values into the vue reactivity system.
 * From within `compute`, you can reference any reactive values any return some derived value.
 * That value will refresh (for your vue component) whenever any of its reactivity dependencies change.
 *
 * Because `compute` may be called very often (if there are many updates), it should be fast.
 *
 * NOTE: a function such as this would usually be provided by your application / framework,
 * there is no need to create it yourself.
 */
export function useReactiveSnapshot<T>(compute: () => T): Readonly<Ref<T>> {
    /**
     * We must accomplish two things:
     * 1. React to changes of reactive values (from reactivity-core) inside `compute`
     * 2. React to changes of *vue* values inside `compute`
     */
    const snapshot = ref() as Ref<T>;
    const dispose = watchEffect((onCleanup) => {
        // *slightly* inefficient here to use effect, in case compute's dependencies change very often.
        // in that case, snapshot.value would be updated more often than needed (need at most ~60 FPS).
        // However, this is good enough for this example.
        const handle = reactivityEffect(() => {
            const value = compute();
            snapshot.value = value;
        });
        onCleanup(() => handle.destroy());
    });
    onScopeDispose(dispose);
    return snapshot;
}
