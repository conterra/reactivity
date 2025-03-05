import {
    dispatchAsyncCallback,
    reactive,
    reportCallbackError,
    syncEffect,
    untracked
} from "@conterra/reactivity-core";
import { Subscription } from "./internals";

export function dispatch(subscriber: Subscription, args: unknown[]): void {
    if (subscriber.sync) {
        // Can't call the subscriber's callback here because we might currently be in a batch.
        // The signal manipulation triggers an effect which then invokes the scheduled callbacks (once the batch is complete).
        // If there is no batch, this will invoke the callback immediately within the assignment below.
        SYNC_QUEUE.push([subscriber, args]);
        if (SYNC_QUEUE.length === 1) {
            TRIGGER_DISPATCH.value = !TRIGGER_DISPATCH.peek(); // schedule execution of effect
        }
    } else {
        // Execution of async callbacks is always outside of a batch.
        dispatchAsyncCallback(() => invokeCallback(subscriber, args));
    }
}

type SyncDispatchItem = [subscription: Subscription, args: unknown[]];

const TRIGGER_DISPATCH = reactive(false);
const SYNC_QUEUE: SyncDispatchItem[] = [];
syncEffect(() => {
    void TRIGGER_DISPATCH.value; // Setup dependency
    untracked(() => {
        for (const [subscriber, args] of SYNC_QUEUE) {
            invokeCallback(subscriber, args); // does not throw
        }
        SYNC_QUEUE.length = 0;
    });
});

function invokeCallback(subscriber: Subscription, args: unknown[]) {
    if (!subscriber.isActive) {
        // May have unsubscribed in the meantime, for example if the callback has been delayed (async or batch).
        return;
    }

    try {
        subscriber.callback(...args);
    } catch (e) {
        reportCallbackError(e, "Error in event callback");
    } finally {
        if (subscriber.once) {
            subscriber.remove();
        }
    }
}
