import {
    CleanupHandle,
    getValue,
    Reactive,
    syncWatchValue,
    untracked
} from "@conterra/reactivity-core";
import { EventArgs, EventCallback, EventNames, EventSource, EventType } from "./types";
import { EventBus, RawCallback, Subscription, RawObject } from "./internals";
import { dispatch } from "./dispatch";

/**
 * Options supported by {@link on} and {@link onSync}.
 *
 * @group Event handling
 */
export interface SubscribeOptions {
    /**
     * If `true`, the subscriber will be removed after the first invocation.
     *
     * The subscriber can still be removed manually by destroying the handle returned by {@link on}.
     */
    once?: boolean;
}

/**
 * Listens for the given event on the specified event source.
 *
 * The `emitter` parameter can be a plain object, a signal, or a reactive function that returns the event source.
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
 *
 * > NOTE: This function will slightly defer executions of the given `callback`.
 * > In other words, the execution does not happen _immediately_ after an event was fired.
 * >
 * > If you need more control, take a look at {@link onSync}.
 *
 * @group Event handling
 */
export function on<T extends EventSource<unknown>, EventName extends EventNames<T>>(
    source: T | Reactive<T> | (() => T),
    eventName: EventName,
    callback: EventCallback<T, EventName>,
    options?: SubscribeOptions
): CleanupHandle {
    return onImpl(source, eventName, callback, {
        ...options,
        sync: false
    });
}

/**
 * Listens for the given event on the specified event source.
 *
 * The `emitter` parameter can be a plain object, a signal, or a reactive function that returns the event source.
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
 *
 * @group Event handling
 */
export function onSync<T extends EventSource<unknown>, EventName extends EventNames<T>>(
    source: T | Reactive<T> | (() => T),
    eventName: EventName,
    callback: EventCallback<T, EventName>,
    options?: SubscribeOptions
): CleanupHandle {
    return onImpl(source, eventName, callback, {
        ...options,
        sync: true
    });
}

function onImpl<T extends EventSource<unknown>, EventName extends EventNames<T>>(
    source: T | Reactive<T> | (() => T),
    eventName: EventName,
    callback: EventCallback<T, EventName>,
    options: SubscribeOptions & { sync: boolean }
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
            const handle = subscribe(source, eventName, callback as RawCallback, options);
            return () => handle.destroy();
        },
        { immediate: true }
    );
}

/**
 * Emits an event from the given event source.
 *
 * Example:
 *
 * ```ts
 * const myObject = ...;
 * // Register event listener
 * on(myObject, "click", (event) => console.log(event));
 * // Emit event
 * emit(myObject, "click", { x: 1, y: 2 });
 * ```
 *
 * > NOTE: Any (non-null) object can be used as an event source. Primitive values are not supported.
 *
 * @see {@link EventSource} for how to declare event types for TypeScript support.
 *
 * @group Event handling
 */
export function emit<T extends EventSource<unknown>, EventName extends EventNames<T>>(
    source: T,
    eventName: EventName,
    ...args: EventArgs<EventType<T, EventName>>
): void {
    const subscriptions = getEventBus(source)?.subscribers.get(eventName);
    if (!subscriptions || !subscriptions.size) {
        return;
    }

    // untracked: prevent accidentally using event handler side effects in a reactive context
    untracked(() => {
        if (!subscriptions.size) {
            return;
        }

        // Copy to allow (de-) registration of handlers during emit.
        // This is convenient for correctness but may been further optimization
        // if events are emitted frequently.
        for (const subscription of Array.from(subscriptions)) {
            dispatch(subscription, args);
        }
    });
}

function subscribe(
    source: RawObject,
    eventName: string | symbol,
    callback: RawCallback,
    options: SubscribeOptions & { sync: boolean }
): CleanupHandle {
    const bus = getEventBus(source, true);
    let subscriptions = bus.subscribers.get(eventName);
    if (!subscriptions) {
        subscriptions = new Set();
        bus.subscribers.set(eventName, subscriptions);
    }

    const subscription: Subscription = {
        once: options.once ?? false,
        sync: options.sync,
        get isActive(): boolean {
            return subscriptions?.has(subscription) ?? false;
        },
        remove() {
            subscriptions?.delete(subscription);
            subscriptions = undefined;
        },
        callback
    };
    subscriptions.add(subscription);

    return { destroy: subscription.remove.bind(subscription) };
}

const EVENT_BUS_MAP = new WeakMap<RawObject, EventBus>();

function getEventBus(source: RawObject): EventBus | undefined;
function getEventBus(source: RawObject, init: true): EventBus;
function getEventBus(source: RawObject, init = false): EventBus | undefined {
    if (!source || typeof source !== "object") {
        throw new Error("Invalid event source: " + source);
    }

    let bus = EVENT_BUS_MAP.get(source);
    if (!bus && init) {
        bus = { subscribers: new Map() };
        EVENT_BUS_MAP.set(source, bus);
    }
    return bus;
}
