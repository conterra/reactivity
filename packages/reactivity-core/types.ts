declare const IS_REACTIVE: unique symbol;
declare const IS_WRITABLE_REACTIVE: unique symbol;

/** @internal */
export type RemoveBrand<T> = Omit<T, typeof IS_REACTIVE | typeof IS_WRITABLE_REACTIVE>;

/** @internal */
export type AddBrand<T> = T & { [IS_REACTIVE]: true };

/** @internal */
export type AddWritableBrand<T> = AddBrand<T> & { [IS_WRITABLE_REACTIVE]: true };

/**
 * A signal that holds a reactive value.
 *
 * When the value changes, all users of that value (computed signals, effects, watchers)
 * are notified automatically.
 *
 * @group Primitives
 */
export interface ReadonlyReactive<T> {
    /**
     * Compile time symbol to identify reactive signals.
     * @internal
     */
    [IS_REACTIVE]: true;

    /**
     * Accesses the current value stored in this signal.
     *
     * This access is tracked: users (computed signals, effects, etc.) will be registered as a user of this value
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
 * A signal that holds a mutable value.
 *
 * The value stored in this object can be changed through assignment,
 * and all its users will be notified automatically.
 *
 * @group Primitives
 */
export interface Reactive<T> extends ReadonlyReactive<T> {
    /**
     * Compile time symbol to identify writable reactive objects.
     * @internal
     */
    [IS_WRITABLE_REACTIVE]: true;

    /**
     * Reads or writes the current value in this reactive object.
     *
     * @see {@link ReadonlyReactive.value}
     */
    value: T;
}

/**
 * A signal that holds a value from an external source.
 *
 * Instances of this type are used to integrate "foreign" state into the reactivity system.
 *
 * @group Primitives
 */
export interface ExternalReactive<T> extends ReadonlyReactive<T> {
    /**
     * Notifies the reactivity system that the external value has changed.
     *
     * The users of this value will be notified automatically; if there are any users
     * then the value will be re-computed from its external source using the original callback.
     *
     * > NOTE: This function is bound to its instance. You can use it directly as an event handler callback
     * > without safeguarding `this`.
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

/**
 * A cleanup function returned from an effect or a watch callback.
 *
 * This function will be invoked before the effect or watch callback is triggered again,
 * or when it is being disposed.
 *
 * @group Watching
 */
export type CleanupFunc = () => void;

/**
 * The body of an effect.
 *
 * Instructions in this function are tracked: when any of its reactive
 * dependencies change, the effect will be triggered again.
 * 
 * An effect may return a cleanup function that will be executed
 * before the effect is triggered again, or when the effect is being destroyed.
 *
 * @group Watching
 */
export type EffectCallback = () => void | CleanupFunc;

/**
 * A watch callback triggered if observed values change.
 * 
 * The body of a watch statement is _not_ tracked.
 * 
 * A watch callback may return a cleanup function that will be executed
 * before the callback is triggered again, or when the watch is being destroyed.
 *
 * @group Watching
 */
export type WatchCallback = () => void | CleanupFunc;

/**
 * Options that can be passed to {@link syncWatch}.
 *
 * @group Watching
 */
export interface WatchOptions {
    /**
     * Whether to call the watch callback once during setup.
     *
     * If this is `false`, the watch callback will only be invoked
     * after at least a single value changed.
     */
    immediate?: boolean;
}
