// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { effect as rawEffect } from "@preact/signals-core";
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
