import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { reactive } from "./ReactiveImpl";
import { effect, watch } from "./async";

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("effect", () => {
    it("re-executes the callback asynchronously", () => {
        const r = reactive(0);
        const spy = vi.fn();

        effect(() => {
            spy(r.value);
        });
        expect(spy).toHaveBeenCalledTimes(1); // initial setup call
        expect(spy.mock.lastCall![0]).toBe(0);

        r.value = 1;
        expect(spy).toHaveBeenCalledTimes(1); // _not_ called again

        step();
        expect(spy).toHaveBeenCalledTimes(2); // called after delay
        expect(spy.mock.lastCall![0]).toBe(1);
    });

    it("ensures that multiple small changes only trigger one re-execution", () => {
        const r1 = reactive(0);
        const r2 = reactive(10);
        const spy = vi.fn();

        effect(() => {
            spy(r1.value, r2.value);
        });
        expect(spy).toHaveBeenCalledTimes(1); // initial setup call
        expect(spy.mock.lastCall).toEqual([0, 10]);

        r1.value = 1;
        r1.value = 2;
        r2.value = 21;
        r2.value = 22;
        step();
        expect(spy).toHaveBeenCalledTimes(2); // called after delay
        expect(spy.mock.lastCall).toEqual([2, 22]);
    });

    it("can be disposed", () => {
        const r = reactive(0);
        const spy = vi.fn();

        const handle = effect(() => {
            spy(r.value);
        });
        expect(spy).toHaveBeenCalledTimes(1);
        handle.destroy();

        r.value = 2;
        step();
        expect(spy).toHaveBeenCalledTimes(1); // not called again
    });

    it("can be disposed while an execution is already scheduled", () => {
        const r = reactive(0);
        const spy = vi.fn();

        const handle = effect(() => {
            spy(r.value);
        });
        expect(spy).toHaveBeenCalledTimes(1);
        r.value = 2; // triggers execution

        handle.destroy();
        step();
        expect(spy).toHaveBeenCalledTimes(1); // not called again
    });
});

describe("watch", () => {
    it("triggers when the selector function returns different values", () => {
        const spy = vi.fn();
        const r1 = reactive(1);
        const r2 = reactive(2);
        watch(
            () => [r1.value, r2.value],
            ([v1, v2]) => {
                spy(v1, v2);
            }
        );
        expect(spy).toBeCalledTimes(0);

        r1.value = 3;
        expect(spy).toBeCalledTimes(0); // async

        step();
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith(3, 2);
    });

    it("triggers initially if 'immediate' is true", () => {
        const spy = vi.fn();
        const r1 = reactive(1);
        const r2 = reactive(2);
        watch(
            () => [r1.value, r2.value],
            ([v1, v2]) => {
                spy(v1, v2);
            },
            { immediate: true }
        );
        expect(spy).toBeCalledTimes(0); // async

        step();
        expect(spy).toBeCalledTimes(1);
    });

    it("can be disposed", () => {
        const spy = vi.fn();
        const r1 = reactive(1);
        const handle = watch(
            () => [r1.value] as const,
            ([v1]) => {
                spy(v1);
            }
        );
        expect(spy).toBeCalledTimes(0);

        handle.destroy();

        r1.value = 2; // ignored
        step();
        expect(spy).toBeCalledTimes(0);
    });

    it("can be disposed while a callback is scheduled", () => {
        const spy = vi.fn();
        const r1 = reactive(1);
        const handle = watch(
            () => [r1.value] as const,
            ([v1]) => {
                spy(v1);
            }
        );
        expect(spy).toBeCalledTimes(0);
        r1.value = 2; // ignored
        handle.destroy();

        step();
        expect(spy).toBeCalledTimes(0);
    });
});

function step() {
    vi.advanceTimersByTime(10);
}
