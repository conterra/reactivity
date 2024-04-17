import { Reactive } from "../Reactive";
import { reactive } from "../ReactiveImpl";

/**
 * Reactive array interface without modifying methods.
 *
 * See also {@link ReactiveArray}.
 *
 * @group Collections
 */
export interface ReadonlyReactiveArray<T> extends Iterable<T> {
    /**
     * Returns the current number of items in this Array.
     */
    readonly length: number;

    /**
     * Returns a new, non-reactive array with this Array's current content.
     */
    getItems(): T[];

    /**
     * Returns the item at the given index, or `undefined` if the index is out of bounds.
     * You can use negative indices to address items starting from the end of the Array.
     *
     * See also [Array.at](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at).
     */
    at(index: number): T | undefined;

    /**
     * Returns the item at the given index, or `undefined` if the index is out of bounds.
     */
    get(index: number): T | undefined;

    /**
     * Sets the item at the given index to `value`.
     */
    set(index: number, value: T): void;

    /**
     * Returns a shallow copy of this Array.
     *
     * See also [Array.slice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice).
     */
    slice(start?: number): ReactiveArray<T>;

    /**
     * Returns a shallow copy of this array.
     *
     * See also [Array.slice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice).
     */
    slice(start: number, end?: number): ReactiveArray<T>;

    /**
     * Returns a new array with `values` concatenated to the end of the current content.
     *
     * See also [Array.concat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat).
     */
    concat(...values: T[]): ReactiveArray<T>;

    /**
     * Returns a new array with `values` concatenated to the end of the current content.
     *
     * See also [Array.concat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat).
     */
    concat(...values: (T | T[] | ReadonlyReactiveArray<T>)[]): ReactiveArray<T>;

    /**
     * Searches for the given `value` and returns `true` if it was found, `false` otherwise.
     *
     * See also [Array.includes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes).
     */
    includes(value: T, fromIndex?: number): boolean;

    /**
     * Searches for the given `value` and returns its index, or `-1` if it was not found.
     *
     * See also [Array.indexOf](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf).
     */
    indexOf(value: T, fromIndex?: number): number;

    /**
     * Searches backwards for the given `value` and returns its index, or `-1` if it was not found.
     *
     * See also [Array.lastIndexOf](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/lastIndexOf).
     */
    lastIndexOf(value: T): number;

    /**
     * Returns the first item that satisfies the given predicate, or `undefined` if there is no such item.
     *
     * See also [Array.find](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find).
     */
    find<U extends T>(predicate: (value: T, index: number) => value is U): U | undefined;

    /**
     * Returns the first item that satisfies the given predicate, or `undefined` if there is no such item.
     *
     * See also [Array.find](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find).
     */
    find(predicate: (value: T, index: number) => boolean): T | undefined;

    /**
     * Returns the last item that satisfies the given predicate, or `undefined` if there is no such item.
     *
     * See also [Array.findLast](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLast).
     */
    findLast<U extends T>(predicate: (value: T, index: number) => value is U): U | undefined;

    /**
     * Returns the last item that satisfies the given predicate, or `undefined` if there is no such item.
     *
     * See also [Array.findLast](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLast).
     */
    findLast(predicate: (value: T, index: number) => boolean): T | undefined;

    /**
     * Returns the index of the first item that satisfies the given predicate, `-1` if no such item was found.
     *
     * See also [Array.findIndex](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex).
     */
    findIndex(predicate: (value: T, index: number) => boolean): number;

    /**
     * Returns the index of the first item that satisfies the given predicate, `-1` if no such item was found.
     *
     * See also [Array.findLastIndex](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLastIndex).
     */
    findLastIndex(predicate: (value: T, index: number) => boolean): number;

    /**
     * Returns `true` if at least one item satisfies the given predicate, `false` otherwise.
     *
     * See also [Array.some](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some).
     */
    some(predicate: (value: T, index: number) => boolean): boolean;

    /**
     * Returns `true` if the predicate is satisfied for every item in this array, `false` otherwise.
     *
     * See also [Array.every](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every).
     */
    every(predicate: (value: T, index: number) => boolean): boolean;

