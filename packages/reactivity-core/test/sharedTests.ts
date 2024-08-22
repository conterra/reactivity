import { afterEach } from "node:test";
import { MockInstance, beforeEach, describe, expect, it, vi } from "vitest";
import { batch, reactive } from "../ReactiveImpl";
import { type syncWatch, type syncEffect } from "../sync";
import * as report from "../utils/reportTaskError";

let errorSpy!: MockInstance | undefined;

export function defineSharedEffectTests(
    effectImpl: typeof syncEffect,
    type: "sync" | "async"
): void {
    describe("shared", () => {
        beforeEach(() => {
            errorSpy = mockErrorReport();
        });
        afterEach(() => {
            vi.restoreAllMocks();
            errorSpy = undefined;
        });

        const doMutation = (fn: () => void) => doMutationImpl(fn, type);

        describe("dependency tracking", () => {
            it("evaluates an effect at least once", async () => {
                const r = reactive(1);
                const spy = vi.fn();
                effectImpl(() => {
                    spy(r.value);
                });

                expect(spy).toBeCalledTimes(1);
            });

            it("re-evaluates an effect if its dependencies change", async () => {
                const r = reactive("first");
                const spy = vi.fn();
                effectImpl(() => {
                    spy(r.value);
                });
                expect(spy).toBeCalledTimes(1);
                expect(spy).toBeCalledWith("first");

                spy.mockClear();

                await doMutation(() => {
                    r.value = "second";
                });
                expect(spy).toBeCalledTimes(1);
                expect(spy).toBeCalledWith("second");
            });

            it("does not re-evaluate an effect if its dependencies are set to the same value", async () => {
                const r = reactive("first");
                const spy = vi.fn();
                effectImpl(() => {
                    spy(r.value);
                });
                expect(spy).toBeCalledTimes(1);
                expect(spy).toBeCalledWith("first");

                spy.mockClear();

                await doMutation(() => {
                    r.value = "first";
                });
                expect(spy).toBeCalledTimes(0);
            });

            it("re-evaluates an effect after every change operation", async () => {
                const r = reactive("first");
                const spy = vi.fn();
                effectImpl(() => {
                    spy(r.value);
                });
                expect(spy).toBeCalledTimes(1);
                spy.mockClear();

                await doMutation(() => (r.value = "second"));
                await doMutation(() => (r.value = "third"));
                expect(spy).toBeCalledTimes(2);
            });

            it("evaluates effects only once per batch", async () => {
                const r = reactive("first");
                const spy = vi.fn();
                effectImpl(() => {
                    spy(r.value);
                });
                expect(spy).toBeCalledTimes(1);
                spy.mockClear();

                await doMutation(() => {
                    batch(() => {
                        r.value = "second";
                        r.value = "third";
                    });
                });
                expect(spy).toBeCalledTimes(1);
                expect(spy).toBeCalledWith("third");
            });

            it("does not evaluate effects for untracked reads", async () => {
                const r = reactive("first");
                const spy = vi.fn();
                effectImpl(() => {
                    spy(r.peek());
                });
                expect(spy).toBeCalledTimes(1);

                await doMutation(() => {
                    r.value = "second";
                });
                expect(spy).toBeCalledTimes(1);
            });

            it("throws on cycle", async () => {
                const r = reactive(1);
                expect(() =>
                    effectImpl(() => {
                        // Reads and writes r.value, so it triggers its own re-execution.
                        // NOTE: use peek or untracked() to "hide" reads or writes from the reactivity system.
                        r.value += 1;
                    })
                ).toThrowErrorMatchingInlineSnapshot(`[Error: Cycle detected]`);
            });

            it("throws when a cycle is detected in a later execution", async () => {
                const v1 = reactive(0);
                const trigger = reactive(false);
                effectImpl(() => {
                    if (!trigger.value) {
                        return;
                    }

                    v1.value = v1.value + 1;
                });

                await expect(
                    doMutation(() => (trigger.value = true))
                ).rejects.toMatchInlineSnapshot(`[Error: Cycle detected]`);
            });
        });

        describe("cleanup", () => {
            it("can be disposed manually", async () => {
                const spy = vi.fn();
                const r = reactive(1);
                const handle = effectImpl(() => {
                    spy(r.value);
                });
                expect(spy).toBeCalledTimes(1);

                await doMutation(() => (r.value = 2));
                expect(spy).toBeCalledTimes(2);

                handle.destroy();
                await doMutation(() => (r.value = 3));
                expect(spy).toBeCalledTimes(2);
            });

            it("calls cleanup functions before triggering again", async () => {
                const events: string[] = [];

                const r = reactive(1);
                const handle = effectImpl(() => {
                    const value = r.value;
                    events.push(`enter ${value}`);
                    return () => events.push(`exit ${value}`);
                });

                await doMutation(() => (r.value += 1));
                await doMutation(() => (r.value += 2));
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

            it("calls cleanup function during dispose", async () => {
                const spy = vi.fn();
                const cleanup = vi.fn();
                const r = reactive(1);
                const handle = effectImpl(() => {
                    spy(r.value);
                    return cleanup;
                });

                handle.destroy();
                expect(spy).toHaveBeenCalledTimes(1);
                expect(cleanup).toHaveBeenCalledTimes(1);
            });

            it("calls cleanup function during dispose in later execution", async () => {
                const spy = vi.fn();
                const cleanup = vi.fn();
                const r = reactive(1);
                const handle = effectImpl(() => {
                    spy(r.value);
                    return cleanup;
                });
                expect(spy).toHaveBeenCalledTimes(1);
                expect(cleanup).toHaveBeenCalledTimes(0);

                await doMutation(() => (r.value = 2));
                expect(spy).toHaveBeenCalledTimes(2);
                expect(cleanup).toHaveBeenCalledTimes(1);

                handle.destroy();
                expect(spy).toHaveBeenCalledTimes(2);
                expect(cleanup).toHaveBeenCalledTimes(2);
            });

            it("does not trigger again once a cleanup function threw an exception", async () => {
                const spy = vi.fn();
                const cleanup = vi.fn().mockImplementation(() => {
                    throw new Error("cleanup error");
                });
                const r = reactive(1);
                effectImpl(() => {
                    spy(r.value);
                    return cleanup;
                });

                expect(spy).toHaveBeenCalledTimes(1);
                expect(cleanup).toHaveBeenCalledTimes(0);

                await expect(
                    doMutation(() => (r.value = 2))
                ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: cleanup error]`);
                expect(cleanup).toHaveBeenCalledTimes(1);
                expect(spy).toHaveBeenCalledTimes(1); // not called again

                // effect is dead
                await doMutation(() => (r.value = 3));
                expect(spy).toHaveBeenCalledTimes(1);
                expect(cleanup).toHaveBeenCalledTimes(1);
            });
        });

        describe("error handling", () => {
            it("does not continue running if the initial execution throws an error", async () => {
                const r = reactive(1);
                const spy = vi.fn();
                expect(() => {
                    effectImpl(() => {
                        spy(r.value);
                        throw new Error("boom");
                    });
                }).toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
                expect(spy).toHaveBeenCalledOnce();

                // Not called again, effect is not running in the background
                await doMutation(() => (r.value += 1));
                expect(spy).toHaveBeenCalledOnce();
            });

            it("continues running after successful setup, even if an error is thrown", async () => {
                const r = reactive(1);
                const spy = vi.fn();
                const handle = effectImpl(() => {
                    spy(r.value);
                    if (r.value > 1) {
                        throw new Error("boom");
                    }
                });
                expect(spy).toHaveBeenCalledTimes(1);

                await expect(
                    doMutation(() => (r.value += 1))
                ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
                expect(spy).toHaveBeenCalledTimes(2);

                await expect(
                    doMutation(() => (r.value += 1))
                ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
                expect(spy).toHaveBeenCalledTimes(3);

                handle.destroy();
                await expect(doMutation(() => (r.value += 1))).resolves.toBe(undefined);
            });
        });
    });
}

export function defineSharedWatchTests(watchImpl: typeof syncWatch, type: "sync" | "async") {
    describe("shared", () => {
        beforeEach(() => {
            errorSpy = mockErrorReport();
        });
        afterEach(() => {
            vi.restoreAllMocks();
            errorSpy = undefined;
        });

        const doMutation = (fn: () => void) => doMutationImpl(fn, type);

        it("triggers when the selector function returns different values", async () => {
            const spy = vi.fn();
            const r1 = reactive(1);
            const r2 = reactive(2);
            watchImpl(
                () => [r1.value, r2.value],
                ([v1, v2]) => {
                    spy(v1, v2);
                }
            );
            expect(spy).toBeCalledTimes(0);

            await doMutation(() => (r1.value = 3));
            expect(spy).toBeCalledTimes(1);
            expect(spy).toBeCalledWith(3, 2);
        });

        it("triggers initially if 'immediate' is true", async () => {
            const spy = vi.fn();
            const r1 = reactive(1);
            const r2 = reactive(2);
            watchImpl(
                () => [r1.value, r2.value],
                ([v1, v2]) => {
                    spy(v1, v2);
                },
                { immediate: true }
            );
            expect(spy).toBeCalledTimes(1);

            await doMutation(() => (r1.value = 3));
            expect(spy).toBeCalledTimes(2);
            expect(spy).toBeCalledWith(3, 2);
        });

        it("ignores reactive reads in callback", async () => {
            const spy = vi.fn();
            const r1 = reactive(1);
            const r2 = reactive(2);
            watchImpl(
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

            await doMutation(() => (r2.value = 4));
            expect(spy).toBeCalledTimes(1);
        });

        it("can be disposed", async () => {
            const spy = vi.fn();
            const r1 = reactive(1);
            const handle = watchImpl(
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
            await doMutation(() => (r1.value = 2));
            expect(spy).toBeCalledTimes(1);
        });

        it("rethrows errors from the initial selector execution and does not continue running", async () => {
            const spy = vi.fn();
            const r = reactive(1);
            expect(() => {
                watchImpl(
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
            await doMutation(() => (r.value += 1));
            expect(spy).toHaveBeenCalledTimes(0);
        });

        it("keeps running even if some selector executions (other than the first) throw an error", async () => {
            const spy = vi.fn();
            const r = reactive(1);
            const handle = watchImpl(
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
            await expect(
                doMutation(() => (r.value += 1))
            ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
            expect(spy).toHaveBeenCalledOnce();

            // recovered, callback gets executed
            await doMutation(() => (r.value += 1));
            expect(spy).toHaveBeenCalledTimes(2);

            // clean destroy, callback no longer gets executed
            handle.destroy();
            await doMutation(() => (r.value += 1));
            expect(spy).toHaveBeenCalledTimes(2);
        });

        it("stops running if the immediate execution of the callback throws", async () => {
            const spy = vi.fn();
            const r = reactive(1);
            expect(() => {
                watchImpl(
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
            await doMutation(() => (r.value += 1));
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it("keeps running if the later executions of the callback throw", async () => {
            const spy = vi.fn();
            const r = reactive(1);
            const handle = watchImpl(
                () => [r.value],
                ([v1]) => {
                    spy(v1);
                    if (v1 == 2) {
                        throw new Error("boom");
                    }
                }
            );
            expect(spy).toHaveBeenCalledTimes(0);

            await expect(
                doMutation(() => (r.value += 1))
            ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: boom]`);
            expect(spy).toHaveBeenCalledTimes(1);

            // Recovers, called again
            await doMutation(() => (r.value += 1));
            expect(spy).toHaveBeenCalledTimes(2);

            // Clean shutdown works
            handle.destroy();
            await doMutation(() => (r.value += 1));
            expect(spy).toHaveBeenCalledTimes(2);
        });

        it("calls cleanup function during dispose", async () => {
            const spy = vi.fn();
            const cleanup = vi.fn();
            const r = reactive(1);
            const handle = watchImpl(
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

        it("calls cleanup function during dispose in later execution", async () => {
            const spy = vi.fn();
            const cleanup = vi.fn();
            const r = reactive(1);
            const handle = watchImpl(
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

            await doMutation(() => (r.value = 2));
            expect(spy).toHaveBeenCalledTimes(2);
            expect(cleanup).toHaveBeenCalledTimes(1);

            handle.destroy();
            expect(spy).toHaveBeenCalledTimes(2);
            expect(cleanup).toHaveBeenCalledTimes(2);
        });

        it("does not trigger again once a cleanup function threw an exception", async () => {
            const spy = vi.fn();
            const cleanup = vi.fn().mockImplementation(() => {
                throw new Error("cleanup error");
            });
            const r = reactive(1);
            watchImpl(
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

            await expect(
                doMutation(() => (r.value = 2))
            ).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: cleanup error]`);
            expect(cleanup).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledTimes(1); // not called again

            // watch is dead
            await doMutation(() => (r.value = 3));
            expect(spy).toHaveBeenCalledTimes(1);
            expect(cleanup).toHaveBeenCalledTimes(1);
        });
    });
}

async function doMutationImpl(fn: () => void, type: "sync" | "async"): Promise<void> {
    if (type === "sync") {
        fn();
    } else if (type === "async") {
        let err: Error | undefined;
        errorSpy!.mockImplementationOnce((e) => (err = e));
        fn();
        await waitForMacroTask();
        if (err) {
            throw err;
        }
    }
}

function waitForMacroTask() {
    return new Promise((resolve) => setTimeout(resolve, 4));
}

function mockErrorReport() {
    const errorSpy = vi.spyOn(report, "reportTaskError").mockImplementation(() => {});
    return errorSpy;
}
