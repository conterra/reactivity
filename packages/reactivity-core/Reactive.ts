declare const IS_REACTIVE: unique symbol;
declare const IS_WRITABLE_REACTIVE: unique symbol;

/** @internal */
export type RemoveBrand<T> = Omit<T, typeof IS_REACTIVE | typeof IS_WRITABLE_REACTIVE>;

/** @internal */
export type AddBrand<T> = T & { [IS_REACTIVE]: true };

/** @internal */
export type AddWritableBrand<T> = AddBrand<T> & { [IS_WRITABLE_REACTIVE]: true };

/**
 * Holds a value.
 *
 * When a reactive value changes, all users of that value (computed reactive values, effects, watchers)
 * are notified automatically.
 * 
 * @group Primitives
 */
export interface Reactive<T> {
    /**
     * Compile time symbol to identify reactive objects.
     * @internal
     */
    [IS_REACTIVE]: true;

    /**
     * Accesses the current value stored in this reactive object.
     *
     * This access is tracked: users (computed reactives, effects, etc.) will be registered as a user of this value
     * and will be notified when it changes.
     */
    readonly value: T;

    /**
     * Accesses the current value _without_ being considered a user of this value.
     *
     * Use this method if you do _not_ wish to be notified about changes.
     */
    peek(): T;

    /** 
     * Same as `.value`.
     * 
     * For compatibility with builtin JS constructs.
     **/
    toJSON(): T;

    /**
     * Formats `.value` as a string.
     * 
     * For compatibility with builtin JS constructs.
     **/
    toString(): string;
}

/**
 * Holds a mutable value.
 *
 * The value stored in this object can be changed through assignment,
 * and all its users will be notified automatically.
 * 
 * @group Primitives
 */
export interface WritableReactive<T> extends Reactive<T> {
    /**
     * Compile time symbol to identify writable reactive objects.
     * @internal
     */
    [IS_WRITABLE_REACTIVE]: true;

    /**
     * Reads or writes the current value in this reactive object.
     *
     * @see {@link Reactive.value}
     */
    value: T;
}

/**
 * Holds a value from an external source.
 *
 * Instances of this type are used to integrate "foreign" state into the reactivity system.
 * 
 * @group Primitives
 */
export interface ExternalReactive<T> extends Reactive<T> {
    /**
     * Notifies the reactivity system that the external value has changed.
     *
     * The users of this value will be notified automatically; if there are any users
     * then the value will be re-computed from its external source using the original callback.
     *
     * NOTE: This function is bound to its instance. You can use it directly as an event handler callback.
     */
    trigger(): void;
}

/**
 * A handle returned by various functions to dispose of a resource,
 * such as a watcher or an effect.
 * 
 * @group Watching
 */
export interface CleanupHandle {
    /**
     * Performs the cleanup action associated with the resource.
     */
    destroy(): void;
}
