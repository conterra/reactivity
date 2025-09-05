// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from "vitest";
import { Trackers } from "./tracking";
import { effect } from "../effect";
import { computed } from "../signals";

describe("track key changes", () => {
    it("triggers effect() when key changes", async () => {
        const trackers = new Trackers();

        let calls = 0;
        const handle = effect(
            () => {
                trackers.track("foo");
                ++calls;
            },
            {
                dispatch: "sync"
            }
        );

        // Initial call
        expect(calls).toBe(1);

        // Key change triggers reevaluation
        trackers.trigger("foo");
        expect(calls).toBe(2);

        handle.destroy();
    });

    it("gc does not interfere with watcher while there are subscribers", async () => {
        const trackers = new Trackers();

        let calls = 0;
        const handle = effect(
            () => {
                trackers.track("foo");
                ++calls;
            },
            {
                dispatch: "sync"
            }
        );

        // Initial call
        expect(calls).toBe(1);

        await reallyGc();

        // Key change triggers reevaluation
        trackers.trigger("foo");
        expect(calls).toBe(2);
        handle.destroy();
    });

    it("invalidates computed signals", async () => {
        const trackers = new Trackers();

        let calls = 0;
        const counter = computed(() => {
            trackers.track("foo");
            return ++calls;
        });
        expect(calls).toBe(0);

        counter.value;
        expect(calls).toBe(1);

        counter.value;
        expect(calls).toBe(1); // cached

        await reallyGc();
        trackers.trigger("foo");

        expect(calls).toBe(1);
        counter.value;
        expect(calls).toBe(2);

        counter.value;
        expect(calls).toBe(2); // cached
    });
});

describe("memory management", () => {
    it("cleans up stale trackers during gc", async () => {
        const trackers = new Trackers<number>();
        const trackerMap = getTrackerMap(trackers);

        const handle = effect(
            () => {
                for (let i = 0; i < 1000; ++i) {
                    trackers.track(i);
                }
            },
            {
                dispatch: "sync"
            }
        );
        expect(trackerMap.size).toBe(1000);

        await reallyGc();
        expect(trackerMap.size).toBe(1000); // no change

        handle.destroy();
        await reallyGc();
        expect(trackerMap.size).toBe(0); // cleaned up
    });

    it("only cleans trackers that are no longer used", async () => {
        const trackers = new Trackers<number>();
        const trackerMap = getTrackerMap(trackers);

        let calls = 0;
        const handle = effect(
            () => {
                if (calls === 0) {
                    for (let i = 0; i < 1000; ++i) {
                        trackers.track(i);
                    }
                } else {
                    trackers.track(123);
                }
                ++calls;
            },
            {
                dispatch: "sync"
            }
        );
        expect(calls).toBe(1);

        trackers.trigger(123);
        expect(calls).toBe(2); // Only listens for 123 now

        await reallyGc();
        expect(trackerMap.size).toBe(1); // All except 123 cleared

        trackers.trigger(123);
        expect(calls).toBe(3);

        handle.destroy();
    });

    // Internal API only available during tests
    function getTrackerMap<Key>(trackers: Trackers<Key>): Map<Key, unknown> {
        return (trackers as any).getTrackerMap();
    }
});

describe("weak refs and finalization registries", () => {
    it("weak refs to the same object are not equal", () => {
        const obj = {};

        // No funny business
        const w1 = new WeakRef(obj);
        const w2 = new WeakRef(obj);
        expect(w1 === w2).toBe(false);
        expect(w1.deref() === w2.deref()).toBe(true);
    });

    it("weak refs collection can be detected", async () => {
        const w = new WeakRef({});
        expect(w.deref()).toBeDefined();

        await gc();

        expect(w.deref()).toBe(undefined);
    });

    it("weak ref collection can be observed using a finalization registry", async () => {
        const callback = vi.fn();
        const registry = new FinalizationRegistry(callback);

        const registerObj = () => {
            const obj = {};
            const w = new WeakRef(obj);
            registry.register(obj, "token");
            return w;
        };

        const w = registerObj();
        expect(w.deref()).toBeDefined();
        expect(callback).toHaveBeenCalledTimes(0);

        await reallyGc();

        expect(w.deref()).toBeUndefined();
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.lastCall).toEqual(["token"]);
    });

    it("gc function is available", () => {
        // See vite/vitest config for node --expose-gc
        expect(typeof global.gc).toBe("function");

        // No exception
        global.gc!();
    });
});

async function reallyGc() {
    // Sometimes one gc is not enough :)
    await gc();
    await gc();
    await gc();
}

async function gc(): Promise<void> {
    return new Promise((resolve, reject) => {
        // Weak refs that are used in the current task are not collected -> perform gc
        // in the next tick.
        setTimeout(() => {
            try {
                global.gc!();
                resolve();
            } catch (e) {
                reject(e);
            }
        }, 0);
    });
}
