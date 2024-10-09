import { describe, expect, it, vi } from "vitest";
import { batch, reactive, synchronized } from "./ReactiveImpl";
import { createWatcher, rawComputedWithSubscriptionHook } from "./hacks";
import { syncWatchValue } from "./sync";

describe("Watcher", () => {
    it("does not trigger the notify callback if nothing happens", () => {
        const callback = vi.fn();
        const watcher = createWatcher(callback);
        watcher.destroy();
        expect(callback).toHaveBeenCalledTimes(0);
    });

    it("does not trigger the notify callback if watched signals don't receive updates", () => {
        const signal = reactive(0);
        const callback = vi.fn();
        const watcher = createWatcher(callback);

        const stop = watcher.start();
        signal.value; // tracked
        stop();

        watcher.destroy();
        expect(callback).toHaveBeenCalledTimes(0);
    });

    it("triggers multiple updates in a batch", () => {
        const signal = reactive(0);
        const callback = vi.fn();
        const watcher = createWatcher(callback);

        const stop = watcher.start();
        signal.value; // tracked
        stop();

        batch(() => {
            signal.value = 1;
            signal.value = 2;
        });

        // Would be ideal to only receive a single update, but we cant
        // force the preact library to do this without outright forking the project.
        expect(callback).toHaveBeenCalledTimes(2);
    });

    it("only triggers updates when currently observed signals update", () => {
        const signal1 = reactive(0);
        const signal2 = reactive(0);
        const callback = vi.fn();
        const watcher = createWatcher(callback);

        // Watch signal1
        {
            const stop = watcher.start();
            signal1.value; // tracked
            stop();
        }
        signal1.value = 1;
        expect(callback).toHaveBeenCalledTimes(1);

        // Watch signal2
        {
            const stop = watcher.start();
            signal2.value; // tracked
            stop();
        }
        signal1.value = 2; // no effect since signal1 was not used
        expect(callback).toHaveBeenCalledTimes(1);
        signal2.value = 2;
        expect(callback).toHaveBeenCalledTimes(2);
    });

    it("subscribes on watch and unsubscribes on destroy", () => {
        let sub = 0;
        let unsub = 0;
        const syncSignal = synchronized(
            () => 0,
            () => {
                sub++;
                return () => unsub++;
            }
        );
        const normalSignal = reactive(0);

        const callback = vi.fn();
        const watcher = createWatcher(callback);

        {
            const stop = watcher.start();
            syncSignal.value;
            normalSignal.value;
            stop();
        }
        expect(sub).toBe(1);
        expect(unsub).toBe(0);

        // Do some changes to trigger the patched notify code (which uses the disposed flags ...).
        normalSignal.value = 1;
        normalSignal.value = 2;
        expect(callback).toHaveBeenCalledTimes(2);

        watcher.destroy();
        expect(sub).toBe(1);
        expect(unsub).toBe(1);
    });

    it("subscribes on watch and unsubscribes on change", () => {
        let sub = 0;
        let unsub = 0;
        const syncSignal = synchronized(
            () => 0,
            () => {
                sub++;
                return () => unsub++;
            }
        );
        const normalSignal = reactive(0);

        const callback = vi.fn();
        const watcher = createWatcher(callback);

        {
            const stop = watcher.start();
            syncSignal.value;
            normalSignal.value;
            stop();
        }
        expect(sub).toBe(1);
        expect(unsub).toBe(0);

        // Do some changes to trigger the patched notify code (which uses the disposed flags ...).
        normalSignal.value = 1;
        normalSignal.value = 2;
        expect(callback).toHaveBeenCalledTimes(2);

        {
            const stop = watcher.start();
            normalSignal.value;
            stop();
        }
        expect(sub).toBe(1);
        expect(unsub).toBe(1);
    });
});

describe("rawComputedWithSubscriptionHook", () => {
    it("detects the first subscriber", () => {
        const onUnsubscribe = vi.fn();
        const onSubscribe = vi.fn().mockReturnValue(onUnsubscribe);
        const signal = rawComputedWithSubscriptionHook(() => 0, onSubscribe);
        expect(onSubscribe).toHaveBeenCalledTimes(0);
        expect(onUnsubscribe).toHaveBeenCalledTimes(0);

        const { destroy: destroy1 } = syncWatchValue(
            () => signal.value,
            () => {}
        );
        expect(onSubscribe).toHaveBeenCalledTimes(1);

        // no effect since this is the second subscriber
        const { destroy: destroy2 } = syncWatchValue(
            () => signal.value,
            () => {}
        );
        expect(onSubscribe).toHaveBeenCalledTimes(1);

        // no effect since the other subscribe is still running
        destroy1();
        expect(onUnsubscribe).toHaveBeenCalledTimes(0);

        // now the last subscriber is gone
        destroy2();
        expect(onUnsubscribe).toHaveBeenCalledTimes(1);
    });
});
