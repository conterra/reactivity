import {
    dispatchAsyncCallback,
    reactive,
    reportCallbackError,
    syncEffect,
    untracked
} from "@conterra/reactivity-core";
import { Subscription } from "./internals";

type SyncDispatchItem = [subscription: Subscription, args: unknown[]];

export function dispatch(subscriber: Subscription, args: unknown[]): void {
    if (subscriber.sync) {
        // Can't call the subscriber's callback here because we might currently be in a batch.
        // The signal manipulation triggers an effect which then invokes the scheduled callbacks (once the batch is complete).
        // If there is no batch, this will invoke the callback immediately within the assignment below.
        SYNC_QUEUE.push([subscriber, args]);
        TRIGGER_DISPATCH.value = !TRIGGER_DISPATCH.peek();
    } else {
        // Execution of async callbacks is always out of a batch.
        dispatchAsyncCallback(invokeCallback.bind(null, subscriber, args));
    }
}

const TRIGGER_DISPATCH = reactive(false);
const SYNC_QUEUE: SyncDispatchItem[] = [];
syncEffect(() => {
    void TRIGGER_DISPATCH.value; // Setup dependency

    untracked(() => {
        while (SYNC_QUEUE.length) {
            const [subscriber, args] = SYNC_QUEUE.shift()!;
            invokeCallback(subscriber, args);
        }
    });
});

function invokeCallback(subscriber: Subscription, args: unknown[]) {
    if (!subscriber.isActive) {
        return;
    }

    if (subscriber.once) {
        subscriber.remove();
    }

    try {
        subscriber.callback(...args);
    } catch (e) {
        reportCallbackError(e, "Error in event callback");
    }
}
