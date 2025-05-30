// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import {
    CleanupHandle,
    getValue,
    Reactive,
    ReactiveGetter,
    syncWatchValue,
    untracked
} from "@conterra/reactivity-core";
import { assertEmitter, emitImpl, EventEmitterImpl, RawCallback, subscribeImpl } from "./internals";

/* Compile time only branding symbols. */
declare const IS_EVENT_SOURCE: unique symbol;
declare const IS_EVENT_EMITTER: unique symbol;

type Invariant<T> = (value: T) => T;

/**
 * An event emitter that supports publishing and subscribing to events of a certain type.
 *
 * @see {@link emitter} for creating an event channel.
 * @see {@link emit} for emitting events.
 * @see {@link EventSource} for the read-only version of this interface.
 * @group Events
 */
export interface EventEmitter<T> extends EventSource<T> {
    /**
     * Internal brand (compile-time only).
     *
     * @internal
     */
    [IS_EVENT_EMITTER]: true;
}

/**
 * An event source that supports subscribing to events of a certain type.
 *
 * This is the "read-only" version of {@link EventEmitter}: it does not allow emitting events at the TypeScript level.
 *
 * @see {@link emitter} for creating an event channel.
 * @see {@link on} for subscribing to events.
 * @see {@link EventEmitter} for the writable version of this interface.
 * @group Events
 */
export interface EventSource<T> {
    /**
     * Internal brand (compile-time only).
     *
     * @internal
     */
    [IS_EVENT_SOURCE]: {
        // invariant: EventSource<T> is not an EventSource<U> for any U !== T.
        // this is for simplicity and may be relaxed in the future.
        readonly $type: Invariant<T>;
    };
}

/**
 * Options for the {@link emitter()} function.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface EmitterOptions<T> {
    /**
     * This function is invoked when the _first_ subscriber subscribes to the emitter.
     */
    subscribed?: () => void;

    /**
     * This function is invoked when the _last_ subscriber unsubscribes from the emitter.
     */
    unsubscribed?: () => void;
}

/**
 * Creates a new event emitter with the specified event type.
 *
 * Example without type (void by default):
 *
 * ```ts
 * import { emitter, on, emit } from "@conterra/reactivity-events";
 *
 * const clicked = emitter();
 * on(clicked, () => console.log("Clicked!"));
 * emit(clicked);
 * ```
 *
 * Example with event type:
 *
 * ```ts
 * import { emitter, on, emit } from "@conterra/reactivity-events";
 *
 * interface ClickEvent {
 *   x: number;
 *   y: number;
 * }
 *
 * const clicked = emitter<ClickEvent>();
 * on(clicked, (event) => console.log("Clicked at", event.x, event.y));
 * emit(clicked, { x: 1, y: 2 });
 * ```
 *
 * @see {@link emit} for emitting events.
 * @see {@link on} for subscribing to events.
 * @group Events
 */
export function emitter<T = void>(options?: EmitterOptions<T>): EventEmitter<T> {
    return new EventEmitterImpl(options) as unknown as EventEmitter<T>;
}

/**
 * The arguments required when emitting an event of the given type.
 *
 * This is usually just `[T]`, but can be an empty array for `void` events.
 *
 * @group Helpers
 */
export type EventArgs<T> = [T] extends [void] ? [] : [event: T];

/**
 * The signature of the event listener callback for the given event.
 *
 * @group Helpers
 */
export type EventCallback<T> = (...args: EventArgs<T>) => void;

/**
 * Emits an event from the given event emitter.
 *
 * Example:
 *
 * ```ts
 * import { on, emit } from "@conterra/reactivity-events";
 *
 * const myObject = ...;
 * // Register event listener
 * on(myObject.click, (event) => console.log(event));
 * // Emit event
 * emit(myObject.click, { x: 1, y: 2 });
 * ```
 * @group Events
 */
export function emit<T>(emitter: EventEmitter<T>, ...args: EventArgs<T>): void {
    // untracked: prevent accidentally using event handler side effects in a reactive context
    untracked(() => {
        assertEmitter(emitter);
        emitImpl(emitter, args);
    });
}

/**
 * Options supported by {@link on} and {@link onSync}.
 *
 * @group Subscribing
 */
export interface SubscribeOptions {
    /**
     * If `true`, the subscription will be removed after the first invocation (default: `false`).
     *
     * The subscription can still be removed manually by destroying the handle returned by {@link on}.
     */
    once?: boolean;
}

/**
 * Listens for events on the specified event source and invokes the `callback` for each event.
 *
 * The `source` parameter can be a plain event source, a signal, or a reactive function that returns the event source.
 *
 * `on` returns a cleanup handle that should be used to stop listening for the event.
 *
 * Example:
 *
 * ```ts
 * import { on } from "@conterra/reactivity-events";
 *
 * const view = ...;
 * const handle = on(view.clicked, (event) => {
 *     console.log("Clicked at", event.x, event.y);
 * });
 * // Later, to clean up:
 * handle.destroy();
 * ```
 *
 * The event source parameter can be reactive.
 * In the following example, we will always subscribe on the _current_ view (and unsubscribe from the previous one):
 *
 * ```ts
 * // model.getCurrentView() is implemented using signals
 * const handle = on(() => model.getCurrentView().clicked, (event) => {
 *     console.log("Clicked at", event.x, event.y);
 * });
 * ```
 *
 * > NOTE: This function will slightly defer executions of the given `callback`.
 * > In other words, the execution of callbacks does not happen _immediately_ after an event was fired.
 * >
 * > If you need more control, take a look at {@link onSync}.
 *
 * @group Subscribing
 */
export function on<T>(
    source: EventSource<T> | Reactive<EventSource<T>> | ReactiveGetter<EventSource<T>>,
    callback: EventCallback<T>,
    options?: SubscribeOptions
): CleanupHandle {
    return onImpl(source, callback, {
        ...options,
        sync: false
    });
}

/**
 * Listens for events on the specified event source and invokes the `callback` for each event.
 * This function is the synchronous variant of {@link on}.
 * Event callbacks will be invoked without delay after events have been emitted.
 *
 * The `source` parameter can be a plain event source, a signal, or a reactive function that returns the event source.
 *
 * `onSync` returns a cleanup handle that should be used to stop listening for the event.
 *
 * Example:
 *
 * ```ts
 * import { onSync } from "@conterra/reactivity-events";
 *
 * const view = ...;
 * const handle = onSync(view.clicked, (event) => {
 *     console.log("Clicked at", event.x, event.y);
 * });
 * // Later, to clean up:
 * handle.destroy();
 * ```
 *
 * The event source parameter can be reactive.
 * In the following example, we will always subscribe on the _current_ view (and unsubscribe from the previous one):
 *
 * ```ts
 * // model.getCurrentView() is implemented using signals
 * const handle = onSync(() => model.getCurrentView().clicked, (event) => {
 *     console.log("Clicked at", event.x, event.y);
 * });
 * ```
 *
 * @group Subscribing
 */
export function onSync<T>(
    source: EventSource<T> | Reactive<EventSource<T>> | ReactiveGetter<EventSource<T>>,
    callback: EventCallback<T>,
    options?: SubscribeOptions
): CleanupHandle {
    return onImpl(source, callback, {
        ...options,
        sync: true
    });
}

function onImpl<T>(
    source: EventSource<T> | Reactive<EventSource<T>> | ReactiveGetter<EventSource<T>>,
    callback: EventCallback<T>,
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
            assertEmitter(source);
            const handle = subscribeImpl(source, callback as RawCallback, options);
            return () => handle.destroy();
        },
        { immediate: true }
    );
}