    /**
     * Executes the given callback for every item in the array.
     *
     * See also [Array.forEach](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach).
     */
    forEach(callback: (value: T, index: number) => void): void;

    /**
     * Returns a new array where only items are retained that fulfilled the given predicate.
     *
     * See also [Array.filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).
     */
    filter<U extends T>(predicate: (value: T, index: number) => value is U): ReactiveArray<U>;

    /**
     * Returns a new array where only items are retained that fulfilled the given predicate.
     *
     * See also [Array.filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).
     */
    filter(predicate: (value: T, index: number) => boolean): ReactiveArray<T>;

    /**
     * Returns a new array where every item has been replaced with the result of calling the given callback function.
     *
     * See also [Array.map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map).
     */
    map<U>(callback: (value: T, index: number) => U): ReactiveArray<U>;

    /**
     * Returns a new array where every item has been replaced with the result of calling the given callback function.
     * If the callback function returns an array, the items in that array are included individually.
     *
     * See also [Array.flatMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap).
     */
    flatMap<U>(callback: (value: T, index: number) => U | readonly U[]): ReactiveArray<U>;

    /**
     * Calls the given callback function for all items in this array.
     * The return value of the previous callback invocation is passed in the next call.
     * The final result of the callback will be returned from this function.
     *
     * See also [Array.reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce).
     */
    reduce(callback: (previousValue: T, currentValue: T, currentIndex: number) => T): T;

    /**
     * Calls the given callback function for all items in this array.
     * The return value of the previous callback invocation is passed in the next call.
     * The final result of the callback will be returned from this function.
     *
     * See also [Array.reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce).
     */
    reduce(
        callback: (previousValue: T, currentValue: T, currentIndex: number) => T,
        initialValue: T
    ): T;

    /**
     * Calls the given callback function for all items in this array.
     * The return value of the previous callback invocation is passed in the next call.
     * The final result of the callback will be returned from this function.
     *
     * See also [Array.reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce).
     */
    reduce<U>(
        callback: (previousValue: U, currentValue: T, currentIndex: number) => U,
        initialValue: U
    ): U;

    /**
     * Calls the given callback function for all items in this array, starting from the back.
     * The return value of the previous callback invocation is passed in the next call.
     * The final result of the callback will be returned from this function.
     *
     * See also [Array.reduceRight](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight).
     */
    reduceRight(callback: (previousValue: T, currentValue: T, currentIndex: number) => T): T;

    /**
     * Calls the given callback function for all items in this array, starting from the back.
     * The return value of the previous callback invocation is passed in the next call.
     * The final result of the callback will be returned from this function.
     *
     * See also [Array.reduceRight](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight).
     */
    reduceRight(
        callback: (previousValue: T, currentValue: T, currentIndex: number) => T,
        initialValue: T
    ): T;

    /**
     * Calls the given callback function for all items in this array, starting from the back.
     * The return value of the previous callback invocation is passed in the next call.
     * The final result of the callback will be returned from this function.
     *
     * See also [Array.reduceRight](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight).
     */
    reduceRight<U>(
        callback: (previousValue: U, currentValue: T, currentIndex: number) => U,
        initialValue: U
    ): U;

    /**
     * Returns an iterator over the indices in this array.
     */
    keys(): IterableIterator<number>;

    /**
     * Returns an iterator over the items in this array.
     */
    values(): IterableIterator<T>;

    /**
     * Returns an iterator over the `[index, value]` entries in this array.
     */
    entries(): IterableIterator<[index: number, value: T]>;
}

/**
 * A reactive array class.
 *
 * The array interface here works similar to the builtin `Array` (i.e. `T[]`).
 * The major difference is that one must use the `get` and `set` methods instead of
 * using square brackets, i.e. use `array.get(i)` instead of `array[i]` and `array.set(i, v)` instead of `array[i] = v`.
 * Not all builtin array methods are implemented right now, but most of them are.
 *
 * Reads and writes to this array are reactive.
 *
 * @group Collections
 */
