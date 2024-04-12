import { describe, expect, it, vi } from "vitest";
import { reactive } from "./ReactiveImpl";
import { effect, watch } from "./async";

describe("effect", () => {
    it("re-executes the callback asynchronously", async () => {
        const r = reactive(0);
        const spy = vi.fn();

        effect(() => {
            spy(r.value);
        });
        expect(spy).toHaveBeenCalledTimes(1); // initial setup call
        expect(spy.mock.lastCall![0]).toBe(0);

        r.value = 1;
        expect(spy).toHaveBeenCalledTimes(1); // _not_ called again

        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(2); // called after delay
        expect(spy.mock.lastCall![0]).toBe(1);
    });

    it("ensures that multiple small changes only trigger one re-execution", async () => {
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
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(2); // called after delay
        expect(spy.mock.lastCall).toEqual([2, 22]);
    });

    it("can be disposed", async () => {
        const r = reactive(0);
        const spy = vi.fn();

        const handle = effect(() => {
            spy(r.value);
        });
        expect(spy).toHaveBeenCalledTimes(1);
        handle.destroy();

        r.value = 2;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(1); // not called again
    });

    it("can be disposed while an execution is already scheduled", async () => {
        const r = reactive(0);
        const spy = vi.fn();

        const handle = effect(() => {
            spy(r.value);
        });
        expect(spy).toHaveBeenCalledTimes(1);
        r.value = 2; // triggers execution

        handle.destroy();
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(1); // not called again
    });
});

describe("watch", () => {
    it("triggers when the selector function returns different values", async () => {
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

        await waitForMacroTask();
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledTimes(1);
        expect(spy).toBeCalledWith(3, 2);
    });

    it("triggers initially if 'immediate' is true", async () => {
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
        expect(spy).toBeCalledTimes(1); // sync

        await waitForMacroTask();
        expect(spy).toBeCalledTimes(1);
    });

    it("can be disposed", async () => {
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
        await waitForMacroTask();
        expect(spy).toBeCalledTimes(0);
    });

    it("can be disposed while a callback is scheduled", async () => {
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

        await waitForMacroTask();
        expect(spy).toBeCalledTimes(0);
    });
});

function waitForMacroTask() {
    return new Promise((resolve) => setTimeout(resolve, 10));
}
