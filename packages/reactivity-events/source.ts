// FIXME: think about typescript API
export declare const EVENT_TYPES: unique symbol;

/**
 * A type that supports events.
 *
 * The {@link EVENT_TYPES} symbol is used to declare the event types.
 *
 * Note that the event types are only needed at compile time, so it is sufficient (and safe)
 * to declare them without ever initializing them:
 *
 * ```ts
 * class EventExample {
 *     declare [EVENT_TYPES]: {
 *         "click": ClickEvent;
 *     };
 * }
 * 
 * const example = new EventExample();
 * emit(example, "click", { x: 10, y: 20 });
 * ```
 */
export interface EventSource<EventTypes> {
    /**
     * Declares the event types supported by the given object.
     * 
     * Note that the event types are a compile time feature,
     * they are not needed at runtime.
     */
    [EVENT_TYPES]: EventTypes | undefined;
}

/**
 * Returns a union of all event names of the given event source.
 */
export type EventNames<Source extends EventSource<unknown>> = keyof Source[typeof EVENT_TYPES] &
    (string | symbol);

/**
 * The type of the event with the given name.
 */
export type EventType<
    Source extends EventSource<unknown>,
    EventName extends EventNames<Source>
> = Source[typeof EVENT_TYPES][EventName];

/**
 * The signature of the event listener for the given event.
 */
export type EventListener<T extends EventSource<unknown>, EventName extends EventNames<T>> = (
    ...args: EventArgs<EventType<T, EventName>>
) => void;

/**
 * Helper type to compute function signatures.
 * Either an empty array (void event) or an array with exactly one object (other events).
 */
export type EventArgs<EventType> = EventType extends void ? [] : [event: EventType];
