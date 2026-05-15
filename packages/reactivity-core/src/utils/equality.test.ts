// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { defaultEquals, shallowEqual } from "./equality";

describe("defaultEquals", () => {
    it("returns true for identical values", () => {
        expect(defaultEquals(1, 1)).toBe(true);
        expect(defaultEquals("a", "a")).toBe(true);
        expect(defaultEquals(null, null)).toBe(true);
        expect(defaultEquals(undefined, undefined)).toBe(true);
    });

    it("returns false for different values", () => {
        expect(defaultEquals(1, 2)).toBe(false);
        expect(defaultEquals("a", "b")).toBe(false);
        expect(defaultEquals(null, undefined)).toBe(false);
    });

    it("treats NaN as equal to NaN", () => {
        expect(defaultEquals(NaN, NaN)).toBe(true);
    });

    it("distinguishes +0 and -0", () => {
        expect(defaultEquals(+0, -0)).toBe(false);
    });

    it("returns false for structurally equal but referentially different objects", () => {
        const a = { x: 1 };
        const b = { x: 1 };
        expect(defaultEquals(a, b)).toBe(false);
    });

    it("returns true for the same object reference", () => {
        const obj = { x: 1 };
        expect(defaultEquals(obj, obj)).toBe(true);
    });
});

describe("shallowEqual", () => {
    it("returns true for the same array reference", () => {
        const arr = [1, 2, 3];
        expect(shallowEqual(arr, arr)).toBe(true);
    });

    it("returns true for arrays with identical elements", () => {
        expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
        expect(shallowEqual(["a", "b"], ["a", "b"])).toBe(true);
    });

    it("returns false for arrays of different lengths", () => {
        expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
        expect(shallowEqual([1, 2, 3], [1, 2])).toBe(false);
    });

    it("returns false for arrays with different elements", () => {
        expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it("returns true for empty arrays", () => {
        expect(shallowEqual([], [])).toBe(true);
    });

    it("uses Object.is semantics for element comparison", () => {
        expect(shallowEqual([NaN], [NaN])).toBe(true);
        expect(shallowEqual([+0], [-0])).toBe(false);
    });
});
