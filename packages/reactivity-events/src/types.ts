/**
 * A marker symbol that can be used for compile time annotations, see {@link EventSource}.
 *
 * @group TypeScript support
 */
export const EVENT_TYPES: unique symbol = Symbol("event-types");

/**
 * A type that supports events.
 *
 * The {@link EVENT_TYPES} symbol is used to declare the event types.
 *
 * Note that the event types are only needed at compile time, so it is sufficient (and safe)
 * to declare them without ever initializing them:
 *
 * ```ts
 * import { type EVENT_TYPES } from "@conterra/reactivity-events";
 *
 * class EventExample {
 *     declare [EVENT_TYPES]: {
 *         "click": ClickEvent;
 *     };
 * }
 *
 * const example = new EventExample();
 * emit(example, "click", { x: 10, y: 20 });
 * ```
 *
 * TODO: interface variant
 *
 * @group TypeScript support
 */
export interface EventSource<EventTypes extends object> {
    /**
     * Declares the event types supported by the given object.
     *
     * Note that the event types are a compile time feature,
     * they are not needed at runtime.
     */
    [EVENT_TYPES]?: EventTypes | undefined;
}

type DeclaredEvents<Source> = Source extends EventSource<infer EventTypes> ? EventTypes : never;

/**
 * Returns a union of all event names of the given event source.
 *
 * @group Helpers
 */
export type EventNames<Source extends EventSource<object>> = keyof DeclaredEvents<Source> &
    (string | symbol);

/**
 * The type of the event with the given name.
 *
 * @group Helpers
 */
export type EventType<
    Source extends EventSource<object>,
    EventName extends EventNames<Source>
> = DeclaredEvents<Source>[EventName];

/**
 * The signature of the event listener callback for the given event.
 *
 * @group Helpers
 */
export type EventCallback<T extends EventSource<object>, EventName extends EventNames<T>> = (
    ...args: EventArgs<EventType<T, EventName>>
) => void;

/**
 * Helper type to compute function signatures.
 * Either an empty array (void event) or an array with exactly one object (other events).
 *
 * @group Helpers
 */
export type EventArgs<T> = [T] extends [void] ? [] : [event: T];
