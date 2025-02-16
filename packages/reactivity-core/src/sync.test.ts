import { describe, expect, it, vi } from "vitest";
import { reactive } from "./ReactiveImpl";
import { syncEffect, syncWatch, syncWatchValue } from "./sync";
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
