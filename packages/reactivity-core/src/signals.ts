// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import {
    Signal as RawSignal,
    batch as rawBatch,
    computed as rawComputed,
    signal as rawSignal,
    untracked as rawUntracked
} from "@preact/signals-core";
import { rawComputedWithSubscriptionHook } from "./hacks";
import {
    AddBrand,
    AddWritableBrand,
    EqualsFunc,
    ExternalReactive,
    Reactive,
    ReactiveGetter,
    ReactiveOptions,
    ReadonlyReactive,
    RemoveBrand,
    SubscribeFunc
} from "./types";
import { defaultEquals } from "./utils/equality";

/**
 * Creates a new mutable signal, initialized to `undefined`.
 *
 * Example:
 *
 * ```ts
 * const foo = reactive<number>();
 * console.log(foo.value); // undefined
 * foo.value = 123;        // updates the current value
 * ```
 *
 * @group Primitives
 */
export function reactive<T>(): Reactive<T | undefined>;

/**
 * Creates a new mutable signal, initialized to the given value.
 *
 * Example:
 *
 * ```ts
 * const foo = reactive(123);
 * console.log(foo.value); // 123
 * foo.value = 456;        // updates the current value
 * ```
 *
 * @group Primitives
 */
export function reactive<T>(initialValue: T, options?: ReactiveOptions<T>): Reactive<T>;
export function reactive<T>(
    initialValue?: T,
    options?: ReactiveOptions<T | undefined>
): Reactive<T | undefined> {
    const impl = new WritableReactiveImpl(initialValue, options?.equal);
    return impl as AddWritableBrand<typeof impl>;
}

/**
 * Creates a new computed signal.
 *
 * The `compute` callback will be executed (and re-executed as necessary) to provide the current value.
 * The function body of `compute` is tracked automatically: any reactive values used by `compute`
 * will be watched automatically; if any of them changes then the computed value will be updated as well.
 *
 * > NOTE: the `compute` callback should not have any side effects as it may be called any number of times
 * > if its dependencies change.
 *
 * Example:
 *
 * ```ts
 * const foo = reactive(1);
 * const doubleFoo = computed(() => foo.value * 2);
 * console.log(doubleFoo.value); // 2
 *
 * foo.value = 2;
 * console.log(doubleFoo.value); // 4
 * ```
 *
 * @group Primitives
 */
export function computed<T>(
    compute: ReactiveGetter<T>,
    options?: ReactiveOptions<T>
): ReadonlyReactive<T> {
    const impl = new ComputedReactiveImpl(compute, options?.equal);
    return impl as AddBrand<typeof impl>;
}

/**
 * Creates a signal that integrates state from 'foreign' objects (e.g. different state management solutions)
 * into the reactivity system.
 *
 * The `compute` function should return the current value from the foreign object.
 * Just like with computed objects, the return value of `compute` will be cached.
 * Unlike computed objects, the `compute` function will _not_ be triggered automatically: you must subscribe
 * to changes on the foreign object (with whatever API is appropriate) and call the returned `ExternalReactive`'s
 * `trigger()` method.
 *
 * Once `.trigger()` has been called, accessing the reactive object's value will re-execute the `compute` method
 * and return the latest value.
 *
 * Example:
 *
 * ```js
 * // This example makes the state of an AbortSignal accessible as an reactive object.
 * const controller = new AbortController();
 * const signal = controller.signal;
 *
 * const aborted = external(() => signal.aborted);
 * signal.addEventListener("abort", aborted.trigger);
 * console.log(aborted.value); // false
 *
 * controller.abort(); // triggers the event handler registered above
 * console.log(aborted.value); // true
 *
 * // later: unsubscribe from signal
 * ```
 *
 * @group Primitives
 */
export function external<T>(compute: () => T, options?: ReactiveOptions<T>): ExternalReactive<T> {
    /*
        Implementation note:
        
        The external value is accessed by wrapping it inside a `computed()`.
        However, that computed block is untracked and therefore nonreactive.
        A simple 'version' signal is the only real reactive dependency.
        That signal is supposed to switch to a new value to trigger recomputation of the external value;
        that trigger can be called from the outside.

        Therefore, calling trigger() on the reactive object will recompute the external value.

        Alternative implementation: use the _notify() function from signals-core directly.
        It does pretty much the same thing for computed signals and would mean that we could get rid of the `trigger` signal.
        But that function is a) internal and b) mangled (to `N` at the time of this writing) -- this is too risky.
     */
    const invalidateSignal = rawSignal(false);
    const invalidate = () => {
        invalidateSignal.value = !invalidateSignal.peek();
    };
    const externalReactive = computed(() => {
        invalidateSignal.value;
        return rawUntracked(() => compute());
    }, options);
    (externalReactive as RemoveBrand<typeof externalReactive> as ReactiveImpl<T>).trigger =
        invalidate;
    return externalReactive as ExternalReactive<T>;
}

