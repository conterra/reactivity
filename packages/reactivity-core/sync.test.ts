import { describe, expect, it, vi } from "vitest";
import { batch, reactive } from "./ReactiveImpl";
import { syncEffect, syncEffectOnce, syncWatch } from "./sync";

describe("syncEffect", () => {
    it("evaluates an effect at least once", () => {
        const r = reactive(1);
        const spy = vi.fn();
        syncEffect(() => {
            spy(r.value);
        });

        expect(spy).toBeCalledTimes(1);
    });

    it("re-evaluates an effect if its dependencies change", () => {
        const r = reactive("first");
        const spy = vi.fn();
        syncEffect(() => {
            spy(r.value);
        });
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith("first");

        spy.mockClear();

        r.value = "second";
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith("second");
    });

    it("does not re-evaluate an effect if its dependencies are set to the same value", () => {
        const r = reactive("first");
        const spy = vi.fn();
        syncEffect(() => {
            spy(r.value);
        });
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith("first");

        spy.mockClear();

        r.value = "first";
        expect(spy).toBeCalledTimes(0);
    });

    it("re-evaluates an effect after every change operation", () => {
        const r = reactive("first");
        const spy = vi.fn();
        syncEffect(() => {
            spy(r.value);
        });
        expect(spy).toBeCalledTimes(1);
        spy.mockClear();

        r.value = "second";
        r.value = "third";
        expect(spy).toBeCalledTimes(2);
    });

    it("evaluates effects only once per batch", () => {
        const r = reactive("first");
        const spy = vi.fn();
        syncEffect(() => {
            spy(r.value);
        });
        expect(spy).toBeCalledTimes(1);
        spy.mockClear();

        batch(() => {
            r.value = "second";
            r.value = "third";
        });
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith("third");
    });

    it("does not evaluate effects for untracked reads", () => {
        const r = reactive("first");
        const spy = vi.fn();
        syncEffect(() => {
            spy(r.peek());
        });
        expect(spy).toBeCalledTimes(1);

        r.value = "second";
        expect(spy).toBeCalledTimes(1);
    });

    it("can be disposed manually", () => {
        const spy = vi.fn();
        const r = reactive(1);
        const handle = syncEffect(() => {
            spy(r.value);
        });
        expect(spy).toBeCalledTimes(1);

        r.value = 2;
        expect(spy).toBeCalledTimes(2);

        handle.destroy();
        r.value = 3;
        expect(spy).toBeCalledTimes(2);
    });

    it("calls cleanup functions before triggering again", () => {
        const events: string[] = [];

        const r = reactive(1);
        const handle = syncEffect(() => {
            const value = r.value;
            events.push(`enter ${value}`);
            return () => events.push(`exit ${value}`);
        });

        r.value += 1;
        r.value += 2;
        handle.destroy();

        expect(events).toMatchInlineSnapshot(`
          [
            "enter 1",
            "exit 1",
            "enter 2",
            "exit 2",
            "enter 4",
            "exit 4",
          ]
        `);
    });

    it("throws on cycle", () => {
        const r = reactive(1);
        expect(() =>
            syncEffect(() => {
                // Reads and writes r.value, so it triggers its own re-execution.
                // NOTE: use peek or untracked() to "hide" reads or writes from the reactivity system.
                r.value += 1;
            })
        ).toThrowErrorMatchingInlineSnapshot(`[Error: Cycle detected]`);
    });
});

describe("syncEffectOnce", () => {
    it("triggers when reactive dependencies may have changed", () => {
        const r = reactive(1);
        const callbackSpy = vi.fn(() => r.value);
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

    it("can be cleand up", () => {
        const r = reactive(1);
        const spy = vi.fn();

        const handle = syncEffectOnce(() => {
            r.value;
        }, spy);
        expect(spy).toHaveBeenCalledTimes(0);

        handle.destroy();

        // not called since effect was dispose already
        r.value = 2;
        expect(spy).toHaveBeenCalledTimes(0);
    });
});

describe("syncWatch", () => {
    it("triggers when the selector function returns different values", () => {
        const spy = vi.fn();
        const r1 = reactive(1);
        const r2 = reactive(2);
        syncWatch(
            () => [r1.value, r2.value],
            ([v1, v2]) => {
                spy(v1, v2);
            }
        );
        expect(spy).toBeCalledTimes(0);

        r1.value = 3;
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith(3, 2);
    });

    it("triggers initially if 'immediate' is true", () => {
        const spy = vi.fn();
        const r1 = reactive(1);
        const r2 = reactive(2);
        syncWatch(
            () => [r1.value, r2.value],
            ([v1, v2]) => {
                spy(v1, v2);
            },
            { immediate: true }
        );
        expect(spy).toBeCalledTimes(1);

        r1.value = 3;
        expect(spy).toBeCalledTimes(2);
        expect(spy).toBeCalledWith(3, 2);
    });

    it("ignores reactive reads in callback", () => {
        const spy = vi.fn();
        const r1 = reactive(1);
        const r2 = reactive(2);
        syncWatch(
            () => [r1.value] as const,
            ([v1]) => {
                r2.value;
                spy(v1);
            },
            {
                immediate: true
            }
        );
        expect(spy).toBeCalledTimes(1);

        r2.value = 4; // ignored
        expect(spy).toBeCalledTimes(1);
    });

    it("can be disposed", () => {
        const spy = vi.fn();
        const r1 = reactive(1);
        const handle = syncWatch(
            () => [r1.value] as const,
            ([v1]) => {
                spy(v1);
            },
            {
                immediate: true
            }
        );
        expect(spy).toBeCalledTimes(1);

        handle.destroy();
        r1.value = 2; // ignored
        expect(spy).toBeCalledTimes(1);
    });
});
