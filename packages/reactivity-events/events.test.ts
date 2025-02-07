import { expect, it } from "vitest";
import { EVENT_TYPES } from "./source";
import { emit, on } from "./events";
import { reactive } from "@conterra/reactivity-core";

it("should support typed events", () => {
    const emitter = new ClickEmitter();
    const observed: ClickEvent[] = [];
    on(emitter, "click", (event) => {
        observed.push(event);
    });
    emit(emitter, "click", { x: 1, y: 2 });
    emit(emitter, "click", { x: 3, y: 4 });
    expect(observed).toEqual([
        { x: 1, y: 2 },
        { x: 3, y: 4 }
    ]);
});

it("supports unsubscribing from events", () => {
    const emitter = new ClickEmitter();
    const observed: ClickEvent[] = [];
    const handle = on(emitter, "click", (event) => {
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
    on(emitter, "event", () => {
        observed.push("1");
        otherHandle.destroy();
    });

    const otherHandle = on(emitter, "event", () => {
        observed.push("2");
    });
    emit(emitter, "event");

    expect(observed).toEqual(["1"]);
});

it("supports subscribing during emit", () => {
    const emitter = new VoidEmitter();
    const observed: string[] = [];

    let registered = false;
    on(emitter, "event", () => {
        observed.push("outer");
        if (!registered) {
            on(emitter, "event", () => {
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
    on(
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
    on(
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
    on(() => currentSource.value, "event", (event) => {
        observed.push(event);
    });

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
