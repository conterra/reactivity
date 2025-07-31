// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { effect as rawEffect } from "@preact/signals-core";
import { CleanupHandle, EffectCallback, EffectContext } from "../types";

// Import required for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { effect } from "./asyncEffect";

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
 * @group Watching
 */
export function syncEffect(callback: EffectCallback): CleanupHandle {
    let context: EffectContext;
    const cleanup = rawEffect(function effectBody() {
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
