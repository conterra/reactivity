import { CleanupHandle } from "@conterra/reactivity-core";
import { dispatch } from "./dispatch";
import { SubscribeOptions } from "./events";

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
 * Type erased callback function.
 */
export type RawCallback = (...args: unknown[]) => void;

export const SUBSCRIPTIONS = Symbol("subscriptions");

export class EventEmitterImpl {
    // Set<T> maintains insertion order.
    [SUBSCRIPTIONS]?: Set<Subscription>;
}

export function assertEmitter(value: unknown): asserts value is EventEmitterImpl {
    if (!(value instanceof EventEmitterImpl)) {
        throw new TypeError("Invalid event source");
    }
}

export function emitImpl(emitter: EventEmitterImpl, args: unknown[]): void {
    const subscriptions = emitter[SUBSCRIPTIONS];
    if (!subscriptions || !subscriptions.size) {
        return;
    }

    // Copy to allow (de-) registration of handlers during emit.
    // This is convenient for correctness but may been further optimization
    // if events are emitted frequently.
    for (const subscription of Array.from(subscriptions)) {
        dispatch(subscription, args);
    }
}

export function subscribeImpl(
    emitter: EventEmitterImpl,
    callback: RawCallback,
    options: SubscribeOptions & { sync: boolean }
): CleanupHandle {
    let subscriptions = emitter[SUBSCRIPTIONS];
    if (!subscriptions) {
        subscriptions = new Set();
        emitter[SUBSCRIPTIONS] = subscriptions;
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
    return {
        destroy: () => subscription.remove()
    };
}
