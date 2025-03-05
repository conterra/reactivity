/**
 * A framework agnostic library for building reactive applications.
 *
 * @module
 *
 * @groupDescription Primitives
 *
 * Primitive building blocks for reactive code.
 *
 * @groupDescription Watching
 *
 * Utilities to run code when reactive values change.
 *
 * @groupDescription Collections
 *
 * Reactive collections to simplify working with complex data structures.
 *
 * @groupDescription Struct
 *
 * Utilities to create reactive data structures/objects.
 */

export {
    type ReadonlyReactive,
    type Reactive,
    type ExternalReactive,
    type ReactiveGetter,
    type EqualsFunc,
    type ReactiveOptions,
    type CleanupFunc,
    type EffectCallback,
    type EffectContext,
    type WatchCallback,
    type WatchImmediateCallback,
    type WatchContext,
    type WatchOptions,
    type CleanupHandle,
    type SubscribeFunc
} from "./types";
export {
    reactive,
    computed,
    external,
    synchronized,
    batch,
    untracked,
    getValue,
    peekValue,
    isReadonlyReactive,
    isReactive
} from "./signals";
export { syncWatch, syncWatchValue, watch, watchValue } from "./watch/watch";
export { effect } from "./effect/asyncEffect";
export { syncEffect } from "./effect/syncEffect";
export { dispatchAsyncCallback, nextTick } from "./utils/dispatch";
export { reportCallbackError } from "./utils/reportCallbackError";
export * from "./collections";
export * from "./struct";
