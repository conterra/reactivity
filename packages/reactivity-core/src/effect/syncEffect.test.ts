import { describe, expect, it, vi } from "vitest";
import { defineSharedEffectTests } from "./sharedTests";
import { reactive } from "../signals";
import { syncEffect } from "./syncEffect";

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
