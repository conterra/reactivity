import { afterEach, describe, expect, it, vi } from "vitest";
import { reactive } from "./ReactiveImpl";
import { effect, watch } from "./async";
import * as utils from "./utils";

afterEach(() => {
    vi.restoreAllMocks();
});

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

    it("throws when a cycle is detected", async () => {
        const v1 = reactive(0);
        expect(() => {
            effect(() => {
                v1.value = v1.value + 1;
            });
        }).toThrowError(/Cycle detected/);
    });

    it("throws when a cycle is detected in a later execution", async () => {
        const errorSpy = mockErrorReport();

        const v1 = reactive(0);
        const trigger = reactive(false);
        effect(() => {
            if (!trigger.value) {
                return;
            }

            v1.value = v1.value + 1;
        });
        expect(errorSpy).toHaveBeenCalledTimes(0);

        trigger.value = true;
        await waitForMacroTask();
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy.mock.lastCall![0]).toMatchInlineSnapshot(`[Error: Cycle detected]`);
    });

    it("does not continue running if the initial execution throws an error", async () => {
        const r = reactive(1);
        const spy = vi.fn();
        expect(() => {
            effect(() => {
                spy(r.value);
                throw new Error("boom");
            });
        }).toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
        expect(spy).toHaveBeenCalledOnce();

        // Not called again, effect is not running in the background
        r.value += 1;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledOnce();
    });

    it("continues running after successful setup, even if an error is thrown", async () => {
        const errorSpy = mockErrorReport();

        const r = reactive(1);
        const spy = vi.fn();
        const handle = effect(() => {
            spy(r.value);
            if (r.value == 2) {
                throw new Error("boom");
            }
        });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledTimes(0);

        // increment trigger async error
        r.value += 1;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(2);
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy.mock.lastCall![0]).toMatchInlineSnapshot(`[Error: boom]`);

        // Executes again (without an error)
        r.value += 1;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(3);
        expect(errorSpy).toHaveBeenCalledTimes(1);

        // Clean shutdown, not called again.
        handle.destroy();
        r.value += 1;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(3);
        expect(errorSpy).toHaveBeenCalledTimes(1);
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

    it("rethrows errors from the initial selector execution and does not continue running", async () => {
        const spy = vi.fn();
        const r = reactive(1);
        expect(() => {
            watch(
                (): [number] => {
                    r.value;
                    throw new Error("boom");
                },
                ([v1]) => {
                    spy(v1);
                }
            );
        }).toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);

        // callback never invoked because of error during setup
        r.value += 1;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(0);
    });

    it("keeps running even if some selector executions (other than the first) throw an error", async () => {
        const errorSpy = mockErrorReport();

        const spy = vi.fn();
        const r = reactive(1);
        const handle = watch(
            () => {
                const result = r.value;
                if (result == 2) {
                    throw new Error("boom");
                }
                return [result];
            },
            ([v1]) => {
                spy(v1);
            },
            {
                immediate: true
            }
        );
        expect(spy).toHaveBeenCalledOnce();

        // value == 2 -> error and no additional callback execution
        r.value += 1;
        await waitForMacroTask();
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy.mock.lastCall![0]).toMatchInlineSnapshot(`[Error: boom]`);
        expect(spy).toHaveBeenCalledOnce();

        // recovered, callback gets executed
        r.value += 1;
        await waitForMacroTask();
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledTimes(2);

        // clean destroy, callback no longer gets executed
        handle.destroy();
        r.value += 1;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it("stops running if the immediate execution of the callback throws", async () => {
        const spy = vi.fn();
        const r = reactive(1);
        expect(() => {
            watch(
                () => [r.value],
                ([v1]) => {
                    spy(v1);
                    throw new Error("boom");
                },
                { immediate: true }
            );
        }).toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
        expect(spy).toHaveBeenCalledTimes(1);

        // Not called again, watch is not running
        r.value += 1;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("keeps running if the later executions of the callback throw", async () => {
        const errorSpy = mockErrorReport();

        const spy = vi.fn();
        const r = reactive(1);
        const handle = watch(
            () => [r.value],
            ([v1]) => {
                spy(v1);
                if (v1 == 2) {
                    throw new Error("boom");
                }
            }
        );
        expect(spy).toHaveBeenCalledTimes(0);

        // Triggers error
        r.value += 1;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy.mock.lastCall![0]).toMatchInlineSnapshot(`[Error: boom]`);

        // Recovers, called again
        r.value += 1;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(2);
        expect(errorSpy).toHaveBeenCalledTimes(1);

        // Clean shutdown works
        handle.destroy();
        r.value += 1;
        await waitForMacroTask();
        expect(spy).toHaveBeenCalledTimes(2);
    });
});

function waitForMacroTask() {
    return new Promise((resolve) => setTimeout(resolve, 10));
}

function mockErrorReport() {
    const errorSpy = vi.spyOn(utils, "reportTaskError").mockImplementation(() => {});
    return errorSpy;
}