export interface ReactiveArray<T> extends ReadonlyReactiveArray<T> {
    /**
     * Appends all given values to the end of this array.
     *
     * See also [Array.push](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push).
     */
    push(...values: T[]): void;

    /**
     * Removes the last item from this array and returns it, or `undefined` if the array was empty.
     *
     * See also [Array.pop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/pop).
     */
    pop(): T | undefined;

    /**
     * Appends all given values to the beginning of this array.
     *
     * See also [Array.unshift](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/unshift).
     */
    unshift(...values: T[]): void;

    /**
     * Removes the first value from this array and returns it, or `undefined` if the array was empty.
     *
     * See also [Array.shift](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift).
     */
    shift(): T | undefined;

    /**
     * Changes the contents of this array by removing, replacing and optionally adding new elements.
     *
     * See also [Array.splice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice).
     */
    splice(start: number, deleteCount?: number): T[];

    /**
     * Changes the contents of this array by removing, replacing and optionally adding new elements.
     *
     * See also [Array.splice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice).
     */
    splice(start: number, deleteCount: number, ...values: T[]): T[];

    /**
     * Sorts this array using the given comparison function.
     *
     * See also [Array.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort).
     */
    sort(compare: (a: T, b: T) => number): void;
}

/**
 * Constructs a new {@link ReactiveArray} with the given initial content.
 *
 * @example
 *
 * ```ts
 * // Empty
 * const array1 = reactiveArray<number>();
 *
 * // With initial content
 * const array2 = reactiveArray<number>([1, 2, 3]);
 * ```
 *
 * @group Collections
 */
export function reactiveArray<T>(items?: Iterable<T>): ReactiveArray<T> {
    return new ReactiveArrayImpl(items);
}

class ReactiveArrayImpl<T> implements ReactiveArray<T> {
    #items: Reactive<T>[];
    #structureChanged = reactive(false);

    constructor(initial: Iterable<T> | undefined) {
        this.#items = initial ? Array.from(initial).map((v) => reactive(v)) : [];
    }

    get length(): number {
        this.#subscribeToStructureChange();
        return this.#items.length;
    }

    push(...values: T[]): void {
        this.#items.push(...values.map((v) => reactive(v)));
        this.#triggerStructuralChange();
    }

    pop(): T | undefined {
        if (this.#items.length === 0) {
            return;
        }

        const cell = this.#items.pop();
        this.#triggerStructuralChange();
        return cell!.value;
    }

    unshift(...values: T[]): void {
        this.#items.unshift(...values.map((v) => reactive(v)));
        this.#triggerStructuralChange();
    }

