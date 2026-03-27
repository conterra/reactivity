// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { batch } from "../signals";
import { ChangeTracker, createTracker, trackChanges, triggerChange } from "../utils/ChangeTracker";

/**
 * Supports notifications of arbitrary key changes based on signals.
 *
 * General idea:
 * - Tracking a key creates a new signal for that key
 * - Triggering an event for the key changes that signal, thus notifying any previous subscribers
 *
 * Memory management:
 *
 * - Requesting arbitrary keys will continually grow the map of (key, signal) pairs -> potential resource leak.
 * - We use weak references to clean up stale entries
 * - When a signal is being used in a computation (effect, computed), that user has a _strong_ reference to that signal
 *   Thus, when a nobody is interested in a signal, it will no longer have any incoming strong references.
 * - The finalization registry detects when the garbage collector releases stale signals; the configured callback removes them from the map.
 *
 * > NOTE: We use raw signals instead of our wrapper objects here.
 * > Watchers hold a reference to that object, our wrapper object would become garbage almost immediately.
 */
export class Trackers<Key> {
    #trackers: Map<Key, WeakRef<ChangeTracker>> | undefined;
    #finalizers: FinalizationRegistry<Key> | undefined;

    constructor() {
        if (import.meta.env.VITEST) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this as any).getTrackerMap = () => this.#getTrackers();
        }
    }

    /**
     * Tracks future changes that happen on the given `key`.
     */
    track(key: Key) {
        const trackers = this.#getTrackers();
        const finalizers = this.#getFinalizers();

        let trackerRef: WeakRef<ChangeTracker> | undefined = trackers.get(key);
        let tracker = trackerRef?.deref();
        if (!tracker) {
            tracker = createTracker();
            trackerRef = new WeakRef(tracker);
            trackers.set(key, trackerRef);
            finalizers.register(tracker, key);
        }

        trackChanges(tracker);
    }

    /**
     * Triggers any clients that previously tracked the given `key`.
     */
    trigger(key: Key) {
        const tracker = this.#trackers?.get(key)?.deref();
        if (tracker) {
            triggerChange(tracker);
        }
    }

    /**
     * Triggers all clients that previously tracked any `key`.
     */
    triggerAll() {
        batch(() => {
            this.#trackers?.forEach((trackerRef) => {
                const tracker = trackerRef.deref();
                if (tracker) {
                    triggerChange(tracker);
                }
            });
        });
    }

    #getTrackers() {
        return (this.#trackers ??= new Map());
    }

    #getFinalizers() {
        return (this.#finalizers ??= new FinalizationRegistry((key) => {
            const trackers = this.#trackers;
            if (trackers) {
                const trackerRef = trackers.get(key);
                // Tracker was collected, clean up map entry
                if (trackerRef && !trackerRef.deref()) {
                    trackers.delete(key);
                }
            }
        }));
    }
}
