import * as core from "@conterra/reactivity-core";
import { batch, nextTick, reactive } from "@conterra/reactivity-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emit, emitter, on, onSync, EventSource } from "./events";

afterEach(() => {
    vi.restoreAllMocks();
});

it("supports typed events", () => {
    const click = emitter<ClickEvent>();
    const observed: ClickEvent[] = [];
    onSync(click, (event) => {
        observed.push(event);
    });
    emit(click, { x: 1, y: 2 });
    emit(click, { x: 3, y: 4 });
    expect(observed).toEqual([
        { x: 1, y: 2 },
        { x: 3, y: 4 }
    ]);
});

it("supports void events", () => {
    const click = emitter();
    let observed = 0;
    onSync(click, () => {
        observed++;
    });
    emit(click);
    expect(observed).toEqual(1);
});

it("supports unsubscribing from events", () => {
    const click = emitter<ClickEvent>();
    const observed: ClickEvent[] = [];
    const handle = onSync(click, (event) => {
        observed.push(event);
    });

    handle.destroy();
    emit(click, { x: 1, y: 2 });
    expect(observed).toEqual([]);
});

it("supports unsubscribing during emit", () => {
    const evt = emitter();
    const observed: string[] = [];

    // Relies on internals: insertion order is iteration order during emit
    onSync(evt, () => {
        observed.push("1");
        otherHandle.destroy();
    });

    const otherHandle = onSync(evt, () => {
        observed.push("2");
    });
    emit(evt);

    expect(observed).toEqual(["1"]);
});

it("supports subscribing during emit", () => {
    const evt = emitter();
    const observed: string[] = [];

    let registered = false;
    onSync(evt, () => {
        observed.push("outer");
        if (!registered) {
            onSync(evt, () => {
                observed.push("inner");
            });
            registered = true;
        }
    });

    emit(evt);
    expect(observed).toEqual(["outer"]); // Not called during initial emit
    expect(registered).toBe(true);
    observed.splice(0, observed.length);

    emit(evt);
    expect(observed).toEqual(["outer", "inner"]);
});

it("does not throw exceptions from event handlers", () => {
    let err;
    vi.spyOn(core, "reportCallbackError").mockImplementation((e) => {
        err = e;
    });

    const evt = emitter();
    const spy1 = vi.fn(() => {
        throw new Error("boom!");
    });
    const spy2 = vi.fn();
    onSync(evt, spy1);
    onSync(evt, spy2);

    emit(evt);
    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
    expect(err).toMatchInlineSnapshot(`[Error: boom!]`);
});

describe("once", () => {
    it("supports subscribing for a single event", () => {
        const evt = emitter();

        let events = 0;
        onSync(
            evt,
            () => {
                events++;
            },
            { once: true }
        );

        emit(evt);
        expect(events).toBe(1);
    });

    it("should not call a once handler twice, event when emits are nested", () => {
        const evt = emitter();

        let events = 0;
        let nestedEmit = false;
        onSync(
            evt,
            () => {
                if (!nestedEmit) {
                    nestedEmit = true;
                    emit(evt);
                }
                events++;
            },
            { once: true }
        );
        emit(evt);
        expect(events).toBe(1);
    });
});

describe("reactivity", () => {
    it("supports reactive changes of the event source", () => {
        const evt1 = emitter<string>();
        const evt2 = emitter<string>();
        const emit1 = () => emit(evt1, "1");
        const emit2 = () => emit(evt2, "2");

        const currentSource = reactive(evt1);

        const observed: string[] = [];
        onSync(
            () => currentSource.value,
            (event) => {
                observed.push(event);
            }
        );

        // Only source1 is active
        emit1();
        emit2();
        expect(observed).toEqual(["1"]);

        // Switch source
        currentSource.value = evt2;
        observed.splice(0, observed.length);
        emit1();
        emit2();
        expect(observed).toEqual(["2"]);
    });

    it("does not emit during an active batch", () => {
        const evt = emitter();
        const spy = vi.fn();
        onSync(evt, spy);

        batch(() => {
            emit(evt);

            // This is important because batches appear as reactive "transactions",
            // running user code in the event handler would allow that code to observe
            // intermediate (and inconsistent) states.
            expect(spy).not.toHaveBeenCalled();
        });

        // Event handlers run after the batch has completed.
        expect(spy).toHaveBeenCalledOnce();
    });
});

describe("async execution", () => {
    it("supports async execution", async () => {
        const evt = emitter();

        const spy = vi.fn();
        on(evt, spy);

        emit(evt);
        expect(spy).not.toHaveBeenCalled();

        await nextTick();
        expect(spy).toHaveBeenCalledOnce();
    });

    it("reports errors from async event handlers", async () => {
        let err;
        vi.spyOn(core, "reportCallbackError").mockImplementation((e) => {
            err = e;
        });

        const evt = emitter();
        const spy1 = vi.fn(() => {
            throw new Error("boom!");
        });
        on(evt, spy1);

        emit(evt);
        await nextTick();
        expect(spy1).toHaveBeenCalledOnce();
        expect(err).toMatchInlineSnapshot(`[Error: boom!]`);
    });
});

it("supports interface/impl separation", () => {
    interface ViewApi {
        click: EventSource<ClickEvent>;
    }

    class ViewApiImpl implements ViewApi {
        click = emitter<ClickEvent>();
    }

    const impl = new ViewApiImpl();
    const api: ViewApi = impl;

    const handler = vi.fn();
    onSync(api.click, handler);
    emit(impl.click, { x: 1, y: 2 });
    expect(handler).toHaveBeenCalledOnce();
});

interface ClickEvent {
    x: number;
    y: number;
}
