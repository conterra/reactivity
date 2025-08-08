// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { effect as rawEffect } from "@preact/signals-core";
import { CleanupHandle, EffectCallback, EffectContext, EffectOptions } from "../types";
import { AsyncEffect } from "./AsyncEffect";

/**
 * Runs the callback function and tracks its reactive dependencies.
 * Whenever one of those dependencies changes, the callback will be executed again.
 *
 * Example:
 *
 * ```js
 * const count = reactive(0);
 * effect(() => {
 *     console.log(count.value);
 * });
 * // Effect runs immediately, prints "0"
 *
 * // Triggers re-execution of the effect (with a minimal delay), prints "1"
 * count.value = 1;
 * ```
 *
 * `effect` returns a handle that allows you to unsubscribe from changes.
 * That handle's `destroy()` function should be called in order to clean up the effect when you no longer need it,
 * otherwise the effect will keep running forever:
 *
 * ```js
 * const handle = effect(() => {
 *     // ...
 * });
 * // later:
 * handle.destroy();
 * ```
 *
 * You can also return a _function_ from your effect callback.
 * It will be called automatically when either the effect will be re-executed or when the effect is being destroyed.
 * This can be very convenient to revert (or clean up) the side effects made by an effect:
 *
 * ```js
 * effect(() => {
 *     const job = startAJob();
 *     return () => job.stop();
 * });
 * ```
 *
 * > NOTE: This function will slightly defer re-executions of the given `callback`.
 * > In other words, the re-execution does not happen _immediately_ after a reactive dependency changed.
 * > This is done to avoid redundant executions as a result of many fine-grained changes.
 * >
 * > If you need more control, take a look at {@link syncEffect}.
 *
 * @group Watching
 */
export function effect(callback: EffectCallback, options?: EffectOptions): CleanupHandle {
    const dispatch = options?.dispatch ?? "async";
    switch (dispatch) {
        case "async": {
            const effect = new AsyncEffect(callback);
            return {
                destroy: effect.destroy.bind(effect)
            };
        }
        case "sync": {
            let context: EffectContext;
            const cleanup = rawEffect(function effectCallback() {
                context ??= {
                    destroy: () => {
                        this.dispose();
                    }
                };
                return callback(context);
            });
            return {
                destroy: cleanup
            };
        }
        default:
            throw new Error(`Unexpected dispatch type: '${dispatch}'`);
    }
}

const SYNC_DISPATCH = { dispatch: "sync" } as const;

/**
 * Runs the callback function and tracks its reactive dependencies.
 * Whenever one of those dependencies changes, the callback will be executed again.
 *
 * This function is the synchronous variant of {@link effect}.
 * It will re-execute after every fine grained change, even if they occur in immediate succession.
 * `syncEffect` should therefore be considered a low level primitive, for most use cases {@link effect} should be the right tool instead.
 *
 * Example:
 *
 * ```js
 * const count = reactive(0);
 * syncEffect(() => {
 *     console.log(count.value);
 * });
 * // Effect runs immediately, prints "0"
 *
 * count.value = 1; // Effect runs again, prints "1"
 * count.value = 2; // Effect runs again, prints "2"
 * ```
 *
 * `syncEffect` returns a handle that allows you to unsubscribe from changes.
 * That handle's `destroy()` function should be called in order to clean up the effect when you no longer need it,
 * otherwise the effect will keep running forever:
 *
 * ```js
 * const handle = syncEffect(() => {
 *     // ...
 * });
 * // later:
 * handle.destroy();
 * ```
 *
 * @deprecated Use {@link effect} with option `dispatch: "sync"` instead.
 *
 * @group Watching
 */
export function syncEffect(callback: EffectCallback): CleanupHandle {
    return effect(callback, SYNC_DISPATCH);
}
