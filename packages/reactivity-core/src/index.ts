// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
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
 *
 * @groupDescription Equality
 *
 * Functions to test for object equality, for example in the `equal` option of `watch()` or `computed()`.
 */

export {
    type ReadonlyReactive,
    type Reactive,
    type ExternalReactive,
    type ReactiveGetter,
    type EqualsFunc,
    type ReactiveOptions,
    type CleanupFunc,
    type EffectOptions,
    type EffectCallback,
    type EffectContext,
    type WatchCallback,
    type WatchImmediateCallback,
    type WatchContext,
    type WatchOptions,
    type DispatchType,
    type CleanupHandle,
    type SubscribeFunc
} from "./types";
export {
    reactive,
    computed,
    linked,
    external,
    synchronized,
    batch,
    untracked,
    getValue,
    peekValue,
    isReadonlyReactive,
    isReactive
} from "./signals";
export { syncWatch, syncWatchValue, watch, watchValue } from "./watch";
export { effect, syncEffect } from "./effect";
export { dispatchAsyncCallback, nextTick } from "./utils/dispatch";
export { reportCallbackError } from "./utils/reportCallbackError";
export { deepEqual, shallowEqual, defaultEqual, shallowArrayEqual } from "./utils/equality";
export * from "./collections";
export * from "./struct";
