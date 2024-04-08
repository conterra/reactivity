import { describe, expect, it, vi } from "vitest";
import { reactiveList } from "./ReactiveList";

describe("basic usage", () => {
    it("can be constructed with initial data", () => {
        const list = reactiveList([1, 2, 3]);
        expect(list.length).toBe(3);
        expect(list.getItems()).toEqual([1, 2, 3]);
    });

    it("returns an item from at()", () => {
        const list = reactiveList([1, 2, 3]);
        expect(list.at(0)).toBe(1);
        expect(list.at(1)).toBe(2);
        expect(list.at(-1)).toBe(3);
    });

    it("returns an item from get()", () => {
        const list = reactiveList([1, 2, 3]);
        expect(list.get(0)).toBe(1);
        expect(list.get(1)).toBe(2);
        expect(list.get(-1)).toBe(undefined);
    });

    it("changes an item via set()", () => {
        const list = reactiveList([1, 2, 3]);
        list.set(2, 4);
        expect(list.get(2)).toBe(4);
    });

    it("throws an error when attempting to set an out of bounds item", () => {
        const list = reactiveList([1, 2, 3]);
        expect(() => list.set(-1, 4)).toThrowErrorMatchingInlineSnapshot(
            `[Error: index out of bounds]`
        );
        expect(() => list.set(3, 4)).toThrowErrorMatchingInlineSnapshot(
            `[Error: index out of bounds]`
        );
    });

    it("returns sub-lists from slice()", () => {
        const list = reactiveList([1, 2, 3]);
        const list1 = list.slice(1);
        expect(list1.getItems()).toEqual([2, 3]);

        const list2 = list.slice(0, 2);
        expect(list2.getItems()).toEqual([1, 2]);

        const list3 = list.slice(3);
        expect(list3.getItems()).toEqual([]);
    });

    it("supports concatenation with values and arrays", () => {
        const list = reactiveList([1]).concat(2, [3, 4], reactiveList([5]));
        expect(list.getItems()).toEqual([1, 2, 3, 4, 5]);
    });

    it("supports the includes() method", () => {
        const list = reactiveList([1]);
        expect(list.includes(1)).toBe(true);
        expect(list.includes(2)).toBe(false);
    });

    it("finds the first index of an item via indexOf()", () => {
        const list = reactiveList([1, 2, 2]);
        expect(list.indexOf(2)).toBe(1);
        expect(list.indexOf(3)).toBe(-1);
    });

    it("finds the last index of an item via lastIndexOf()", () => {
        const list = reactiveList([1, 2, 2]);
        expect(list.lastIndexOf(2)).toBe(2);
        expect(list.lastIndexOf(3)).toBe(-1);
    });

    it("finds an item via find()", () => {
        const item1 = {
            a: 1
        };
        const item2 = {
            a: 1
        };
        const list = reactiveList<{ a: number }>([{ a: 0 }, item1, item2]);
        expect(list.find((v) => v.a === 1)).toBe(item1); // test identity
        expect(list.find((v) => v.a === 2)).toBe(undefined);
    });

    it("finds the last item via findLast()", () => {
        const item1 = {
            a: 1
        };
        const item2 = {
            a: 1
        };
        const list = reactiveList<{ a: number }>([{ a: 0 }, item1, item2]);
        expect(list.findLast((v) => v.a === 1)).toBe(item2); // test identity
        expect(list.findLast((v) => v.a === 2)).toBe(undefined);
    });

    it("finds an item's index via findIndex()", () => {
        const item1 = {
            a: 1
        };
        const item2 = {
            a: 1
        };
        const list = reactiveList<{ a: number }>([{ a: 0 }, item1, item2]);
        expect(list.findIndex((v) => v.a === 1)).toBe(1);
        expect(list.findIndex((v) => v.a === 2)).toBe(-1);
    });

    it("finds an item's index via findLastIndex()", () => {
        const item1 = {
            a: 1
        };
        const item2 = {
            a: 1
        };
        const list = reactiveList<{ a: number }>([{ a: 0 }, item1, item2]);
        expect(list.findLastIndex((v) => v.a === 1)).toBe(2);
        expect(list.findLastIndex((v) => v.a === 2)).toBe(-1);
    });

    it("supports the some() operation", () => {
        const list = reactiveList([1, 2, 3]);
        expect(list.some((v) => v === 3)).toBe(true);
        expect(list.some((v) => v === 4)).toBe(false);

        // empty -> false
        expect(reactiveList().some(() => true)).toBe(false);
    });

    it("supports the every() operation", () => {
        const list = reactiveList([1, 2, 3]);
        expect(list.every((v) => v <= 3)).toBe(true);
        expect(list.every((v) => v < 3)).toBe(false);

        // empty -> false
        expect(reactiveList().every(() => false)).toBe(true);
    });

    it("invokes the callback for each item in the list", () => {
        const list = reactiveList(["a", "b", "c"]);
        const cb = vi.fn();
        list.forEach(cb);
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
        const list = reactiveList(["a", "b", "c"]);
        const filtered = list.filter((item) => item === "b");
        expect(filtered.getItems()).toEqual(["b"]);
    });

    it("returns a mapped list from map()", () => {
        const list = reactiveList(["a", "b", "c"]);
        const mapped = list.map((item) => item.toUpperCase());
        expect(mapped.getItems()).toEqual(["A", "B", "C"]);
    });

    it("supports the flatMap() operation", () => {
        const list = reactiveList(["a", "b", "c"]);
        const mapped = list.flatMap((item) => (item === "b" ? ["b", "b"] : item.toUpperCase()));
        expect(mapped.getItems()).toEqual(["A", "b", "b", "C"]);
    });

    it("reduce() reduces from left to right", () => {
        const list = reactiveList([1, 2, 3]);
        const numbers: number[] = [];
        const result = list.reduce((acc, current) => {
            numbers.push(current);
            return acc + current;
        }, 0);
        expect(result).toBe(6);
        expect(numbers).toEqual([1, 2, 3]);
    });

    it("reduceRight() reduces from right to left", () => {
        const list = reactiveList([1, 2, 3]);
        const numbers: number[] = [];
        const result = list.reduceRight((acc, current) => {
            numbers.push(current);
            return acc + current;
        }, 0);
        expect(result).toBe(6);
        expect(numbers).toEqual([3, 2, 1]);
    });

    it("supports iteration", () => {
        const list = reactiveList([1, 2, 3]);
        expect(Array.from(list)).toMatchInlineSnapshot(`
          [
            1,
            2,
            3,
          ]
        `);

        expect(Array.from(list.values())).toMatchInlineSnapshot(`
          [
            1,
            2,
            3,
          ]
        `);
    });

    it("supports key iteration", () => {
        const list = reactiveList([1, 2, 3]);
        expect(Array.from(list.keys())).toMatchInlineSnapshot(`
          [
            0,
            1,
            2,
          ]
        `);
    });

    it("supports entry iteration", () => {
        const list = reactiveList([1, 2, 3]);
        expect(Array.from(list.entries())).toMatchInlineSnapshot(`
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
