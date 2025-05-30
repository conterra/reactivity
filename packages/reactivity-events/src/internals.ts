// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import {
    batch,
    CleanupHandle,
    dispatchAsyncCallback,
    reactive,
    reportCallbackError,
    syncEffect,
    untracked
} from "@conterra/reactivity-core";
import { EmitterOptions, SubscribeOptions } from "./events";

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

export function assertEmitter(value: unknown): asserts value is EventEmitterImpl {
    if (!(value instanceof EventEmitterImpl)) {
        throw new TypeError("Invalid event source");
    }
}

export function emitImpl(emitter: EventEmitterImpl, args: unknown[]): void {
    const subscriptions = getSubscriptions(emitter);
    if (!subscriptions || !subscriptions.size) {
        return;
    }

    // Copy to allow (de-) registration of handlers during emit.
    // This is convenient for correctness but may need further optimization
    // if events are emitted frequently.
    for (const subscription of Array.from(subscriptions)) {
        dispatch(subscription, args);
    }
}

export function subscribeImpl(
    emitterArg: EventEmitterImpl,
    callback: RawCallback,
    options: SubscribeOptions & { sync: boolean }
): CleanupHandle {
    return batch(() => {
        let emitter: EventEmitterImpl | undefined = emitterArg;
        const subscription: Subscription = {
            once: options.once ?? false,
            sync: options.sync,
            get isActive(): boolean {
                return (emitter && getSubscriptions(emitter)?.has(subscription)) ?? false;
            },
            remove() {
                batch(() => {
                    if (!emitter) {
                        return;
                    }

                    const subscriptions = getSubscriptions(emitter);
                    if (subscriptions) {
                        subscriptions.delete(subscription);
                        if (subscriptions.size == 0) {
                            emitter[UNSUBSCRIBED]?.();
                        }
                    }
                    emitter = undefined;
                });
            },
            callback
        };

        const subscriptions = getSubscriptions(emitter, true);
        subscriptions.add(subscription);
        try {
            if (subscriptions.size === 1) {
                emitter[SUBSCRIBED]?.();
            }
        } catch (e) {
            subscriptions.delete(subscription);
            throw e;
        }
        return {
            destroy: () => subscription.remove()
        };
    });
}

const SUBSCRIBED = Symbol("subscribed");
const UNSUBSCRIBED = Symbol("unsubscribed");
const SUBSCRIPTIONS = Symbol("subscriptions");

export class EventEmitterImpl {
    [SUBSCRIBED]?: () => void;
    [UNSUBSCRIBED]?: () => void;

    // Set<T> maintains insertion order.
    [SUBSCRIPTIONS]?: Set<Subscription>;

    constructor(options: EmitterOptions<void> | undefined) {
        if (options?.subscribed) {
            this[SUBSCRIBED] = options.subscribed;
        }
        if (options?.unsubscribed) {
            this[UNSUBSCRIBED] = options.unsubscribed;
        }
    }
}

function getSubscriptions(emitter: EventEmitterImpl, init: true): Set<Subscription>;
function getSubscriptions(emitter: EventEmitterImpl, init?: boolean): Set<Subscription> | undefined;
function getSubscriptions(
    emitter: EventEmitterImpl,
    init: boolean = false
): Set<Subscription> | undefined {
    let subscriptions = emitter[SUBSCRIPTIONS];
    if (!subscriptions && init) {
        subscriptions = emitter[SUBSCRIPTIONS] = new Set();
    }
    return subscriptions;
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