/**
 * Creates a signal that synchronizes with a foreign data source.
 *
 * This kind of signal is useful when integrating another library (DOM APIs, etc.) that does not
 * use the reactivity system provided by this library.
 * The major advantage of this API is that it will automatically subscribe to the foreign data source while the signal is actually being used.
 * It will also automatically unsubscribe when the signal is no longer used.
 * A signal is considered "used" when it is used by some kind of active effect or watch.
 *
 * Principles:
 * - The `getter` function should return the current value from the foreign data source.
 *   It should be cheap to call and should not have side effects.
 *   Ideally it performs some caching on its own, but this is not strictly needed.
 * - The `subscribe` function should implement whatever logic is necessary to listen for changes.
 *   It receives a callback function that should be called whenever the value changes.
 *   `subscribe` should return a cleanup function to unsubscribe - it will be called automatically when appropriate.
 * - When the signal is not watched in some way, accesses to the `getter` are not cached.
 * - When the signal is being watched (e.g. by an effect), the signal will automatically subscribe to the foreign data source
 *   and cache the current value until it is informed about a change.
 *
 * Example:
 *
 * ```ts
 * import { synchronized, watchValue } from "@conterra/reactivity-core";
 *
 * const abortController = new AbortController();
 * const abortSignal = abortController.signal;
 * const aborted = synchronized(
 *
 *     // getter which returns the current value from the foreign source
 *     () => abortSignal.aborted,
 *
 *     // Subscribe function: Automatically called when the signal is used
 *     (callback) => {
 *         // Subscribe to changes in the AbortSignal
 *         abortSignal.addEventListener("abort", callback);
 *
 *         // Cleanup function is called automatically when the signal is no longer used
 *         return () => {
 *             // unsubscribe from changes in the AbortSignal
 *             abortSignal.removeEventListener("abort", callback);
 *         };
 *     }
 * );
 *
 * watchValue(
 *     () => aborted.value,
 *     (aborted) => {
 *         console.log("Aborted:", aborted);
 *     },
 *     {
 *         immediate: true
 *     }
 * );
 *
 * setTimeout(() => {
 *     abortController.abort();
 * }, 1000);
 *
 * // Prints:
 * // Aborted: false
 * // Aborted: true
 * ```
 *
 * @group Primitives
 */
export function synchronized<T>(getter: () => T, subscribe: SubscribeFunc): ReadonlyReactive<T> {
    const impl = new SynchronizedReactiveImpl(getter, subscribe); // TODO equals
    return impl as AddBrand<typeof impl>;
}

/**
 * Creates a new linked signal derived from the given source.
 *
 * The linked signal's value defaults to the source's value.
 * While the source remains the same, the linked signal can be changed freely.
 * If the source changes, the linked signal will be reset.
 *
 * @experimental
 * @group Primitives
 */
export function linked<T>(source: ReactiveGetter<T>, options?: ReactiveOptions<T>): Reactive<T>;

/**
 * Creates a new linked signal derived from the given source.
 *
 * While the source remains the same, the linked signal can be changed freely.
 * If the source changes, the linked signal will be reset.
 *
 * The `reset` function determines the new value during initialization or after the source has changed.
 *
 * @experimental
 * @group Primitives
 */
export function linked<T, S>(
    source: ReactiveGetter<S>,
    reset: (source: NoInfer<S>, previousValue?: NoInfer<T>) => T,
    options?: ReactiveOptions<T>
): Reactive<T>;

export function linked<T, S = T>(
    source: ReactiveGetter<S>,
    resetOrOptions?: ((source: S, previousValue?: T) => T) | ReactiveOptions<T>,
    optionsArg?: ReactiveOptions<T>
): Reactive<T> {
    let reset;
    let options;
    if (typeof resetOrOptions === "function") {
        reset = resetOrOptions;
        options = optionsArg;
    } else {
        reset = (source: S) => source as unknown as T;
        options = resetOrOptions;
    }

    const impl = new LinkedReactiveImpl(source, reset, options?.equal);
    return impl as AddWritableBrand<typeof impl>;
}

/**
 * Executes a set of reactive updates implemented in `callback`.
 * Effects are delayed until the batch has completed.
 *
 * It is good practice to group multiple updates into a batch to prevent
 * an excessive number of effects from triggering.
 *
 * `batch` returns the value of `callback()`.
 *
 * Example:
 *
 * ```ts
 * const r1 = reactive(1);
 * const r2 = reactive(2);
 *
 * // Log r1 and r2 every time they change.
 * syncEffect(() => {
 *     console.log(r1.value, r2.value);
 * });
 *
 * // Trigger multiple updates at once.
 * batch(() => {
 *     // these two updates don't trigger the effect yet
 *     r1.value = 2;
 *     r2.value = 3;
 * });
 * // now the effect runs once
 * ```
 *
 * @group Primitives
 */
