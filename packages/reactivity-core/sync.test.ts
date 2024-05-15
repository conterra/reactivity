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

    it("calls cleanup function during dispose", () => {
        const spy = vi.fn();
        const cleanup = vi.fn();
        const r = reactive(1);
        const handle = syncEffect(() => {
            spy(r.value);
            return cleanup;
        });

        handle.destroy();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("calls cleanup function during dispose in later execution", () => {
        const spy = vi.fn();
        const cleanup = vi.fn();
        const r = reactive(1);
        const handle = syncEffect(() => {
            spy(r.value);
            return cleanup;
        });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(cleanup).toHaveBeenCalledTimes(0);

        r.value = 2;
        expect(spy).toHaveBeenCalledTimes(2);
        expect(cleanup).toHaveBeenCalledTimes(1);

        handle.destroy();
        expect(spy).toHaveBeenCalledTimes(2);
        expect(cleanup).toHaveBeenCalledTimes(2);
    });

    it("does not trigger again once a cleanup function threw an exception", () => {
        const spy = vi.fn();
        const cleanup = vi.fn().mockImplementation(() => {
            throw new Error("cleanup error");
        });
        const r = reactive(1);
        syncEffect(() => {
            spy(r.value);
            return cleanup;
        });

        expect(spy).toHaveBeenCalledTimes(1);
        expect(cleanup).toHaveBeenCalledTimes(0);

        expect(() => r.value = 2).toThrowErrorMatchingInlineSnapshot(`[Error: cleanup error]`);
        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledTimes(1); // not called again

        // effect is dead
        r.value = 3;
        expect(spy).toHaveBeenCalledTimes(1);
        expect(cleanup).toHaveBeenCalledTimes(1);
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

    it("does not continue running if the initial execution throws an error", () => {
        const r = reactive(1);
        const spy = vi.fn();
        expect(() => {
            syncEffect(() => {
                spy(r.value);
                throw new Error("boom");
            });
        }).toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
        expect(spy).toHaveBeenCalledOnce();

        r.value += 1;
        // Not called again, effect is not running in the background
        expect(spy).toHaveBeenCalledOnce();
    });

    it("continues running after successful setup, even if an error is thrown", () => {
        const r = reactive(1);
        const spy = vi.fn();
        const handle = syncEffect(() => {
            spy(r.value);
            if (r.value > 1) {
                throw new Error("boom");
            }
        });
        expect(spy).toHaveBeenCalledTimes(1);

        expect(() => (r.value += 1)).toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
        expect(spy).toHaveBeenCalledTimes(2);

        expect(() => (r.value += 1)).toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
        expect(spy).toHaveBeenCalledTimes(3);

        handle.destroy();
        expect(() => (r.value += 1)).not.toThrowError(); // okay; effect no longer running
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

    it("rethrows errors from the initial selector execution and does not continue running", () => {
        const spy = vi.fn();
        const r = reactive(1);
        expect(() => {
            syncWatch(
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
        expect(spy).toHaveBeenCalledTimes(0);
    });

    it("keeps running even if some selector executions (other than the first) throw an error", () => {
        const spy = vi.fn();
        const r = reactive(1);
        const handle = syncWatch(
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
        expect(() => (r.value += 1)).toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
        expect(spy).toHaveBeenCalledOnce();

        // recovered, callback gets executed
        r.value += 1;
        expect(spy).toHaveBeenCalledTimes(2);

        // clean destroy, callback no longer gets executed
        handle.destroy();
        r.value += 1;
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it("stops running if the immediate execution of the callback throws", () => {
        const spy = vi.fn();
        const r = reactive(1);
        expect(() => {
            syncWatch(
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
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("keeps running if the later executions of the callback throw", () => {
        const spy = vi.fn();
        const r = reactive(1);
        const handle = syncWatch(
            () => [r.value],
            ([v1]) => {
                spy(v1);
                if (v1 == 2) {
                    throw new Error("boom");
                }
            }
        );
        expect(spy).toHaveBeenCalledTimes(0);

        expect(() => (r.value += 1)).toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
        expect(spy).toHaveBeenCalledTimes(1);

        // Recovers, called again
        r.value += 1;
        expect(spy).toHaveBeenCalledTimes(2);

        // Clean shutdown works
        handle.destroy();
        r.value += 1;
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it("calls cleanup function during dispose", () => {
        const spy = vi.fn();
        const cleanup = vi.fn();
        const r = reactive(1);
        const handle = syncWatch(
            () => [r.value],
            ([v1]) => {
                spy(v1);
                return cleanup;
            },
            {
                immediate: true
            }
        );
        expect(spy).toHaveBeenCalledTimes(1);
        expect(cleanup).toHaveBeenCalledTimes(0);
        
        handle.destroy();
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("calls cleanup function during dispose in later execution", () => {
        const spy = vi.fn();
        const cleanup = vi.fn();
        const r = reactive(1);
        const handle = syncWatch(
            () => [r.value],
            ([v1]) => {
                spy(v1);
                return cleanup;
            },
            {
                immediate: true
            }
        );
        expect(spy).toHaveBeenCalledTimes(1);
        expect(cleanup).toHaveBeenCalledTimes(0);

        r.value = 2;
        expect(spy).toHaveBeenCalledTimes(2);
        expect(cleanup).toHaveBeenCalledTimes(1);

        handle.destroy();
        expect(spy).toHaveBeenCalledTimes(2);
        expect(cleanup).toHaveBeenCalledTimes(2);
    });

    it("does not trigger again once a cleanup function threw an exception", () => {
        const spy = vi.fn();
        const cleanup = vi.fn().mockImplementation(() => {
            throw new Error("cleanup error");
        });
        const r = reactive(1);
        syncWatch(
            () => [r.value],
            ([v1]) => {
                spy(v1);
                return cleanup;
            },
            {
                immediate: true
            }
        );

        expect(spy).toHaveBeenCalledTimes(1);
        expect(cleanup).toHaveBeenCalledTimes(0);

        expect(() => r.value = 2).toThrowErrorMatchingInlineSnapshot(`[Error: cleanup error]`);
        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledTimes(1); // not called again

        // watch is dead
        r.value = 3;
        expect(spy).toHaveBeenCalledTimes(1);
        expect(cleanup).toHaveBeenCalledTimes(1);
    });
});
