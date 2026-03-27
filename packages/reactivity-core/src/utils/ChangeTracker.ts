// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { Signal as RawSignal, signal as rawSignal } from "@preact/signals-core";
import { nextVersion } from "./nextVersion";

/**
 * A simple signal for triggering changes.
 * @internal
 */
export type ChangeTracker = RawSignal<number>;

/** @internal */
export function createTracker() {
    return rawSignal(0);
}

/**
 * Tracks changes that happen on the given signal.
 *
 * @internal
 */
export function trackChanges(tracker: ChangeTracker) {
    // Read value to be notified about changes.
    void tracker.value;
}

/**
 * Triggers all clients that are tracking changes on the given signal.
 *
 * @internal
 */
export function triggerChange(tracker: ChangeTracker) {
    tracker.value = nextVersion(tracker.peek());
}
