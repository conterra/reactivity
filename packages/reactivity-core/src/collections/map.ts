// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { batch } from "../signals";
import { Trackers } from "./tracking";

/**
 * A reactive map.
 *
 * This map interface is designed to be very similar to (but not exactly the same as) the standard JavaScript `Map`.
 *
 * Reads from and writes to this map are reactive.
 *
 * @group Collections
 */
export interface ReactiveMap<K, V> extends Iterable<[key: K, value: V]> {
    /**
     * Returns the current number of entries.
     */
    readonly size: number;

    /**
     * Removes all entries from this map.
     */
    clear(): void;

    /**
     * Returns `true` if the map currently has an entry for the given `key`, `false` otherwise.
     */
    has(key: K): boolean;

    /**
     * Returns the currently associated value for the given `key`, or `undefined` if there is no such value.
     */
    get(key: K): V | undefined;

    /**
     * Associates the given `key` with `value`.
     */
    set(key: K, value: V): this;

    /**
     * Removes the entry for the given `key`.
     * Returns `true` if there was such an entry, or `false` otherwise.
     */
    delete(key: K): boolean;

    /**
     * Executes the given callback for every entry of the map.
     *
     * See also [Map.forEach](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach).
     */
    forEach(callback: (value: V, key: K) => void): void;

    /**
     * Returns an iterator over the `[key, value]` entries in this map.
     */
    entries(): IterableIterator<[key: K, value: V]>;

    /**
     * Returns an iterator over the keys in this map.
     */
    keys(): IterableIterator<K>;

    /**
     * Returns an iterator over the values in this map.
     */
    values(): IterableIterator<V>;

    /**
     * Returns an iterator over the `[key, value]` entries in this map.
     */
    [Symbol.iterator](): IterableIterator<[key: K, value: V]>;
}

/**
 * Reactive map interface without modifying methods.
 *
 * See also {@link ReactiveMap}.
 *
 * @group Collections
 */
export type ReadonlyReactiveMap<K, V> = Omit<ReactiveMap<K, V>, "set" | "delete" | "clear">;

/**
 * Constructs a new {@link ReactiveMap} with the given initial content.
 *
 * @example
 *
 * ```ts
 * // Empty
 * const map1 = reactiveMap<string, number>();
 *
 * // With initial content
 * const map2 = reactiveMap<string, number>([["foo", 1], ["bar", 2]]);
 * ```
 *
 * @group Collections
 */
export function reactiveMap<K, V>(initial?: Iterable<[K, V]>): ReactiveMap<K, V> {
    return new ReactiveMapImpl(initial);
}

// This key is triggered whenever _any_ entry is added or removed.
const ENTRIES_CHANGE = Symbol("ENTRIES_CHANGE");

class ReactiveMapImpl<K, V> implements ReactiveMap<K, V> {
    #trackers: Trackers<K | typeof ENTRIES_CHANGE> | undefined;
    #values: Map<K, V>;

    constructor(initial: Iterable<[K, V]> | undefined) {
        this.#values = new Map(initial);
    }

    get size(): number {
        this.#getTrackers().track(ENTRIES_CHANGE);
        return this.#values.size;
    }

    forEach(callback: (value: V, key: K) => void): void {
        const trackers = this.#getTrackers();
        trackers.track(ENTRIES_CHANGE);
        this.#values.forEach((value, key) => {
            trackers.track(key);
            callback(value, key);
        });
    }

    *entries(): IterableIterator<[K, V]> {
        this.#getTrackers().track(ENTRIES_CHANGE);
        for (const key of this.#values.keys()) {
            const value = this.get(key)!; // tracks
            yield [key, value];
        }
    }

    keys(): IterableIterator<K> {
        this.#getTrackers().track(ENTRIES_CHANGE);
        return this.#values.keys();
    }

    *values(): IterableIterator<V> {
        this.#getTrackers().track(ENTRIES_CHANGE);
        for (const key of this.#values.keys()) {
            const value = this.get(key)!; // tracks
            yield value;
        }
    }

    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    clear(): void {
        if (!this.#values.size) {
            return;
        }

        batch(() => {
            // Trigger all trackers for all keys that were in the map
            const trackers = this.#trackers;
            if (trackers) {
                for (const key of this.#values.keys()) {
                    trackers.trigger(key);
                }
                trackers.trigger(ENTRIES_CHANGE);
            }

            this.#values.clear();
        });
    }

    delete(key: K): boolean {
        const hadKey = this.#values.delete(key);
        const trackers = this.#trackers;
        if (hadKey && trackers) {
            // existing key was removed - trigger watchers
            batch(() => {
                trackers.trigger(key);
                trackers.trigger(ENTRIES_CHANGE);
            });
        }
        return hadKey;
    }

    get(key: K): V | undefined {
        this.#getTrackers().track(key);
        return this.#values.get(key);
    }

    has(key: K): boolean {
        // NOTE: Could be optimized further (only change if entry added / removed, not on individual value changes)
        this.#getTrackers().track(key);
        return this.#values.has(key);
    }

    set(key: K, value: V): this {
        const trackers = this.#trackers;
        const hadEntry = this.#values.has(key);
        this.#values.set(key, value);
        if (trackers) {
            batch(() => {
                if (!hadEntry) {
                    // New entry
                    trackers.trigger(ENTRIES_CHANGE);
                }
                trackers.trigger(key);
            });
        }
        return this;
    }

    #getTrackers() {
        return (this.#trackers ??= new Trackers());
    }
}