export function batch<T>(callback: () => T): T {
    return rawBatch(callback);
}

/**
 * Executes non-reactive code.
 *
 * Accesses on reactive objects made inside `callback` will _not_ be tracked,
 * even if they occur inside a computed object or in an effect.
 *
 * `untracked` returns the value of `callback()`.
 *
 * @group Primitives
 */
export function untracked<T>(callback: () => T): T {
    return rawUntracked(callback);
}

/**
 * Returns the current `.value` of the given signal, or the input argument itself
 * if it is not reactive.
 *
 * The access to `.value` is tracked.
 *
 * @group Primitives
 */
export function getValue<T>(maybeReactive: ReadonlyReactive<T> | T): T {
    if (!isReadonlyReactive(maybeReactive)) {
        return maybeReactive;
    }
    return maybeReactive.value;
}

/**
 * Returns the current `.value` of the given signal, or the input argument itself
 * if it is not reactive.
 *
 * The access to `.value` is _not_ tracked.
 *
 * @group Primitives
 */
export function peekValue<T>(maybeReactive: ReadonlyReactive<T> | T): T {
    if (!isReadonlyReactive(maybeReactive)) {
        return maybeReactive;
    }
    return maybeReactive.peek();
}

/**
 * Returns `true` if `maybeReactive` is any kind of signal.
 *
 * @group Primitives
 */
export function isReadonlyReactive<T>(
    maybeReactive: ReadonlyReactive<T> | T
): maybeReactive is ReadonlyReactive<T> {
    return maybeReactive instanceof ReactiveImpl;
}

/**
 * Returns `true` if `maybeReactive` is any kind of *writable* signal.
 *
 * @group Primitives
 */
export function isReactive<T>(maybeReactive: Reactive<T> | T): maybeReactive is Reactive<T> {
    return maybeReactive instanceof WritableReactiveImpl;
}

abstract class ReactiveImpl<T>
    implements RemoveBrand<ReadonlyReactive<T> & Reactive<T> & ExternalReactive<T>>
{
    abstract get value(): T;
    abstract set value(_value: T);

    trigger() {
        throw new Error("Cannot trigger this reactive object.");
    }

    peek() {
        return untracked(() => this.value);
    }

    toJSON() {
        return this.value;
    }

    toString(): string {
        return `Reactive[value=${getFormattedValue(this.value)}]`;
    }
}

const REACTIVE_SIGNAL = Symbol("signal");
const CUSTOM_EQUALS = Symbol("equals");

/** An object that wraps a raw signal from the underlying signals-core library. */
class WrappingReactiveImpl<T> extends ReactiveImpl<T> {
    private [REACTIVE_SIGNAL]: RawSignal<T>;

    /**
     * @param signal The signal that is being _read_ from.
     */
    constructor(signal: RawSignal<T>) {
        super();
        this[REACTIVE_SIGNAL] = signal;
    }

    get value(): T {
        return this[REACTIVE_SIGNAL].value;
    }

    set value(_value: T) {
        throw new Error("Cannot update a readonly reactive object.");
    }
}

class ComputedReactiveImpl<T> extends WrappingReactiveImpl<T> {
    [CUSTOM_EQUALS]: EqualsFunc<T> | undefined;

    constructor(compute: () => T, equals: EqualsFunc<T> | undefined) {
        const rawSignal = rawComputed(equals ? computeWithEquals(compute, equals) : compute);
        super(rawSignal);
        this[CUSTOM_EQUALS] = equals;
    }
}

class WritableReactiveImpl<T> extends WrappingReactiveImpl<T> {
    [CUSTOM_EQUALS]: EqualsFunc<T>;

    constructor(initialValue: T, equals: EqualsFunc<T> | undefined) {
        super(rawSignal(initialValue));
        this[CUSTOM_EQUALS] = equals ?? defaultEquals;
    }

    get value() {
        return super.value;
    }

    set value(value: T) {
        const isEqual = rawUntracked(() => this[CUSTOM_EQUALS]?.(this.value, value));
        if (isEqual) {
            return;
        }
        this[REACTIVE_SIGNAL].value = value;
    }
}

const INVALIDATE_SIGNAL = Symbol("invalidate_signal");
const IS_WATCHED = Symbol("is_watched");
const HAS_SCHEDULED_INVALIDATE = Symbol("has_scheduled_invalidate");

