import { ReactiveMap, reactiveMap } from "./ReactiveMap";

/**
 * A reactive set.
 *
 * This set interface is designed ot be very similar to (but not exactly the same as) the standard JavaScript `Set`.
 *
 * Reads from and writes to this set are reactive.
 */
export interface ReactiveSet<V> extends Iterable<V> {
    /**
     * Returns the current number of entries.
     */
    readonly size: number;

    /**
     * Removes all values from this set.
     */
    clear(): void;

    /**
     * Returns `true` if the set currently contains the given `value`, `false` otherwise.
     */
    has(value: V): boolean;

    /**
     * Adds the given value to the set.
     */
    add(value: V): this;

    /**
     * Removes the given `value` from this set.
     * Returns `true` if value was a previously in this set, or `false` otherwise.
     */
    delete(value: V): boolean;

    /**
     * Returns an iterator over the `[value, value]` entries in this set.
     *
     * NOTE: This is actually in the JS Standard..
     */
    entries(): IterableIterator<[value: V, value: V]>;

    /**
     * Returns an iterator over the values in this set.
     */
    values(): IterableIterator<V>;

    /**
     * Returns an iterator over the values in this set.
     */
    [Symbol.iterator](): IterableIterator<V>;
}

/**
 * Reactive set interface without modifying methods.
 *
 * See also {@link ReactiveSet}.
 */
export type ReadonlyReactiveSet<K> = Omit<ReactiveSet<K>, "set" | "delete" | "clear">;

/**
 * Constructs a new {@link ReactiveMap} with the given initial content.
 *
 * @example
 *
 * ```ts
 * // Empty
 * const set1 = reactiveSet<string, number>();
 *
 * // With initial content
 * const set2 = reactiveSet<string>(["foo", "bar"]);
 * ```
 */
export function reactiveSet<V>(initial?: Iterable<V> | undefined): ReactiveSet<V> {
    return new ReactiveSetImpl<V>(initial);
}

export class ReactiveSetImpl<V> implements ReactiveSet<V> {
    #impl: ReactiveMap<V, undefined>;

    constructor(initial: Iterable<V> | undefined) {
        this.#impl = reactiveMap(initial ? mapToMapEntries(initial) : undefined);
    }

    get size(): number {
        return this.#impl.size;
    }

    clear(): void {
        this.#impl.clear();
    }

    has(value: V): boolean {
        return this.#impl.has(value);
    }

    add(value: V): this {
        this.#impl.set(value, undefined);
        return this;
    }

    delete(value: V): boolean {
        return this.#impl.delete(value);
    }

    entries(): IterableIterator<[value: V, value: V]> {
        return mapToDuplicateEntries(this.values());
    }

    values(): IterableIterator<V> {
        return this.#impl.keys();
    }

    [Symbol.iterator](): IterableIterator<V> {
        return this.values();
    }
}

function* mapToMapEntries<V>(iterable: Iterable<V>): Generator<[V, undefined]> {
    for (const value of iterable) {
        yield [value, undefined];
    }
}

function* mapToDuplicateEntries<V>(iterable: Iterable<V>): Generator<[V, V]> {
    for (const value of iterable) {
        yield [value, value];
    }
}
