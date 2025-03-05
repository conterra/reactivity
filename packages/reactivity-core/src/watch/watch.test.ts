import { afterEach } from "node:test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { batch, reactive } from "../signals";
import { syncWatch, syncWatchValue, watch, watchValue } from "./watch";
import { doMutation as doMutationImpl, setupDoMutation } from "../test/doMutation";
import { nextTick } from "../utils/dispatch";

describe("sync", () => {
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

describe("async", () => {
    defineSharedWatchTests(watch, watchValue, "async");

    describe("specifics", () => {
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

            await nextTick();
            expect(spy).toBeCalledTimes(0);
        });

        it("triggers with a delay", async () => {
            const spy = vi.fn();
            const r1 = reactive(1);
            watch(
                () => [r1.value] as const,
                ([v1]) => {
                    spy(v1);
                }
            );
            expect(spy).toBeCalledTimes(0);

            r1.value = 2;
            expect(spy).toBeCalledTimes(0);

            await nextTick();
            expect(spy).toBeCalledTimes(1);
        });
    });
});

function defineSharedWatchTests(
    watchImpl: typeof syncWatch,
    watchValueImpl: typeof syncWatchValue,
    type: "sync" | "async"
) {
    describe("shared", () => {
        beforeEach(() => {
            setupDoMutation();
        });
        afterEach(() => {
            vi.restoreAllMocks();
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

        it("ignores updates that return the same value", async () => {
            const spy = vi.fn();
            const r1 = reactive(1);
            const r2 = reactive(2);
            watchImpl(
                () => [r1.value + r2.value],
                ([sum]) => {
                    spy(sum);
                }
            );
            expect(spy).toBeCalledTimes(0);

            await doMutation(() => {
                batch(() => {
                    r1.value = 2;
                    r2.value = 1;
                });
            });
            expect(spy).toBeCalledTimes(0);
        });

        it("does not consider NaN values differently", async () => {
            const spy = vi.fn();
            const r = reactive(1);
            watchImpl(
                () => {
                    r.value;
                    return [NaN]; // NaN !== NaN but Object.is(NaN, NaN)
                },
                ([v]) => {
                    spy(v);
                }
            );
            expect(spy).toBeCalledTimes(0);

            await doMutation(() => {
                batch(() => {
                    r.value = 2;
                });
            });
            expect(spy).toBeCalledTimes(0); // still NaN
        });

        it("passes the previous values to the callback", async () => {
            const spy = vi.fn();
            const r = reactive(1);
            watchImpl(
                () => [r.value],
                ([v], [ov]) => {
                    spy(v, ov);
                }
            );
            expect(spy).toBeCalledTimes(0);

            await doMutation(() => (r.value = 2));
            expect(spy).toBeCalledTimes(1);
            expect(spy).toBeCalledWith(2, 1); // 1 is the original value
        });

        it("supports custom equality", async () => {
            const spy = vi.fn();
            const equalsIgnoreCase = ([a]: [string], [b]: [string]) =>
                a.toLowerCase() === b.toLowerCase();

            const str = reactive("foo");
            watchImpl(
                () => [str.value],
                ([str], [oldStr]) => {
                    spy(str, oldStr);
                },
                {
                    equal: equalsIgnoreCase
                }
            );
            expect(spy).toHaveBeenCalledTimes(0);

            await doMutation(() => (str.value = "FOO"));
            expect(spy).toHaveBeenCalledTimes(0); // "FOO" is ignored

            await doMutation(() => (str.value = "bar"));
            expect(spy).toHaveBeenCalledTimes(1); // "bar" is different
            expect(spy).toHaveBeenCalledWith("bar", "foo"); // sees "foo" not "FOO" since that execution was skipped
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

        it("passes undefined as previous value for immediate executions", async () => {
            const spy = vi.fn();
            const r = reactive(1);
            watchImpl(
                () => [r.value],
                ([v], old) => {
                    spy(v, old);
                },
                {
                    immediate: true
                }
            );
            expect(spy).toBeCalledTimes(1);
            expect(spy).toBeCalledWith(1, undefined);

            await doMutation(() => (r.value = 2));
            expect(spy).toBeCalledTimes(2);
            expect(spy).toBeCalledWith(2, [1]);
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

        it("supports single values", async () => {
            const spy = vi.fn();
            const r1 = reactive(1);
            const r2 = reactive(2);
            watchValueImpl(
                () => r1.value + r2.value,
                (sum, oldSum) => {
                    spy(sum, oldSum);
                }
            );
            expect(spy).toBeCalledTimes(0);

            await doMutation(() => {
                batch(() => {
                    r1.value = 2;
                    r2.value = 1;
                });
            });
            expect(spy).toBeCalledTimes(0);

            await doMutation(() => {
                r1.value = 3;
            });
            expect(spy).toBeCalledTimes(1);
            expect(spy).toBeCalledWith(4, 3);

            await doMutation(() => {
                r2.value = 2;
            });
            expect(spy).toBeCalledTimes(2);
            expect(spy).toBeCalledWith(5, 4);
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
            }).toThrow(`boom`);

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
            await expect(doMutation(() => (r.value += 1))).rejects.toThrow(`boom`);
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
            }).toThrow(`boom`);
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

            await expect(doMutation(() => (r.value += 1))).rejects.toThrow(`boom`);
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

            await expect(doMutation(() => (r.value = 2))).rejects.toThrowError(`cleanup error`);
            expect(cleanup).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledTimes(1); // not called again

            // watch is dead
            await doMutation(() => (r.value = 3));
            expect(spy).toHaveBeenCalledTimes(1);
            expect(cleanup).toHaveBeenCalledTimes(1);
        });

        describe("watch context", () => {
            it("supports self-destruction in initial run", async () => {
                const spy = vi.fn();
                const cleanup = vi.fn();
                const r = reactive(1);
                watchImpl(
                    () => [r.value],
                    (current, _old, ctx) => {
                        spy(current);
                        ctx.destroy();
                        return cleanup;
                    },
                    {
                        immediate: true
                    }
                );
                expect(spy).toHaveBeenCalledTimes(1);
                expect(cleanup).toHaveBeenCalledTimes(1);

                // Effect is no longer running.
                await doMutation(() => (r.value = 2));
                expect(spy).toHaveBeenCalledTimes(1);
                expect(cleanup).toHaveBeenCalledTimes(1);
            });

            it("supports self-destruction in later run", async () => {
                const spy = vi.fn();
                const cleanup = vi.fn();
                const r = reactive(1);
                watchImpl(
                    () => [r.value],
                    ([current], _old, ctx) => {
                        spy(current);
                        if (current > 1) {
                            ctx.destroy();
                        }
                        return cleanup;
                    },
                    {
                        immediate: true
                    }
                );
                expect(spy).toHaveBeenCalledTimes(1);
                expect(cleanup).toHaveBeenCalledTimes(0);

                // Triggers watch and destroy()
                await doMutation(() => (r.value = 2));
                expect(spy).toHaveBeenCalledTimes(2);
                expect(cleanup).toHaveBeenCalledTimes(2);
            });
        });
    });
}
