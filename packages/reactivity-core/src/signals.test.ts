// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, Mock, vi } from "vitest";
import { effect } from "./effect";
import { batch, computed, external, linked, reactive, synchronized } from "./signals";
import { EffectCallback, ReadonlyReactive } from "./types";
import { watchValue } from "./watch";

const SYNC_EFFECT = (cb: EffectCallback) => effect(cb, { dispatch: "sync" });

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

    it("triggers effect on change", () => {
        const r = reactive(0);
        const spy = vi.fn();
        SYNC_EFFECT(() => {
            spy(r.value);
        });
        expect(spy).toBeCalledTimes(1);

        r.value = 1;
        expect(spy).toBeCalledTimes(2);
    });

    it("does not consider NaNs as different values", () => {
        const r = reactive(NaN);
        const spy = vi.fn();
        SYNC_EFFECT(() => {
            spy(r.value);
        });
        expect(spy).toBeCalledTimes(1);

        r.value = NaN;
        expect(spy).toBeCalledTimes(1);
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

    it("notifies on watch and unwatch", () => {
        const watched = vi.fn();
        const unwatched = vi.fn();
        const signal = reactive(1, {
            watched,
            unwatched
        });
        testWatch(signal, watched, unwatched);
    });
});

describe("batch", () => {
    it("batches multiple reactive updates into a single effect", () => {
        const spy = vi.fn();
        const r1 = reactive(1);
        const r2 = reactive(2);
        SYNC_EFFECT(() => {
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
        SYNC_EFFECT(() => {
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
        SYNC_EFFECT(() => {
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

    it("throws error from compute function", () => {
        let count = 0;
        const boom = computed(() => {
            count++;
            throw new Error("boom");
        });

        expect(() => boom.value).toThrowError("boom");
        expect(count).toBe(1);

        expect(() => boom.value).toThrowError("boom");
        expect(count).toBe(1); // error is cached
    });

    it("remains usable after compute has thrown", () => {
        const doThrow = reactive(true);
        let count = 0;
        const boom = computed(() => {
            count++;
            if (doThrow.value) {
                throw new Error("boom");
            }
            return "ok";
        });

        // Throws initially
        expect(() => boom.value).toThrowError("boom");
        expect(count).toBe(1);

        // Recovers and no longer throws
        doThrow.value = false;
        expect(count).toBe(1);
        expect(boom.value).toBe("ok");
        expect(count).toBe(2);
    });

    it("notifies on watch and unwatch", () => {
        const watched = vi.fn();
        const unwatched = vi.fn();
        const signal = computed(() => 1, {
            watched,
            unwatched
        });
        testWatch(signal, watched, unwatched);
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
        SYNC_EFFECT(() => {
            spy(ext.value);
        });
        expect(spy).toHaveBeenCalledTimes(1);

        ext.trigger();
        expect(spy).toHaveBeenCalledTimes(1); // no actual change

        provider.mockReturnValue(2);
        ext.trigger();
        expect(spy).toHaveBeenCalledTimes(2); // called after change
    });

    it("throws error from compute function", () => {
        let count = 0;
        const boom = external(() => {
            count++;
            throw new Error("boom");
        });

        expect(() => boom.value).toThrowError("boom");
        expect(count).toBe(1);

        expect(() => boom.value).toThrowError("boom");
        expect(count).toBe(1); // error is cached
    });

    it("remains usable after compute has thrown", () => {
        let doThrow = true;
        let count = 0;
        const boom = external(() => {
            count++;
            if (doThrow) {
                throw new Error("boom");
            }
            return "ok";
        });

        // Throws initially
        expect(() => boom.value).toThrowError("boom");
        expect(count).toBe(1);

        // Recovers and no longer throws
        doThrow = false;
        boom.trigger();
        expect(count).toBe(1);
        expect(boom.value).toBe("ok");
        expect(count).toBe(2);
    });

    it("notifies on watch and unwatch", () => {
        const watched = vi.fn();
        const unwatched = vi.fn();
        const signal = external(() => 1, {
            watched,
            unwatched
        });
        testWatch(signal, watched, unwatched);
    });
});

describe("synchronized", () => {
    it("always accesses the data source when not watched", () => {
        const getter = vi.fn().mockReturnValue(123);
        const sync = synchronized(getter, () => {
            throw new Error("not called");
        });
        expect(getter).toHaveBeenCalledTimes(0);

        expect(sync.value).toBe(123);
        expect(getter).toHaveBeenCalledTimes(1);

        expect(sync.value).toBe(123);
        expect(getter).toHaveBeenCalledTimes(2); // NOT cached
    });

    it("subscribes to the data source when watched", () => {
        const getter = vi.fn().mockReturnValue(123);
        const unsubscribe = vi.fn();
        const subscribe = vi.fn().mockReturnValue(unsubscribe);

        const sync = synchronized(getter, subscribe);
        expect(getter).toHaveBeenCalledTimes(0);
        expect(subscribe).toHaveBeenCalledTimes(0);

        const { destroy } = SYNC_EFFECT(() => sync.value);
        expect(getter).toHaveBeenCalledTimes(1);
        expect(subscribe).toHaveBeenCalledTimes(1);

        const { destroy: destroy2 } = SYNC_EFFECT(() => sync.value);
        expect(getter).toHaveBeenCalledTimes(1); // cached
        expect(subscribe).toHaveBeenCalledTimes(1); // not called again for second active effect

        destroy2();
        expect(unsubscribe).toHaveBeenCalledTimes(0);

        destroy();
        expect(unsubscribe).toHaveBeenCalledTimes(1);

        sync.value;
        expect(getter).toHaveBeenCalledTimes(2); // called again
    });

    it("notifies watchers when the data source changes", () => {
        const ds = new DataSource(0);
        const getter = vi.fn(() => ds.value);
        const sync = synchronized(getter, (cb) => ds.subscribe(cb));

        // not subscribed yet
        expect(ds.listener).toBe(undefined);

        // setup effect
        const spy = vi.fn();
        SYNC_EFFECT(() => {
            spy(sync.value);
        });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenLastCalledWith(0);
        expect(ds.listener).toBeDefined();
        expect(getter).toHaveBeenCalledTimes(1);

        // data is cached
        sync.value;
        expect(getter).toHaveBeenCalledTimes(1);

        // update data source
        ds.value = 1;
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenLastCalledWith(1);
        expect(getter).toHaveBeenCalledTimes(2);
    });

    // See this comment:
    // https://github.com/tc39/proposal-signals/issues/237#issuecomment-2346834056
    //
    // The values here are different from the linked comment (some got lost).
    // This is because preact-signals probes the first dependency of `result`
    // and re-evaluates `sync` one additional time.
    //
    // This is probably not a show stopper because the signal just re-validates more often than necessary.
    // It would be more of a problem if it would cache too aggressively.
    it("has weird behavior if the data source has side effects", () => {
        let count = 0;
        const sync = synchronized(
            () => count++,
            () => () => {}
        );
        const dep1 = computed(() => sync.value);
        const dep2 = computed(() => sync.value);
        const result = computed(() => `${dep1.value},${dep1.value},${dep2.value},${dep2.value}`);
        expect(result.value).toMatchInlineSnapshot(`"0,2,3,5"`);

        const { destroy } = SYNC_EFFECT(() => {
            expect(result.value).toMatchInlineSnapshot(`"6,6,6,6"`);
        });
        destroy();

        expect(result.value).toMatchInlineSnapshot(`"10,12,13,15"`);
    });

    it("does not cache computes across many levels", () => {
        const source = new DataSource(1);
        const sync = synchronized(
            () => source.value,
            () => {
                throw new Error("not called");
            }
        );

        const c1 = computed(() => sync.value);
        const c2 = computed(() => c1.value);
        const c3 = computed(() => c2.value);
        const c4 = computed(() => c3.value + c2.value);
        expect(c4.value).toBe(2);
        expect(source.getterCalled).toMatchInlineSnapshot(`2`);

        // High number of re-computations probably due to re-validation of
        // dependencies (see previous test).
        // As long as the value is correct, this is not a major problem.
        source.value = 2;
        expect(c4.value).toBe(4);
        expect(source.getterCalled).toMatchInlineSnapshot(`8`);

        source.value = 3;
        expect(c4.value).toBe(6);
        expect(source.getterCalled).toMatchInlineSnapshot(`14`);
    });

    it("does cache computes across many levels if the synchronized signal is watched", () => {
        const source = new DataSource(1);
        const sync = synchronized(
            () => source.value,
            (callback) => {
                const handle = source.subscribe(callback);
                return () => handle();
            }
        );

        const c1 = computed(() => sync.value);
        const c2 = computed(() => c1.value);
        const c3 = computed(() => c2.value);
        const c4 = computed(() => c3.value + c2.value);

        const watchHandle = watchValue(
            () => c4.value,
            () => {},
            {
                dispatch: "sync"
            }
        );
        expect(c4.value).toBe(2);
        expect(c4.value).toBe(2);
        expect(source.getterCalled).toMatchInlineSnapshot(`1`);

        source.value = 2;
        expect(c4.value).toBe(4);
        expect(c4.value).toBe(4);
        expect(source.getterCalled).toMatchInlineSnapshot(`2`);

        source.value = 3;
        expect(c4.value).toBe(6);
        expect(c4.value).toBe(6);
        expect(source.getterCalled).toMatchInlineSnapshot(`3`);

        watchHandle.destroy();
    });

    it("notifies on watch and unwatch", () => {
        const watched = vi.fn();
        const unwatched = vi.fn();
        const signal = synchronized(
            () => 1,
            () => () => undefined,
            {
                watched,
                unwatched
            }
        );
        testWatch(signal, watched, unwatched);
    });
});

describe("linked", () => {
    it("resets to valid value if source changes", () => {
        const options = reactive<string[]>(["a", "b", "c"]);
        const source = vi.fn(() => options.value[0]);

        const currentOption = linked(source);

        // Initial value from getter
        expect(source).toHaveBeenCalledTimes(0); // lazy
        expect(currentOption.value).toBe("a");
        expect(source).toHaveBeenCalledTimes(1); // first access

        // Cached, no recomputation
        expect(currentOption.value).toBe("a");
        expect(source).toHaveBeenCalledTimes(1);

        // Changing the source resets the current option
        options.value = ["1", "2", "3"];
        expect(currentOption.value).toBe("1");
        expect(source).toHaveBeenCalledTimes(2); // recomputed
    });

    it("can change value while source does not change", () => {
        const options = reactive<string[]>(["a", "b", "c"]);

        // getSource is called after _every_ (source / value) change with the current implementation.
        const getSource = vi.fn(() => options.value[0]);

        const currentOption = linked(getSource);
        expect(currentOption.value).toBe("a");
        expect(getSource).toHaveBeenCalledTimes(1);

        currentOption.value = "b";
        expect(currentOption.value).toBe("b");
        expect(getSource).toHaveBeenCalledTimes(2);

        currentOption.value = "c";
        expect(currentOption.value).toBe("c");
        expect(getSource).toHaveBeenCalledTimes(3);

        options.value = ["1", "2", "3"];
        expect(currentOption.value).toBe("1"); // reset to first value
        expect(getSource).toHaveBeenCalledTimes(4);
    });

    it("can preserve the previous value if it's still present in the source", () => {
        const options = reactive<string[]>(["a", "b", "c"]);

        const reset = vi.fn((options: string[], prev: string | undefined): string => {
            if (prev && options.includes(prev)) {
                return prev;
            }
            return options[0]!;
        });
        const currentOption = linked(() => options.value, reset);

        expect(currentOption.value).toBe("a");
        expect(reset).toHaveBeenCalledTimes(1);

        currentOption.value = "b";
        expect(currentOption.value).toBe("b");
        expect(reset).toHaveBeenCalledTimes(1);

        options.value = ["1", "2", "b"];
        expect(currentOption.value).toBe("b"); // still b
        expect(reset).toHaveBeenCalledTimes(2);

        options.value = ["1", "2", "3"];
        expect(currentOption.value).toBe("1"); // back to first item
        expect(reset).toHaveBeenCalledTimes(3);
    });

    it("ensures that the latest write wins when the source changed in the meantime", () => {
        const options = reactive<string[]>(["a", "b", "c"]);
        const source = vi.fn(() => options.value);

        const reset = vi.fn((options: string[], prev: string | undefined): string => {
            if (prev && options.includes(prev)) {
                return prev;
            }
            return options[0]!;
        });

        const currentOption = linked(source, reset);
        expect(currentOption.value).toBe("a");
        expect(source).toHaveBeenCalledTimes(1);
        expect(reset).toHaveBeenCalledTimes(1);

        // Linked signals are lazy, source() was not called yet
        options.value = ["1", "2", "3"];
        expect(source).toHaveBeenCalledTimes(1);

        currentOption.value = "X";
        expect(currentOption.value).toBe("X");
        expect(source).toHaveBeenCalledTimes(3); // must be >= 2; 3 is implementation weirdness
        expect(reset).toHaveBeenCalledTimes(2);
    });

    it("does not update the value if equal", () => {
        interface User {
            id: string;
        }

        const users = reactive<User[]>([{ id: "a" }, { id: "b" }, { id: "c" }]);
        const currentUser = linked(() => users.value[0], { equal: (a, b) => a?.id === b?.id });

        const firstUser = users.value[0]!;
        expect(currentUser.value).toBe(firstUser);

        currentUser.value = { id: "a" };
        expect(currentUser.value).toBe(firstUser); // no change (equal)

        currentUser.value = { id: "b" };
        expect(currentUser.value.id).toBe("b"); // did change

        currentUser.value = users.value[1];
        expect(currentUser.value).not.toBe(users.value[1]); // no change (equal)
    });

    it("emits change events when source or value changes", () => {
        const events: string[] = [];
        const options = reactive<string[]>(["a", "b", "c"]);
        const currentOption = linked(() => options.value[0]);

        SYNC_EFFECT(() => {
            events.push(currentOption.value ?? "<undefined>");
        });
        expect(events).toEqual(["a"]);

        currentOption.value = "b";
        expect(events).toEqual(["a", "b"]);

        options.value = ["1", "2", "3"];
        expect(events).toEqual(["a", "b", "1"]);
    });

    it("notifies on watch and unwatch", () => {
        const watched = vi.fn();
        const unwatched = vi.fn();
        const signal = linked(() => 1, {
            watched,
            unwatched
        });
        testWatch(signal, watched, unwatched);
    });
});

class DataSource {
    #listener: (() => void) | undefined;
    #value: number;
    getterCalled = 0;

    constructor(value = 0) {
        this.#value = value;
    }

    get listener() {
        return this.#listener;
    }

    get value() {
        this.getterCalled++;
        return this.#value;
    }

    set value(value: number) {
        if (value !== this.#value) {
            this.#value = value;
            this.#listener?.();
        }
    }

    subscribe(listener: () => void) {
        if (this.#listener) {
            throw new Error("Already subscribed");
        }

        this.#listener = listener;
        return () => {
            if (this.#listener !== listener) {
                throw new Error("Invalid unsubscribe call");
            }
            this.#listener = undefined;
        };
    }
}

function testWatch(signal: ReadonlyReactive<unknown>, watched: Mock, unwatched: Mock) {
    expect(watched).not.toHaveBeenCalled();
    expect(unwatched).not.toHaveBeenCalled();

    // Signal becomes watched
    const handle = SYNC_EFFECT(() => {
        signal.value;
    });
    expect(watched).toHaveBeenCalledTimes(1);
    expect(unwatched).not.toHaveBeenCalled();

    // Second watcher doesn't do anything
    const handle2 = SYNC_EFFECT(() => {
        signal.value;
    });
    expect(watched).toHaveBeenCalledTimes(1);
    expect(unwatched).not.toHaveBeenCalled();

    handle2.destroy();
    expect(watched).toHaveBeenCalledTimes(1);
    expect(unwatched).not.toHaveBeenCalled();

    // Signal is no longer watched
    handle.destroy();
    expect(watched).toHaveBeenCalledTimes(1);
    expect(unwatched).toHaveBeenCalledTimes(1);
}
