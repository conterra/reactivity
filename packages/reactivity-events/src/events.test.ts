import * as core from "@conterra/reactivity-core";
import { batch, nextTick, reactive } from "@conterra/reactivity-core";
import { afterEach } from "node:test";
import { expect, it, vi } from "vitest";
import { emit, on, onSync } from "./events";
import { type EVENT_TYPES } from "./types";

afterEach(() => {
    vi.restoreAllMocks();
});

it("supports typed events", () => {
    const emitter = new ClickEmitter();
    const observed: ClickEvent[] = [];
    onSync(emitter, "click", (event) => {
        observed.push(event);
    });
    emit(emitter, "click", { x: 1, y: 2 });
    emit(emitter, "click", { x: 3, y: 4 });
    expect(observed).toEqual([
        { x: 1, y: 2 },
        { x: 3, y: 4 }
    ]);
});

it("supports interface/impl separation", () => {
    // No TypeScript error
    const emitter = new EmitterApiImpl();
    on(emitter, "click", () => {});
    emit(emitter, "click");
});

it("supports emit from methods", () => {
    const emitter = new EmitterFromClass();
    let called = 0;
    onSync(emitter, "click", () => {
        called++;
    });
    emitter.click();
    expect(called).toBe(1);

    const emitter2 = new EmitterFromSubClass();
    onSync(emitter2, "click2", () => {
        called++;
    });
    emitter2.click();
    expect(called).toBe(2);
});

it("supports unsubscribing from events", () => {
    const emitter = new ClickEmitter();
    const observed: ClickEvent[] = [];
    const handle = onSync(emitter, "click", (event) => {
        observed.push(event);
    });

    handle.destroy();
    emit(emitter, "click", { x: 1, y: 2 });
    expect(observed).toEqual([]);
});

it("supports unsubscribing during emit", () => {
    const emitter = new VoidEmitter();
    const observed: string[] = [];

    // Relies on internals: insertion order is iteration order during emit
    onSync(emitter, "event", () => {
        observed.push("1");
        otherHandle.destroy();
    });

    const otherHandle = onSync(emitter, "event", () => {
        observed.push("2");
    });
    emit(emitter, "event");

    expect(observed).toEqual(["1"]);
});

it("supports subscribing during emit", () => {
    const emitter = new VoidEmitter();
    const observed: string[] = [];

    let registered = false;
    onSync(emitter, "event", () => {
        observed.push("outer");
        if (!registered) {
            onSync(emitter, "event", () => {
                observed.push("inner");
            });
            registered = true;
        }
    });

    emit(emitter, "event");
    expect(observed).toEqual(["outer"]); // Not called during initial emit
    expect(registered).toBe(true);
    observed.splice(0, observed.length);

    emit(emitter, "event");
    expect(observed).toEqual(["outer", "inner"]);
});

it("supports subscribing for a single event", () => {
    const emitter = new VoidEmitter();

    let events = 0;
    onSync(
        emitter,
        "event",
        () => {
            events++;
        },
        { once: true }
    );

    emit(emitter, "event");
    emit(emitter, "event");
    expect(events).toBe(1);
});

it("should not call a once handler twice, event when emits are nested", () => {
    const emitter = new VoidEmitter();

    let events = 0;
    let nestedEmit = false;
    onSync(
        emitter,
        "event",
        () => {
            if (!nestedEmit) {
                nestedEmit = true;
                emit(emitter, "event");
            }
            events++;
        },
        { once: true }
    );
    emit(emitter, "event");
    expect(events).toBe(1);
});

it("supports reactive changes of the event source", () => {
    const source1 = new StringEmitter();
    const source2 = new StringEmitter();
    const emit1 = () => emit(source1, "event", "1");
    const emit2 = () => emit(source2, "event", "2");

    const currentSource = reactive(source1);

    const observed: string[] = [];
    onSync(
        () => currentSource.value,
        "event",
        (event) => {
            observed.push(event);
        }
    );

    // Only source1 is active
    emit1();
    emit2();
    expect(observed).toEqual(["1"]);

    // Switch source
    currentSource.value = source2;
    observed.splice(0, observed.length);
    emit1();
    emit2();
    expect(observed).toEqual(["2"]);
});

it("does not emit during an active batch", () => {
    const emitter = new VoidEmitter();
    const spy = vi.fn();
    onSync(emitter, "event", spy);

    batch(() => {
        emit(emitter, "event");

        // This is important because batches appear as reactive "transactions",
        // running user code in the event handler would allow that code to observe
        // intermediate (and inconsistent) states.
        expect(spy).not.toHaveBeenCalled();
    });

    // Event handlers run after the batch has completed.
    expect(spy).toHaveBeenCalledOnce();
});

it("does not throw exceptions from event handlers", () => {
    let err;
    vi.spyOn(core, "reportCallbackError").mockImplementation((e) => {
        err = e;
    });

    const emitter = new VoidEmitter();
    const spy1 = vi.fn(() => {
        throw new Error("boom!");
    });
    const spy2 = vi.fn();
    onSync(emitter, "event", spy1);
    onSync(emitter, "event", spy2);

    emit(emitter, "event");
    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
    expect(err).toMatchInlineSnapshot(`[Error: boom!]`);
});

it("supports async execution", async () => {
    const emitter = new VoidEmitter();

    const spy = vi.fn();
    on(emitter, "event", spy);

    emit(emitter, "event");
    expect(spy).not.toHaveBeenCalled();

    await nextTick();
    expect(spy).toHaveBeenCalledOnce();
});

it("reports errors from async event handlers", async () => {
    let err;
    vi.spyOn(core, "reportCallbackError").mockImplementation((e) => {
        err = e;
    });

    const emitter = new VoidEmitter();
    const spy1 = vi.fn(() => {
        throw new Error("boom!");
    });
    on(emitter, "event", spy1);

    emit(emitter, "event");
    await nextTick();
    expect(spy1).toHaveBeenCalledOnce();
    expect(err).toMatchInlineSnapshot(`[Error: boom!]`);
});

interface ClickEvent {
    x: number;
    y: number;
}

class ClickEmitter {
    declare [EVENT_TYPES]: {
        "click": ClickEvent;
    };
}

class StringEmitter {
    declare [EVENT_TYPES]: {
        "event": string;
    };
}

class VoidEmitter {
    declare [EVENT_TYPES]: {
        "event": void;
    };
}

interface EmitterApi {
    [EVENT_TYPES]?: {
        "click": void;
    };
}

class EmitterApiImpl implements EmitterApi {
    // Repetition is currently necessary to avoid TypeScript error
    declare [EVENT_TYPES]: EmitterApi[typeof EVENT_TYPES];

    constructor() {}
}

class EmitterFromClass {
    declare [EVENT_TYPES]: {
        "click": { x: number };
    };

    // TODO: Find a way to get rid of the `this` type
    click(this: EmitterFromClass) {
        // Not a typescript error
        emit(this, "click", { x: 1 });

        on(this, "click", (event) => {
            event.x;
        });
    }
}

class EmitterFromSubClass extends EmitterFromClass {
    declare [EVENT_TYPES]: {
        "click": { x: number };
        "click2": { x: number };
    };

    // TODO: Find a way to get rid of the `this` type
    click(this: EmitterFromSubClass) {
        // Not a typescript error
        emit(this, "click", { x: 1 });
        emit(this, "click2", { x: 1 });

        on(this, "click", (event) => {
            event.x;
        });
        on(this, "click2", (event) => {
            event.x;
        });
    }
}
