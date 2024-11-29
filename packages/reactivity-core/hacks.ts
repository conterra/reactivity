import {
    ReadonlySignal as RawReadonlySignal,
    computed as rawComputed,
    effect as rawEffect
} from "@preact/signals-core";
import { CleanupHandle } from "./types";

/** @internal */
export interface RawWatcher extends CleanupHandle {
    /**
     * Starts a tracking context. Use the returned callback to end the context.
     */
    start(): () => void;
}

/**
 * Creates a watcher that calls the `onNotify` callback when a signal
 * used within the watcher's tracking context changes.
 *
 * The tracking context is started by calling the `start` on the returned
 * watcher.
 *
 * WARNING: The `onNotify` callback is very aggressive: it gets called _within_ a batch().
 * @internal
 */
export function createWatcher(onNotify: () => void): RawWatcher {
    // Uses the effect's internals to track signal invalidations.
    // The effect body is only called once!
    // See https://github.com/preactjs/signals/issues/593#issuecomment-2349672856
    let start!: () => () => void;
    const destroy = rawEffect(function (this: RawEffectInternals) {
        this[_NOTIFY] = onNotify.bind(undefined); // hide 'this'
        start = this[_START].bind(this);
    });
    return {
        destroy,
        start
    };
}

// Mangled member names. See https://github.com/preactjs/signals/blob/main/mangle.json.
const _NOTIFY = "N";
const _START = "S";

interface RawEffectInternals {
    // Notifies the effect that a dependency has changed.
    // This usually schedules the effect to run again (when not overridden).
    [_NOTIFY](): void;

    // Starts the effect and returns a function to stop it again.
    // Signal accesses are tracked while the effect is running.
    [_START](): () => void;
}

// Mangled member names. See https://github.com/preactjs/signals/blob/main/mangle.json.
const _SUBSCRIBE = "S";
const _UNSUBSCRIBE = "U";

type RawSignalInternals<T> = RawReadonlySignal<T> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [_SUBSCRIBE](node: any): void;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [_UNSUBSCRIBE](node: any): void;
};

// Overrides the subscribe/unsubscribe methods of a signal to allow for custom subscription hooks.
export function rawComputedWithSubscriptionHook<T>(
    compute: () => T,
    subscribe: () => () => void
): RawReadonlySignal<T> {
    const signal = rawComputed(compute) as RawSignalInternals<T>;
    const origSubscribe = signal[_SUBSCRIBE];
    const origUnsubscribe = signal[_UNSUBSCRIBE];

    let subscriptions = 0;
    let cleanup: (() => void) | undefined;
    signal[_SUBSCRIBE] = function patchedSubscribe(node: unknown) {
        origSubscribe.call(this, node);
        if (subscriptions++ === 0) {
            cleanup = subscribe();
        }
    };
    signal[_UNSUBSCRIBE] = function patchedUnsubscribe(node: unknown) {
        origUnsubscribe.call(this, node);
        if (--subscriptions === 0) {
            cleanup?.();
            cleanup = undefined;
        }
    };
    return signal;
}