/**
 * Custom signal implementation for "synchronized" values, i.e. values from a foreign source.
 * The signal automatically subscribes to the foreign source once it becomes watched (it also unsubscribes automatically).
 *
 * Although the implementation is based on a `computed` signal, there may not be any caching involved, depending on the state of the signal.
 *
 * 1. The signal is not watched: the "computed" is always out of date.
 *    This is achieved by immediately invalidating the signal itself from within its own body.
 *    To the raw signal, this looks like a dependency cycle (which is allowed in this case).
 * 2. The signal is watched: the value is cached until an update event is received; at which point the foreign data source is accessed again.
 *
 * See also https://github.com/tc39/proposal-signals/issues/237
 */
class SynchronizedReactiveImpl<T> extends WrappingReactiveImpl<T> {
    [INVALIDATE_SIGNAL] = rawSignal(false);
    [IS_WATCHED] = false;
    [HAS_SCHEDULED_INVALIDATE] = false;

    constructor(getter: () => T, subscribe: SubscribeFunc) {
        const rawSignal = rawComputedWithSubscriptionHook(
            () => {
                this[INVALIDATE_SIGNAL].value;
                if (!this[IS_WATCHED]) {
                    this.#invalidate();
                }
                return rawUntracked(() => getter());
            },
            () => {
                this[IS_WATCHED] = true;
                const unsubscribe = subscribe(this.#invalidate);
                return () => {
                    this[IS_WATCHED] = false;
                    unsubscribe();
                    this.#invalidate();
                };
            }
        );
        super(rawSignal);
    }

    #invalidate = () => {
        this[INVALIDATE_SIGNAL].value = !this[INVALIDATE_SIGNAL].peek();
    };
}

const READ_SIGNAL = Symbol("read_source");
const WRITE_SIGNAL = Symbol("write_state");
const PREV_SOURCE = Symbol("prev_source");
const IS_INIT = Symbol("has_source");

class LinkedReactiveImpl<S, T> extends ReactiveImpl<T> {
    // A writable signal that is used to _write_ the current value.
    // In addition to being writable as long as the source remains the same,
    // it is also reset to a new value when the source changes.
    //
    // Resetting happens in the computed signal, as a side effect, which is seems to be working fine?
    [WRITE_SIGNAL]: Reactive<T | undefined>;

    // A computed signal that is used to _read_ the current value.
    // It automatically resets itself if the source changes.
    [READ_SIGNAL]: ReadonlyReactive<T>;

    // Old source (if any), not reactive.
    [PREV_SOURCE]: S | undefined;

    // false after initial source computation, to discriminate between undefined and initial state.
    [IS_INIT] = true;

    constructor(
        source: () => S,
        reset: (source: S, prev: T | undefined) => T,
        equals: EqualsFunc<T> | undefined
    ) {
        super();

        let writeEquals;
        if (equals) {
            writeEquals = (a: T | undefined, b: T | undefined) => {
                if (this[IS_INIT]) {
                    // The initial value is undefined, which does not match with the equals signature.
                    return false;
                }
                return equals(a as T, b as T);
            };
        }
        this[WRITE_SIGNAL] = reactive(undefined, { equal: writeEquals });

        this[READ_SIGNAL] = computed(() => {
            const currentSource = source();
            if (this[IS_INIT] || currentSource !== this[PREV_SOURCE]) {
                this[PREV_SOURCE] = currentSource;
                this[WRITE_SIGNAL].value = reset(currentSource, this[WRITE_SIGNAL].peek());
                this[IS_INIT] = false;
            }
            return this[WRITE_SIGNAL].value as T;
        });
    }

    get value(): T {
        return this[READ_SIGNAL].value;
    }

    set value(newValue: T) {
        // Ensure source updating happens before, if necessary.
        // This works around the fact that our reactions to source changes are lazy.
        // By computing the value before writing it, we ensure that the latest write wins,
        // since any invalidation happens in peek() and thus before the `.value` assignment.
        //
        // As a side effect, this also ensures that the current value is always initialized --
        // thus equality does not the `| undefined` case.
        this.peek();
        this[WRITE_SIGNAL].value = newValue;
    }
}

function computeWithEquals<T>(compute: () => T, equals: EqualsFunc<T>) {
    let firstExecution = true;
    let currentValue: T;

    return function computeWithEquals() {
        const newValue = compute();
        return rawUntracked(() => {
            if (firstExecution || !equals(currentValue, newValue)) {
                currentValue = newValue;
                firstExecution = false;
            }
            return currentValue;
        });
    };
}

function getFormattedValue(rawValue: unknown) {
    if (typeof rawValue === "string") {
        return JSON.stringify(rawValue); // escape
    }
    return String(rawValue);
}
