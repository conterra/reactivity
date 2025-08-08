// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import * as core from "@conterra/reactivity-core";
import { batch, nextTick, Reactive, reactive, ReactiveGetter } from "@conterra/reactivity-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emit, emitter, EventCallback, EventSource, on, SubscribeOptions } from "./events";

afterEach(() => {
    vi.restoreAllMocks();
});

const ON_SYNC = <T>(
    source: EventSource<T> | Reactive<EventSource<T>> | ReactiveGetter<EventSource<T>>,
    callback: EventCallback<T>,
    options?: SubscribeOptions
) =>
    on(source, callback, {
        ...options,
        dispatch: "sync"
    });

it("supports typed events", () => {
    const clicked = emitter<ClickEvent>();
    const observed: ClickEvent[] = [];
    ON_SYNC(clicked, (event) => {
        observed.push(event);
    });
    emit(clicked, { x: 1, y: 2 });
    emit(clicked, { x: 3, y: 4 });
    expect(observed).toEqual([
        { x: 1, y: 2 },
        { x: 3, y: 4 }
    ]);
});

it("supports void events", () => {
    const clicked = emitter();
    let observed = 0;
    ON_SYNC(clicked, () => {
        observed++;
    });
    emit(clicked);
    expect(observed).toEqual(1);
});

it("supports unsubscribing from events", () => {
    const clicked = emitter<ClickEvent>();
    const observed: ClickEvent[] = [];
    const handle = ON_SYNC(clicked, (event) => {
        observed.push(event);
    });

    handle.destroy();
    emit(clicked, { x: 1, y: 2 });
    expect(observed).toEqual([]);
});

it("supports unsubscribing during emit", () => {
    const evt = emitter();
    const observed: string[] = [];

    // Relies on internals: insertion order is iteration order during emit
    ON_SYNC(evt, () => {
        observed.push("1");
        otherHandle.destroy();
    });

    const otherHandle = ON_SYNC(evt, () => {
        observed.push("2");
    });
    emit(evt);

    expect(observed).toEqual(["1"]);
});

it("supports subscribing during emit", () => {
    const evt = emitter();
    const observed: string[] = [];

    let registered = false;
    ON_SYNC(evt, () => {
        observed.push("outer");
        if (!registered) {
            ON_SYNC(evt, () => {
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
    ON_SYNC(evt, spy1);
    ON_SYNC(evt, spy2);

    emit(evt);
    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
    expect(err).toMatchInlineSnapshot(`[Error: boom!]`);
});

it("supports subscribed / unsubscribed callbacks", () => {
    const subscribed = vi.fn();
    const unsubscribed = vi.fn();

    const evt = emitter({ subscribed, unsubscribed });
    expect(subscribed).not.toHaveBeenCalled();
    expect(unsubscribed).not.toHaveBeenCalled();

    const sub1 = on(evt, () => undefined);
    expect(subscribed).toHaveBeenCalledTimes(1);
    expect(unsubscribed).not.toHaveBeenCalled();

    const sub2 = on(evt, () => undefined);
    expect(subscribed).toHaveBeenCalledTimes(1);
    expect(unsubscribed).not.toHaveBeenCalled();

    sub2.destroy();
    expect(subscribed).toHaveBeenCalledTimes(1);
    expect(unsubscribed).not.toHaveBeenCalled();

    sub1.destroy();
    expect(subscribed).toHaveBeenCalledTimes(1);
    expect(unsubscribed).toHaveBeenCalledTimes(1);
});

it("supports emitting events from subscribed callback", () => {
    const evt = emitter<string>({
        subscribed: () => {
            emit(evt, "Hello World!");
        }
    });
    emit(evt, "No listeners ... :(");

    const events: string[] = [];
    ON_SYNC(evt, (message) => {
        events.push(message);
    });
    emit(evt, "After subscribe");

    expect(events).toEqual(["Hello World!", "After subscribe"]);
});

describe("once", () => {
    it("supports subscribing for a single event", () => {
        const evt = emitter();

        let events = 0;
        ON_SYNC(
            evt,
            () => {
                events++;
            },
            { once: true }
        );

        emit(evt);
        expect(events).toBe(1);
    });

    it("should not call a once handler twice, even when emits are nested", () => {
        const evt = emitter();

        let events = 0;
        let nestedEmit = false;
        ON_SYNC(
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

    it("should not call a once handler twice, even in batch context", () => {
        const evt = emitter();

        let events = 0;
        ON_SYNC(
            evt,
            () => {
                events++;
            },
            { once: true }
        );

        batch(() => {
            emit(evt);
            emit(evt);
        });
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
        ON_SYNC(
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
        ON_SYNC(evt, spy);

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
        clicked: EventSource<ClickEvent>;
    }

    class ViewApiImpl implements ViewApi {
        clicked = emitter<ClickEvent>();
    }

    const impl = new ViewApiImpl();
    const api: ViewApi = impl;

    const handler = vi.fn();
    ON_SYNC(api.clicked, handler);
    emit(impl.clicked, { x: 1, y: 2 });
    expect(handler).toHaveBeenCalledOnce();
});

interface ClickEvent {
    x: number;
    y: number;
}
