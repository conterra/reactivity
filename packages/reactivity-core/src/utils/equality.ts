// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import {
    sameValueZeroEqual,
    shallowEqual as shallowEqualImpl,
    deepEqual as deepEqualImpl
} from "fast-equals";

/**
 * Returns `true` if `a` and `b` refer to the same value, `false` otherwise.
 *
 * This equality function is the default function used by `watchValue()`.
 *
 * @group Equality
 */
export function defaultEqual(a: unknown, b: unknown): boolean {
    return sameValueZeroEqual(a, b);
}

/**
 * Returns `true` if the arrays `a` and `b` have the same content, `false` otherwise.
 *
 * This equality function is the default function used by `watch()`.
 *
 * @group Equality
 */
export function shallowArrayEqual(a: unknown[], b: unknown[]): boolean {
    if (a === b) {
        return true;
    }
    return a.length === b.length && a.every((v, i) => defaultEqual(v, b[i]));
}

/**
 * Returns `true` if `a` and `b` have the same contents, `false` otherwise.
 *
 * This algorithm will compare the objects or their immediate children (direct properties, array items),
 * but will *not* perform deep comparisons.
 *
 * This function uses `fast-equal`'s [shallowEqual implementation](https://github.com/planttheidea/fast-equals/blob/master/README.md#shallowequal).
 *
 * @group Equality
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
    return shallowEqualImpl(a, b);
}

/**
 * Returns `true` if `a` and `b` represent the same value, `false` otherwise.
 *
 * This algorithm performs a deep comparison between the two objects and all their children.
 * It does *not* support cyclic objects references.
 *
 * This function uses `fast-equal`'s [deepEqual implementation](https://github.com/planttheidea/fast-equals/blob/master/README.md#deepequal).
 *
 * @group Equality
 */
export function deepEqual(a: unknown, b: unknown): boolean {
    return deepEqualImpl(a, b);
}