    shift(): T | undefined {
        if (this.#items.length === 0) {
            return;
        }

        const cell = this.#items.shift();
        this.#triggerStructuralChange();
        return cell!.value;
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    splice(...args: any[]): T[] {
        const newItems: any[] | undefined = args[2];
        const removedCells: Reactive<T>[] = (this.#items.splice as any)(...args);
        if ((newItems != null && newItems.length !== 0) || removedCells.length !== 0) {
            this.#triggerStructuralChange();
        }
        return removedCells.map((cell) => cell.value);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    sort(compare: (a: T, b: T) => number): void {
        this.#items.sort((a, b) => compare(a.value, b.value));
        this.#triggerStructuralChange();
    }

    getItems(): T[] {
        this.#subscribeToStructureChange();
        return this.#items.map((cell) => cell.value);
    }

    at(index: number): T | undefined {
        this.#subscribeToStructureChange();
        const cell = this.#items.at(index);
        return cell?.value;
    }

    get(index: number): T | undefined {
        this.#subscribeToStructureChange();
        const cell = this.#items[index];
        return cell?.value;
    }

    set(index: number, value: T): void {
        if (index < 0 || index >= this.#items.length) {
            throw new Error("index out of bounds");
        }

        const cell = this.#items[index];
        cell!.value = value;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slice(...args: any[]): ReactiveArray<T> {
        this.#subscribeToStructureChange();
        const items = this.#items.slice(...args).map((cell) => cell.value);
        return reactiveArray(items);
    }

    concat(...values: (T | T[] | ReadonlyReactiveArray<T>)[]): ReactiveArray<T> {
        const items = this.getItems().concat(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...values.map((v: any) => {
                if (v instanceof ReactiveArrayImpl) {
                    return v.getItems();
                }
                return v;
            })
        );
        return reactiveArray(items);
    }

    includes(value: T, fromIndex?: number | undefined): boolean {
        return this.#findIndex((v) => v === value, fromIndex) !== -1;
    }

    indexOf(value: T, fromIndex?: number | undefined): number {
        return this.#findIndex((v) => v === value, fromIndex);
    }

    lastIndexOf(value: T): number {
        return this.#findLastIndex((v) => v === value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    find(predicate: (value: T, index: number) => boolean): any {
        const index = this.#findIndex(predicate);
        return this.get(index);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findLast(predicate: (value: T, index: number) => boolean): any {
        const index = this.#findLastIndex(predicate);
        return this.get(index);
    }

    findIndex(predicate: (value: T, index: number) => boolean): number {
        return this.#findIndex(predicate);
    }

    findLastIndex(predicate: (value: T, index: number) => boolean): number {
        return this.#findLastIndex(predicate);
    }

    some(predicate: (value: T, index: number) => boolean): boolean {
        return this.#findIndex(predicate) !== -1;
    }

    every(predicate: (value: T, index: number) => boolean): boolean {
        return this.#findIndex((value, index) => !predicate(value, index)) === -1;
    }

    forEach(callback: (value: T, index: number) => void): void {
        for (const [index, value] of this.entries()) {
            callback(value, index);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter(predicate: (value: T, index: number) => boolean): ReactiveArray<any> {
        return reactiveArray(this.getItems().filter((value, index) => predicate(value, index)));
    }

    map<U>(callback: (value: T, index: number) => U): ReactiveArray<U> {
        return reactiveArray(this.getItems().map((value, index) => callback(value, index)));
    }

    flatMap<U>(callback: (value: T, index: number) => U | readonly U[]): ReactiveArray<U> {
        return reactiveArray(this.getItems().flatMap((value, index) => callback(value, index)));
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    reduce(
        callback: (previousValue: any, currentValue: T, currentIndex: number) => any,
        ...args: any[]
    ): any {
        this.#subscribeToStructureChange();
        return (this.#items.reduce as any)(
            (previousValue: any, cell: Reactive<T>, index: number) => {
                return callback(previousValue, cell.value, index);
            },
            ...args
        );
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    /* eslint-disable @typescript-eslint/no-explicit-any */
    reduceRight(
        callback: (previousValue: any, currentValue: T, currentIndex: number) => any,
        ...args: any[]
    ): any {
        this.#subscribeToStructureChange();
        return (this.#items.reduceRight as any)(
            (previousValue: any, cell: Reactive<T>, index: number) => {
                return callback(previousValue, cell.value, index);
            },
            ...args
        );
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    keys(): IterableIterator<number> {
        this.#subscribeToStructureChange();
        return this.#items.keys();
    }

    values(): IterableIterator<T> {
        this.#subscribeToStructureChange();
        return this.#iterateValues();
    }

    entries(): IterableIterator<[index: number, value: T]> {
        this.#subscribeToStructureChange();
        return this.#iterateEntries();
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this.values();
    }

    #findIndex(predicate: (value: T, index: number) => boolean, fromIndex?: number): number {
        for (let i = fromIndex ?? 0, n = this.length; i < n; ++i) {
            const v = this.get(i)!;
            if (predicate(v, i)) {
                return i;
            }
        }
        return -1;
    }

    #findLastIndex(predicate: (value: T, index: number) => boolean): number {
        for (let i = this.length; i-- > 0; ) {
            const v = this.get(i)!;
            if (predicate(v, i)) {
                return i;
            }
        }
        return -1;
    }

    *#iterateValues(): Generator<T> {
        for (const cell of this.#items) {
            yield cell.value;
        }
    }

    *#iterateEntries(): Generator<[number, T]> {
        for (const [index, cell] of this.#items.entries()) {
            yield [index, cell.value];
        }
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
}
