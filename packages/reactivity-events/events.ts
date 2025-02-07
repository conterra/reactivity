import {
    CleanupHandle,
    getValue,
    Reactive,
    syncWatchValue,
    untracked
} from "@conterra/reactivity-core";
import { EventArgs, EventListener, EventNames, EventSource, EventType } from "./source";

/**
 * Options supported by {@link on}.
 */
export interface SubscribeOptions {
    /**
     * If `true`, the listener will be removed after the first invocation.
     *
     * The listener function can still be removed by destroying the {@link CleanupHandle} returned by {@link on}.
     */
    once?: boolean;

    // TODO: Sync vs async events
    sync?: boolean;
}

/**
 * Listens for the given event on the specified event source.
 *
 * The emitter can be a plain object, a signal, or a reactive function that returns the event source.
 *
 * The function returns a cleanup handle that should be used to stop listening for the event.
 *
 * Example:
 *
 * ```ts
 * const view = ...;
 * const handle = on(view, "click", (event) => {
 *     console.log("Clicked at", event.x, event.y);
 * });
 * // Later, to clean up:
 * handle.destroy();
 * ```
 *
 * The event source can be reactive.
 * In the following example, we will always subscribe on the _current_ view (and unsubscribe from the previous one):
 *
 * ```ts
 * // model.getCurrentView() is implemented using signals
 * const handle = on(() => model.getCurrentView(), "click", (event) => {
 *     console.log("Clicked at", event.x, event.y);
 * });
 * ```
 */
export function on<T extends EventSource<unknown>, EventName extends EventNames<T>>(
    source: T | Reactive<T> | (() => T),
    eventName: EventName,
    listener: EventListener<T, EventName>,
    options?: SubscribeOptions
): CleanupHandle {
    let getter;
    if (typeof source === "function") {
        getter = source;
    } else {
        getter = () => getValue(source);
    }

    return syncWatchValue(
        getter,
        (source) => {
            const handle = subscribe(source, eventName, listener as RawCallback, options);
            return () => handle.destroy();
        },
        { immediate: true }
    );
}

/**
 * Emits an event from the given event source.
 */
export function emit<T extends EventSource<unknown>, EventName extends EventNames<T>>(
    source: T,
    eventName: EventName,
    ...args: EventArgs<EventType<T, EventName>>
) {
    const listeners = getEventBus(source)?.listeners.get(eventName);
    if (!listeners || !listeners.size) {
        return;
    }

    // untracked: prevent accidentally using event handler side effects in a reactive context
    untracked(() => {
        invokeListeners(listeners, ...args);
    });
}

// Hidden state object associated with an event source.
interface EventBus {
    // Key: event name, values: callback functions
    listeners: Map<string | symbol, Set<RawListener>>;
}

type RawObject = object;
type RawCallback = (...args: unknown[]) => void;

interface RawListener {
    removed?: boolean;
    once?: boolean;
    callback: (...args: unknown[]) => void;
}

function subscribe(
    source: RawObject,
    eventName: string | symbol,
    callback: RawCallback,
    options?: SubscribeOptions
): CleanupHandle {
    const bus = getEventBus(source, true);
    const listener: RawListener = {
        callback
    };

    if (options?.once) {
        listener.once = true;
    }

    let listeners = bus.listeners.get(eventName);
    if (!listeners) {
        listeners = new Set();
        bus.listeners.set(eventName, listeners);
    }
    listeners.add(listener);

    const destroy = () => {
        if (listeners) {
            listener.removed = true;
            listeners?.delete(listener);
            listeners = undefined;
        }
    };
    return { destroy };
}

function invokeListeners(listeners: Set<RawListener>, ...args: unknown[]) {
    // Copy to allow (de-) registration of handlers during emit.
    // This is convenient for correctness but may been further optimization
    // if events are emitted frequently.
    const copy = [...listeners];
    for (const listener of copy) {
        if (listener.removed) {
            continue;
        }

        if (listener.once) {
            listener.removed = true;
            listeners.delete(listener);
        }
        listener.callback(...args);
    }
}

const EVENT_BUS_MAP = new WeakMap<RawObject, EventBus>();

function getEventBus(source: RawObject): EventBus | undefined;
function getEventBus(source: RawObject, init: true): EventBus;
function getEventBus(source: RawObject, init = false): EventBus | undefined {
    let bus = EVENT_BUS_MAP.get(source);
    if (!bus && init) {
        bus = { listeners: new Map() };
        EVENT_BUS_MAP.set(source, bus);
    }
    return bus;
}
