// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from "vitest";
import { reactiveArray } from "./array";

describe("basic usage", () => {
    it("can be constructed with initial data", () => {
        const array = reactiveArray([1, 2, 3]);
        expect(array.length).toBe(3);
        expect(array.getItems()).toEqual([1, 2, 3]);
    });

    it("returns an item from at()", () => {
        const array = reactiveArray([1, 2, 3]);
        expect(array.at(0)).toBe(1);
        expect(array.at(1)).toBe(2);
        expect(array.at(-1)).toBe(3);
    });

    it("returns an item from get()", () => {
        const array = reactiveArray([1, 2, 3]);
        expect(array.get(0)).toBe(1);
        expect(array.get(1)).toBe(2);
        expect(array.get(-1)).toBe(undefined);
    });

    it("changes an item via set()", () => {
        const array = reactiveArray([1, 2, 3]);
        array.set(2, 4);
        expect(array.get(2)).toBe(4);
    });

    it("throws an error when attempting to set an out of bounds item", () => {
        const array = reactiveArray([1, 2, 3]);
        expect(() => array.set(-1, 4)).toThrowErrorMatchingInlineSnapshot(
            `[Error: index out of bounds]`
        );
        expect(() => array.set(3, 4)).toThrowErrorMatchingInlineSnapshot(
            `[Error: index out of bounds]`
        );
    });

    it("returns sub-arrays from slice()", () => {
        const array = reactiveArray([1, 2, 3]);
        const array1 = array.slice(1);
        expect(array1.getItems()).toEqual([2, 3]);

        const array2 = array.slice(0, 2);
        expect(array2.getItems()).toEqual([1, 2]);

        const array3 = array.slice(3);
        expect(array3.getItems()).toEqual([]);
    });

    it("supports concatenation with values and arrays", () => {
        const array = reactiveArray([1]).concat(2, [3, 4], reactiveArray([5]));
        expect(array.getItems()).toEqual([1, 2, 3, 4, 5]);
    });

    it("supports the includes() method", () => {
        const array = reactiveArray([1]);
        expect(array.includes(1)).toBe(true);
        expect(array.includes(2)).toBe(false);
    });

    it("finds the first index of an item via indexOf()", () => {
        const array = reactiveArray([1, 2, 2]);
        expect(array.indexOf(2)).toBe(1);
        expect(array.indexOf(3)).toBe(-1);
    });

    it("finds the last index of an item via lastIndexOf()", () => {
        const array = reactiveArray([1, 2, 2]);
        expect(array.lastIndexOf(2)).toBe(2);
        expect(array.lastIndexOf(3)).toBe(-1);
    });

    it("finds an item via find()", () => {
        const item1 = {
            a: 1
        };
        const item2 = {
            a: 1
        };
        const array = reactiveArray<{ a: number }>([{ a: 0 }, item1, item2]);
        expect(array.find((v) => v.a === 1)).toBe(item1); // test identity
        expect(array.find((v) => v.a === 2)).toBe(undefined);
    });

    it("finds the last item via findLast()", () => {
        const item1 = {
            a: 1
        };
        const item2 = {
            a: 1
        };
        const array = reactiveArray<{ a: number }>([{ a: 0 }, item1, item2]);
        expect(array.findLast((v) => v.a === 1)).toBe(item2); // test identity
        expect(array.findLast((v) => v.a === 2)).toBe(undefined);
    });

    it("finds an item's index via findIndex()", () => {
        const item1 = {
            a: 1
        };
        const item2 = {
            a: 1
        };
        const array = reactiveArray<{ a: number }>([{ a: 0 }, item1, item2]);
        expect(array.findIndex((v) => v.a === 1)).toBe(1);
        expect(array.findIndex((v) => v.a === 2)).toBe(-1);
    });

    it("finds an item's index via findLastIndex()", () => {
        const item1 = {
            a: 1
        };
        const item2 = {
            a: 1
        };
        const array = reactiveArray<{ a: number }>([{ a: 0 }, item1, item2]);
        expect(array.findLastIndex((v) => v.a === 1)).toBe(2);
        expect(array.findLastIndex((v) => v.a === 2)).toBe(-1);
    });

    it("supports the some() operation", () => {
        const array = reactiveArray([1, 2, 3]);
        expect(array.some((v) => v === 3)).toBe(true);
        expect(array.some((v) => v === 4)).toBe(false);

        // empty -> false
        expect(reactiveArray().some(() => true)).toBe(false);
    });

    it("supports the every() operation", () => {
        const array = reactiveArray([1, 2, 3]);
        expect(array.every((v) => v <= 3)).toBe(true);
        expect(array.every((v) => v < 3)).toBe(false);

        // empty -> false
        expect(reactiveArray().every(() => false)).toBe(true);
    });

    it("invokes the callback for each item in the array", () => {
        const array = reactiveArray(["a", "b", "c"]);
        const cb = vi.fn();
        array.forEach(cb);
        expect(cb.mock.calls).toMatchInlineSnapshot(`
          [
            [
              "a",
              0,
            ],
            [
              "b",
              1,
            ],
            [
              "c",
              2,
            ],
          ]
        `);
    });

    it("filters based on a predicate", () => {
        const array = reactiveArray(["a", "b", "c"]);
        const filtered = array.filter((item) => item === "b");
        expect(filtered.getItems()).toEqual(["b"]);
    });

    it("returns a mapped array from map()", () => {
        const array = reactiveArray(["a", "b", "c"]);
        const mapped = array.map((item) => item.toUpperCase());
        expect(mapped.getItems()).toEqual(["A", "B", "C"]);
    });

    it("supports the flatMap() operation", () => {
        const array = reactiveArray(["a", "b", "c"]);
        const mapped = array.flatMap((item) => (item === "b" ? ["b", "b"] : item.toUpperCase()));
        expect(mapped.getItems()).toEqual(["A", "b", "b", "C"]);
    });

    it("reduce() reduces from left to right", () => {
        const array = reactiveArray([1, 2, 3]);
        const numbers: number[] = [];
        const result = array.reduce((acc, current) => {
            numbers.push(current);
            return acc + current;
        }, 0);
        expect(result).toBe(6);
        expect(numbers).toEqual([1, 2, 3]);
    });

    it("reduceRight() reduces from right to left", () => {
        const array = reactiveArray([1, 2, 3]);
        const numbers: number[] = [];
        const result = array.reduceRight((acc, current) => {
            numbers.push(current);
            return acc + current;
        }, 0);
        expect(result).toBe(6);
        expect(numbers).toEqual([3, 2, 1]);
    });

    it("removes elements using splice()", () => {
        const array = reactiveArray([1, 2, 3]);
        const removed = array.splice(1, 1);
        expect(array.getItems()).toEqual([1, 3]);
        expect(removed).toEqual([2]);
    });

    it("removes all elements using splice()", () => {
        const array = reactiveArray([1, 2, 3]);
        const removed = array.splice(0);
        expect(array.getItems()).toEqual([]);
        expect(removed).toEqual([1, 2, 3]);
    });

    it("supports adding elements using splice()", () => {
        const array = reactiveArray([1]);
        const removed = array.splice(1, 0, 2, 3);
        expect(removed.length).toBe(0);
        expect(array.getItems()).toEqual([1, 2, 3]);
    });

    it("supports iteration", () => {
        const array = reactiveArray([1, 2, 3]);
        expect(Array.from(array)).toMatchInlineSnapshot(`
          [
            1,
            2,
            3,
          ]
        `);

        expect(Array.from(array.values())).toMatchInlineSnapshot(`
          [
            1,
            2,
            3,
          ]
        `);
    });

    it("supports key iteration", () => {
        const array = reactiveArray([1, 2, 3]);
        expect(Array.from(array.keys())).toMatchInlineSnapshot(`
          [
            0,
            1,
            2,
          ]
        `);
    });

    it("supports entry iteration", () => {
        const array = reactiveArray([1, 2, 3]);
        expect(Array.from(array.entries())).toMatchInlineSnapshot(`
          [
            [
              0,
              1,
            ],
            [
              1,
              2,
            ],
            [
              2,
              3,
            ],
          ]
        `);
    });
});

// TODO: reactivity tests?
