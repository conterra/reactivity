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
 */

export {
    type ExternalReactive,
    type Reactive,
    type WritableReactive,
    type CleanupHandle
} from "./Reactive";
export {
    type EqualsFunc,
    type ReactiveOptions,
    reactive,
    computed,
    external,
    batch,
    untracked,
    getValue,
    peekValue
} from "./ReactiveImpl";
export {
    type EffectCleanupFn,
    type EffectFunc,
    type WatchOptions,
    syncEffect,
    syncEffectOnce,
    syncWatch
} from "./sync";
export { effect, watch } from "./async";
export * from "./collections";
