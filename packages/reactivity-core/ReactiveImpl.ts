import {
    Signal,
    batch as rawBatch,
    computed as rawComputed,
    signal as rawSignal,
    untracked as rawUntracked
} from "@preact/signals-core";
import {
    AddBrand,
    AddWritableBrand,
    ExternalReactive,
    ReadonlyReactive,
    RemoveBrand,
    Reactive
} from "./Reactive";

/**
 * A function that should return `true` if `a` and `b` are considered equal, `false` otherwise.
 * 
 * @group Primitives
 */
export type EqualsFunc<T> = (a: T, b: T) => boolean;

/**
 * Options that can be passed when creating a new signal.
 * 
 * @group Primitives
 */
export interface ReactiveOptions<T> {
    /**
     * Should return `true` if the two values are considered equal.
     *
     * Reactive assignments using a new value equal to the current value
     * will be ignored.
     * By default, `===` is used to compare values.
     */
    equal?: EqualsFunc<T>;
}

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
 * NOTE: the `compute` callback should not have any side effects as it may be called any number of times
 * if its dependencies change.
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
export function computed<T>(compute: () => T, options?: ReactiveOptions<T>): ReadonlyReactive<T> {
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
    (externalReactive as RemoveBrand<typeof externalReactive> as ReactiveImpl<T>).trigger = invalidate;
    return externalReactive as ExternalReactive<T>;
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
export function getValue<T>(maybeReactive: ReadonlyReactive<T> | T) {
    if (!isReactive(maybeReactive)) {
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
export function peekValue<T>(maybeReactive: ReadonlyReactive<T> | T) {
    if (!isReactive(maybeReactive)) {
        return maybeReactive;
    }
    return maybeReactive.peek();
}

const REACTIVE_SIGNAL = Symbol("signal");
const CUSTOM_EQUALS = Symbol("equals");

abstract class ReactiveImpl<T>
    implements RemoveBrand<ReadonlyReactive<T> & Reactive<T> & ExternalReactive<T>>
{
    private [REACTIVE_SIGNAL]: Signal<T>;

    constructor(signal: Signal<T>) {
        this[REACTIVE_SIGNAL] = signal;
    }

    get value(): T {
        return this[REACTIVE_SIGNAL].value;
    }

    set value(_value: T) {
        throw new Error("Cannot update a readonly reactive object.");
    }

    trigger() {
        throw new Error("Cannot trigger this reactive object.");
    }

    peek() {
        return this[REACTIVE_SIGNAL].peek();
    }

    toJSON() {
        return this.value;
    }

    toString(): string {
        return `Reactive[value=${getFormattedValue(this[REACTIVE_SIGNAL].value)}]`;
    }
}

class ComputedReactiveImpl<T> extends ReactiveImpl<T> {
    [CUSTOM_EQUALS]: EqualsFunc<T> | undefined;

    constructor(compute: () => T, equals: EqualsFunc<T> | undefined) {
        const rawSignal = rawComputed(equals ? computeWithEquals(compute, equals) : compute);
        super(rawSignal);
        this[CUSTOM_EQUALS] = equals;
    }
}

class WritableReactiveImpl<T> extends ReactiveImpl<T> {
    [CUSTOM_EQUALS]: EqualsFunc<T> | undefined;

    constructor(initialValue: T, equals: EqualsFunc<T> | undefined) {
        super(rawSignal(initialValue));
        this[CUSTOM_EQUALS] = equals;
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

function isReactive<T>(value: RemoveBrand<ReadonlyReactive<T>> | T): value is ReactiveImpl<T> {
    return value instanceof ReactiveImpl;
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
