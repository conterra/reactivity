import {
    CleanupHandle,
    dispatchAsyncCallback,
    reactive,
    reportCallbackError,
    syncEffect,
    untracked
} from "@conterra/reactivity-core";
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

function dispatch(subscriber: Subscription, args: unknown[]): void {
    if (subscriber.sync) {
        // Can't call the subscriber's callback here because we might currently be in a batch.
        // The signal manipulation triggers an effect which then invokes the scheduled callbacks (once the batch is complete).
        // If there is no batch, this will invoke the callback immediately within the assignment below.
        SYNC_QUEUE.push([subscriber, args]);
        if (!DISPATCH_SCHEDULED) {
            DISPATCH_SCHEDULED = true;

            // Schedule execution of effect.
            // Note that this will call the effect immediately (within the assignment)
            // if we're not in a batch.
            TRIGGER_DISPATCH.value = !TRIGGER_DISPATCH.peek();
        }
    } else {
        // Execution of async callbacks is always outside of a batch.
        dispatchAsyncCallback(() => invokeCallback(subscriber, args));
    }
}

type SyncDispatchItem = [subscription: Subscription, args: unknown[]];

let DISPATCH_SCHEDULED = false;
let SYNC_QUEUE: SyncDispatchItem[] = [];
const TRIGGER_DISPATCH = reactive(false);
syncEffect(() => {
    void TRIGGER_DISPATCH.value; // Setup dependency
    untracked(() => {
        // Note: callbacks invoked here may push further items to the queue
        while (SYNC_QUEUE.length) {
            // Swap to avoid concurrent modifications
            const items = SYNC_QUEUE;
            SYNC_QUEUE = [];

            for (const [subscription, args] of items) {
                invokeCallback(subscription, args); // does not throw
            }
        }

        DISPATCH_SCHEDULED = false;
    });
});

function invokeCallback(subscription: Subscription, args: unknown[]) {
    if (!subscription.isActive) {
        // May have unsubscribed in the meantime, for example if the callback has been delayed (async or batch).
        return;
    }

    try {
        subscription.callback(...args);
    } catch (e) {
        reportCallbackError(e, "Error in event callback");
    } finally {
        if (subscription.once) {
            subscription.remove();
        }
    }
}
