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
    type CleanupFunc,
    type EffectCallback,
    type WatchCallback,
    type WatchOptions,
    type CleanupHandle
} from "./types";
export {
    type EqualsFunc,
    type ReactiveOptions,
    reactive,
    computed,
    external,
    batch,
    untracked,
    getValue,
    peekValue,
    isReadonlyReactive,
    isReactive
} from "./ReactiveImpl";
export { syncEffect, syncEffectOnce, syncWatch } from "./sync";
export { effect, watch } from "./async";
export * from "./collections";
export * from "./struct";
