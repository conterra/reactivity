import { Reactive } from "../types";
import { reactive } from "../ReactiveImpl";

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
export function reactiveMap<K, V>(initial?: Iterable<[K, V]> | undefined): ReactiveMap<K, V> {
    return new ReactiveMapImpl(initial);
}

class ReactiveMapImpl<K, V> implements ReactiveMap<K, V> {
    #map: Map<K, Reactive<V>> = new Map();
    #structureChanged = reactive(false); // toggled to notify about additions, removals

    constructor(initial: Iterable<[K, V]> | undefined) {
        if (initial) {
            for (const [k, v] of initial) {
                this.#map.set(k, reactive(v));
            }
        }
    }

    get size(): number {
        this.#subscribeToStructureChange();
        return this.#map.size;
    }

    entries(): IterableIterator<[K, V]> {
        this.#subscribeToStructureChange();
        return this.#iterateEntries();
    }

    keys(): IterableIterator<K> {
        this.#subscribeToStructureChange();
        const entries = this.#map;
        return entries.keys();
    }

    values(): IterableIterator<V> {
        this.#subscribeToStructureChange();
        return this.#iterateValues();
    }

    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }

    clear(): void {
        const hadEntries = !!this.#map.size;
        this.#map.clear();
        if (hadEntries) {
            // existing keys were removed - trigger watchers
            this.#triggerStructuralChange();
        }
    }

    delete(key: K): boolean {
        const hadKey = this.#map.delete(key);
        if (hadKey) {
            // existing key was removed - trigger watchers
            this.#triggerStructuralChange();
        }
        return hadKey;
    }

    get(key: K): V | undefined {
        this.#subscribeToStructureChange();
        const cell = this.#map.get(key);
        return cell?.value;
    }

    has(key: K): boolean {
        this.#subscribeToStructureChange();
        return this.#map.has(key);
    }

    set(key: K, value: V): this {
        const cell = this.#map.get(key);
        if (cell) {
            // existing key - no structural change
            cell.value = value;
        } else {
            // new key - trigger watchers
            this.#map.set(key, reactive(value));
            this.#triggerStructuralChange();
        }
        return this;
    }

    #subscribeToStructureChange() {
        // Using the value adds a dependency to that value.
        // When #triggerStructuralChange() is called
        // values depending on this line will be re-executed.
        this.#structureChanged.value;
    }

    #triggerStructuralChange() {
        this.#structureChanged.value = !this.#structureChanged.peek();
    }

    *#iterateEntries(): Generator<[K, V]> {
        const entries = this.#map.entries();
        for (const [k, cell] of entries) {
            yield [k, cell.value];
        }
    }

    *#iterateValues(): Generator<V> {
        const values = this.#map.values();
        for (const cell of values) {
            yield cell.value;
        }
    }
}
