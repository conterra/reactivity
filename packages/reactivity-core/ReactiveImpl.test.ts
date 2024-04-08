import { describe, expect, it, vi } from "vitest";
import { batch, computed, external, reactive } from "./ReactiveImpl";
import { syncEffect } from "./sync";

// TODO: Test error cases

describe("reactive", () => {
    it("supports setting an initial value", () => {
        const r = reactive(123);
        expect(r.value).toBe(123);
    });

    it("defaults to undefined", () => {
        const r = reactive<number>();
        expect(r.value).toBe(undefined);
    });

    it("supports peeking the current value", () => {
        const r = reactive<number>(123);
        expect(r.peek()).toBe(123);
    });

    it("supports changing the current value", () => {
        const r = reactive(0);
        expect(r.value).toBe(0);
        r.value += 1;
        expect(r.value).toBe(1);
    });

    it("ignores updates using an equal value", () => {
        const r = reactive(
            { foo: 1 },
            {
                equal: (a, b) => a.foo === b.foo
            }
        );

        const oldValue = r.value;
        expect(oldValue.foo).toBe(1);

        r.value = { foo: 1 };
        expect(r.value).toBe(oldValue);

        r.value = { foo: 2 };
        expect(r.value.foo).toBe(2);
    });

    it("supports formatting as a string", () => {
        const r = reactive(0);
        expect(r.toString()).toMatchInlineSnapshot(`"Reactive[value=0]"`);
    });

    it("supports usage in JSON", () => {
        const r = reactive({
            foo: reactive(1),
            bar: reactive("2")
        });
        expect(JSON.stringify(r)).toMatchInlineSnapshot(`"{"foo":1,"bar":"2"}"`);
    });
});

describe("batch", () => {
    it("batches multiple reactive updates into a single effect", () => {
        const spy = vi.fn();
        const r1 = reactive(1);
        const r2 = reactive(2);
        syncEffect(() => {
            spy(r1.value, r2.value);
        });
        expect(spy).toBeCalledTimes(1);

        batch(() => {
            r1.value = 2;
            r2.value = 3;
            expect(spy).toBeCalledTimes(1);
        });
        expect(spy).toBeCalledTimes(2);
    });
});

describe("computed", () => {
    it("derives values from its dependencies", () => {
        const r1 = reactive(1);
        const r2 = reactive(2);
        const c = computed(() => r1.value + r2.value);
        expect(c.value).toBe(3);

        r2.value += 1;
        expect(c.value).toBe(4);
    });

    it("triggers effects when its dependencies change", () => {
        const r1 = reactive(1);
        const r2 = reactive(2);
        const c = computed(() => r1.value + r2.value);

        const spy = vi.fn();
        syncEffect(() => {
            spy(c.value);
        });
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith(3);

        spy.mockClear();
        r1.value = 3;
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith(5);
    });

    it("supports nested usage", () => {
        const x1 = reactive(1);
        const x2 = reactive(1);
        const x = computed(() => x1.value + x2.value);

        const y1 = reactive(1);
        const y2 = reactive(1);
        const y = computed(() => y1.value + y2.value);

        const z = computed(() => x.value + y.value);
        expect(z.value).toBe(4);

        x1.value = 0;
        expect(z.value).toBe(3);
    });

    it("computes values lazily", () => {
        const r = reactive(1);
        const spy = vi.fn(() => r.value * 2);

        const c = computed(spy);
        expect(spy).not.toHaveBeenCalled();

        expect(c.value).toBe(2);
        expect(spy).toBeCalledTimes(1);

        r.value = 3; // c is dirty but not recomputed yet
        expect(spy).toBeCalledTimes(1);

        expect(c.value).toBe(6); // triggers recompute
        expect(spy).toBeCalledTimes(2);
    });

    it("does not propagate updates with equal value", () => {
        const r = reactive(1);
        const c = computed(() => ({ r: Math.abs(r.value) }), {
            equal: (a, b) => a.r === b.r
        });

        const spy = vi.fn();
        syncEffect(() => {
            spy(c.value);
        });

        const oldValue = c.value;
        expect(oldValue).toMatchInlineSnapshot(`
          {
            "r": 1,
          }
        `);
        expect(spy).toHaveBeenCalledOnce();

        r.value = -1;
        const newValue = c.value;
        expect(newValue).toBe(oldValue); // no change
        expect(spy).toHaveBeenCalledOnce(); // no effect triggered
    });
});

describe("external", () => {
    it("accesses the external value", () => {
        const spy = vi.fn().mockReturnValue(1);
        const ext = external(spy);
        expect(ext.value).toBe(1);
        expect(ext.value).toBe(1); // second access -> value is cached
        expect(spy).toHaveBeenCalledOnce();
    });

    it("can integrate 'foreign' state", () => {
        const controller = new AbortController();
        const signal = controller.signal;

        const aborted = external(() => signal.aborted);
        signal.addEventListener("abort", aborted.trigger);
        expect(aborted.value).toBe(false);

        controller.abort();
        expect(aborted.value).toBe(true);
    });

    it("can trigger recomputation", () => {
        const spy = vi.fn().mockReturnValue(1);
        const ext = external(spy);
        expect(ext.value).toBe(1);

        spy.mockClear();
        spy.mockReturnValue(2);

        // ensure that `trigger` does not require `this`
        const trigger = ext.trigger;
        trigger();

        // invalidate implementation based on boolean toggle (reverts to original but is still "dirty").
        trigger();

        expect(spy).toHaveBeenCalledTimes(0); // lazy
        expect(ext.value).toBe(2);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("triggers effects on change", () => {
        const provider = vi.fn().mockReturnValue(1);
        const ext = external(provider);
        const spy = vi.fn();
        syncEffect(() => {
            spy(ext.value);
        });
        expect(spy).toHaveBeenCalledTimes(1);

        ext.trigger();
        expect(spy).toHaveBeenCalledTimes(1); // no actual change

        provider.mockReturnValue(2);
        ext.trigger();
        expect(spy).toHaveBeenCalledTimes(2); // called after change
    });
});
