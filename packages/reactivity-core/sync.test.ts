import { describe, expect, it, vi } from "vitest";
import { reactive } from "./ReactiveImpl";
import { syncEffect, syncEffectOnce, syncWatch, syncWatchValue } from "./sync";
import { defineSharedEffectTests, defineSharedWatchTests } from "./test/sharedTests";

describe("syncEffect", () => {
    defineSharedEffectTests(syncEffect, "sync");

    describe("specifics", () => {
        it("triggers effect callback synchronously", () => {
            const r = reactive(1);
            const spy = vi.fn();
            syncEffect(() => {
                spy(r.value);
            });
            expect(spy).toBeCalledTimes(1);

            r.value = 2;
            expect(spy).toBeCalledTimes(2);
        });
    });
});

describe("syncEffectOnce", () => {
    it("triggers when reactive dependencies may have changed", () => {
        const r = reactive(1);
        const callbackSpy = vi.fn(() => void r.value);
        const invalidateSpy = vi.fn();

        syncEffectOnce(callbackSpy, invalidateSpy);
        expect(callbackSpy).toHaveBeenCalledTimes(1);
        expect(invalidateSpy).toHaveBeenCalledTimes(0);

        r.value = 2;
        expect(callbackSpy).toHaveBeenCalledTimes(1);
        expect(invalidateSpy).toHaveBeenCalledTimes(1);

        // only called once
        r.value = 3;
        expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });

    it("can be cleaned up", () => {
        const r = reactive(1);
        const spy = vi.fn();
        const cleanUpSpy = vi.fn();

        const handle = syncEffectOnce(() => {
            r.value;
            return () => cleanUpSpy();
        }, spy);
        expect(spy).toHaveBeenCalledTimes(0);
        expect(cleanUpSpy).toHaveBeenCalledTimes(0);

        handle.destroy();

        expect(cleanUpSpy).toHaveBeenCalledTimes(1);

        // not called since effect was dispose already
        r.value = 2;
        expect(spy).toHaveBeenCalledTimes(0);
    });

    it("does not invoke the callback if the initial execution threw an error", () => {
        const r = reactive(1);
        const spy = vi.fn();
        const callback = vi.fn();
        expect(() => {
            syncEffectOnce(() => {
                spy(r.value);
                throw new Error("boom");
            }, callback);
        }).toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
        expect(spy).toHaveBeenCalledOnce();
        expect(callback).not.toHaveBeenCalled();

        r.value += 1;
        // Not called, effect is not running in the background
        expect(spy).toHaveBeenCalledOnce();
        expect(callback).not.toHaveBeenCalled();
    });
});

describe("syncWatch", () => {
    defineSharedWatchTests(syncWatch, syncWatchValue, "sync");

    describe("specifics", () => {
        it("triggers without a delay", async () => {
            const spy = vi.fn();
            const r1 = reactive(1);
            syncWatch(
                () => [r1.value] as const,
                ([v1]) => {
                    spy(v1);
                }
            );
            expect(spy).toBeCalledTimes(0);

            r1.value = 2;
            expect(spy).toBeCalledTimes(1);
        });
    });
});
