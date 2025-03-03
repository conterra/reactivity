/**
 * Hidden state object associated with an event source.
 */
export interface EventBus {
    // Key: event name, values: callback functions
    subscribers: Map<string | symbol, Set<Subscription>>;
}

/**
 * Internal object representing a registered subscription.
 * The subscription object is unique for each subscription.
 */
export interface Subscription {
    readonly isActive: boolean;
    readonly once: boolean;
    readonly sync: boolean;
    remove(): void;
    callback: (...args: unknown[]) => void;
}

/**
 * Type erased event emitter object.
 */
export type RawObject = object;

/**
 * Type erased callback function.
 */
export type RawCallback = (...args: unknown[]) => void;
