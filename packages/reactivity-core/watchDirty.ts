import { effect as rawEffect } from "@preact/signals-core";
import { CleanupHandle, ReadonlyReactive } from "./types";

/**
 * **Experimental**. 
 * Notifies the given `callback` whenever the `signal` might have changed,
 * without recomputing the signal's current value.
 *
 * This is a difficult to use, low level API that can be used to build higher level abstractions.
 * 
 * Things to keep in mind when using this function:
 * The `callback` should be cheap to invoke (as a signal might change often) and it **must not** throw an exception.
 * It should also not make use of any reactive values.
 *
 * @param signal The signal being watched.
 * @param callback The callback to be called whenever the signal might have changed.
 *
 * @group Watching
 */
export function subtleWatchDirty<T>(signal: ReadonlyReactive<T>, callback: () => void): CleanupHandle {
    // Uses the effect's internals to track signal invalidations.
    // The effect body is only called once!
    // See https://github.com/preactjs/signals/issues/593#issuecomment-2349672856
    let start!: () => () => void;
    const destroy = rawEffect(function (this: RawEffectInternals) {
        this[_NOTIFY] = callback.bind(undefined); // hide 'this'
        start = this[_START].bind(this);
    });

    const end = start();
    try {
        signal.value; // Tracked
    } catch (ignored) {
        // We only care about the dependency being set up correctly.
        void ignored;
    } finally {
        end();
    }

    return {
        destroy
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
