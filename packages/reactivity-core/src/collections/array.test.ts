// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from "vitest";
import { effect } from "../effect";
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

describe("reactivity", () => {
    it("supports reactive length", () => {
        const array = reactiveArray<number>();

        const observedLengths: number[] = [];
        effect(
            () => {
                observedLengths.push(array.length);
            },
            { dispatch: "sync" }
        );
        expect(observedLengths).toEqual([0]);

        // Adding items updates length
        array.push(1);
        expect(observedLengths).toEqual([0, 1]);

        array.push(2, 3);
        expect(observedLengths).toEqual([0, 1, 3]);

        // Removing items updates length
        array.pop();
        expect(observedLengths).toEqual([0, 1, 3, 2]);

        // Clear via splice
        array.splice(0);
        expect(observedLengths).toEqual([0, 1, 3, 2, 0]);
    });

    it("supports reactive get and set", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        const observedValues: (number | undefined)[] = [];
        effect(
            () => {
                observedValues.push(array.get(1));
            },
            { dispatch: "sync" }
        );

        // Initial run -> sees value at index 1
        expect(observedValues).toEqual([2]);

        // Effect runs with new value
        array.set(1, 20);
        expect(observedValues).toEqual([2, 20]);

        // Another update
        array.set(1, 200);
        expect(observedValues).toEqual([2, 20, 200]);
    });

    it("supports reactive get and set even if the index is initially invalid", () => {
        const array = reactiveArray<number>([]);

        const observedValues: (number | undefined)[] = [];
        effect(
            () => {
                observedValues.push(array.get(0));
            },
            { dispatch: "sync" }
        );

        expect(observedValues).toEqual([undefined]);

        array.push(1);
        expect(observedValues).toEqual([undefined, 1]);
    });

    it("supports reactive at()", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        const observedValues: (number | undefined)[] = [];
        effect(
            () => {
                observedValues.push(array.at(1));
            },
            { dispatch: "sync" }
        );

        expect(observedValues).toEqual([2]);

        array.set(1, 20);
        expect(observedValues).toEqual([2, 20]);
    });

    it("fine-grained reactivity: changing one index only notifies that index", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        let index0Calls = 0;
        let index1Calls = 0;
        let index2Calls = 0;

        effect(
            () => {
                array.get(0);
                index0Calls++;
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                array.get(1);
                index1Calls++;
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                array.get(2);
                index2Calls++;
            },
            { dispatch: "sync" }
        );

        expect(index0Calls).toBe(1);
        expect(index1Calls).toBe(1);
        expect(index2Calls).toBe(1);

        // Change only index 1
        array.set(1, 20);
        expect(index0Calls).toBe(1); // Not called
        expect(index1Calls).toBe(2); // Called
        expect(index2Calls).toBe(1); // Not called

        // Change only index 0
        array.set(0, 10);
        expect(index0Calls).toBe(2); // Called
        expect(index1Calls).toBe(2); // Not called
        expect(index2Calls).toBe(1); // Not called

        // Change only index 2
        array.set(2, 30);
        expect(index0Calls).toBe(2); // Not called
        expect(index1Calls).toBe(2); // Not called
        expect(index2Calls).toBe(2); // Called
    });

    it("supports reactive push()", () => {
        const array = reactiveArray<number>([1, 2]);

        const observedLengths: number[] = [];
        const observedIndex2Values: (number | undefined)[] = [];

        effect(
            () => {
                observedLengths.push(array.length);
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex2Values.push(array.get(2));
            },
            { dispatch: "sync" }
        );

        expect(observedLengths).toEqual([2]);
        expect(observedIndex2Values).toEqual([undefined]);

        // Push triggers length and new index
        array.push(3);
        expect(observedLengths).toEqual([2, 3]);
        expect(observedIndex2Values).toEqual([undefined, 3]);

        // Push multiple items (pushes to indices 3 and 4, so index 2 is not affected)
        array.push(4, 5);
        expect(observedLengths).toEqual([2, 3, 5]);
        expect(observedIndex2Values).toEqual([undefined, 3]); // Index 2 doesn't change
    });

    it("supports reactive pop()", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        const observedLengths: number[] = [];
        const observedIndex2Values: (number | undefined)[] = [];

        effect(
            () => {
                observedLengths.push(array.length);
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex2Values.push(array.get(2));
            },
            { dispatch: "sync" }
        );

        expect(observedLengths).toEqual([3]);
        expect(observedIndex2Values).toEqual([3]);

        // Pop triggers length and last index
        const value = array.pop();
        expect(value).toBe(3);
        expect(observedLengths).toEqual([3, 2]);
        expect(observedIndex2Values).toEqual([3, undefined]);
    });

    it("supports reactive shift()", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        const observedLengths: number[] = [];
        const observedIndex0Values: (number | undefined)[] = [];
        const observedIndex1Values: (number | undefined)[] = [];

        effect(
            () => {
                observedLengths.push(array.length);
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex0Values.push(array.get(0));
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex1Values.push(array.get(1));
            },
            { dispatch: "sync" }
        );

        expect(observedLengths).toEqual([3]);
        expect(observedIndex0Values).toEqual([1]);
        expect(observedIndex1Values).toEqual([2]);

        // Shift triggers all indices and length
        const value = array.shift();
        expect(value).toBe(1);
        expect(observedLengths).toEqual([3, 2]);
        expect(observedIndex0Values).toEqual([1, 2]); // Was at index 1, now at index 0
        expect(observedIndex1Values).toEqual([2, 3]); // Was at index 2, now at index 1
    });

    it("supports reactive unshift()", () => {
        const array = reactiveArray<number>([2, 3]);

        const observedLengths: number[] = [];
        const observedIndex0Values: (number | undefined)[] = [];
        const observedIndex1Values: (number | undefined)[] = [];

        effect(
            () => {
                observedLengths.push(array.length);
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex0Values.push(array.get(0));
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex1Values.push(array.get(1));
            },
            { dispatch: "sync" }
        );

        expect(observedLengths).toEqual([2]);
        expect(observedIndex0Values).toEqual([2]);
        expect(observedIndex1Values).toEqual([3]);

        // Unshift triggers all indices and length
        array.unshift(1);
        expect(observedLengths).toEqual([2, 3]);
        expect(observedIndex0Values).toEqual([2, 1]); // New value at index 0
        expect(observedIndex1Values).toEqual([3, 2]); // Was at index 0, now at index 1
    });

    it("supports reactive splice() for removal", () => {
        const array = reactiveArray<number>([1, 2, 3, 4]);

        const observedLengths: number[] = [];
        const observedIndex1Values: (number | undefined)[] = [];

        effect(
            () => {
                observedLengths.push(array.length);
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex1Values.push(array.get(1));
            },
            { dispatch: "sync" }
        );

        expect(observedLengths).toEqual([4]);
        expect(observedIndex1Values).toEqual([2]);

        // Remove one element at index 1
        const removed = array.splice(1, 1);
        expect(removed).toEqual([2]);
        expect(observedLengths).toEqual([4, 3]);
        expect(observedIndex1Values).toEqual([2, 3]); // Index 2 moved to index 1
    });

    it("supports reactive splice() for insertion", () => {
        const array = reactiveArray<number>([1, 4]);

        const observedLengths: number[] = [];
        const observedIndex1Values: (number | undefined)[] = [];
        const observedIndex2Values: (number | undefined)[] = [];

        effect(
            () => {
                observedLengths.push(array.length);
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex1Values.push(array.get(1));
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex2Values.push(array.get(2));
            },
            { dispatch: "sync" }
        );

        expect(observedLengths).toEqual([2]);
        expect(observedIndex1Values).toEqual([4]);
        expect(observedIndex2Values).toEqual([undefined]);

        // Insert elements at index 1
        array.splice(1, 0, 2, 3);
        expect(observedLengths).toEqual([2, 4]);
        expect(observedIndex1Values).toEqual([4, 2]); // New value inserted
        expect(observedIndex2Values).toEqual([undefined, 3]); // New value inserted
    });

    it("supports reactive sort()", () => {
        const array = reactiveArray<number>([3, 1, 2]);

        const observedIndex0Values: (number | undefined)[] = [];
        const observedIndex1Values: (number | undefined)[] = [];
        const observedIndex2Values: (number | undefined)[] = [];

        effect(
            () => {
                observedIndex0Values.push(array.get(0));
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex1Values.push(array.get(1));
            },
            { dispatch: "sync" }
        );

        effect(
            () => {
                observedIndex2Values.push(array.get(2));
            },
            { dispatch: "sync" }
        );

        expect(observedIndex0Values).toEqual([3]);
        expect(observedIndex1Values).toEqual([1]);
        expect(observedIndex2Values).toEqual([2]);

        // Sort triggers all indices
        array.sort((a, b) => a - b);
        expect(observedIndex0Values).toEqual([3, 1]);
        expect(observedIndex1Values).toEqual([1, 2]);
        expect(observedIndex2Values).toEqual([2, 3]);
    });

    it("supports reactive iteration", () => {
        const array = reactiveArray<number>([1, 2]);

        const observedValues: number[][] = [];
        effect(
            () => {
                observedValues.push(Array.from(array));
            },
            { dispatch: "sync" }
        );
        expect(observedValues).toEqual([[1, 2]]);

        // Adding items triggers iteration
        array.push(3);
        expect(observedValues).toEqual([
            [1, 2],
            [1, 2, 3]
        ]);

        // Removing items triggers iteration
        array.pop();
        expect(observedValues).toEqual([
            [1, 2],
            [1, 2, 3],
            [1, 2]
        ]);
    });

    it("supports reactive values()", () => {
        const array = reactiveArray<number>([1, 2]);

        const observedValues: number[][] = [];
        effect(
            () => {
                observedValues.push(Array.from(array.values()));
            },
            { dispatch: "sync" }
        );
        expect(observedValues).toEqual([[1, 2]]);

        array.push(3);
        expect(observedValues).toEqual([
            [1, 2],
            [1, 2, 3]
        ]);
    });

    it("supports reactive keys()", () => {
        const array = reactiveArray<number>([1, 2]);

        const observedKeys: number[][] = [];
        effect(
            () => {
                observedKeys.push(Array.from(array.keys()));
            },
            { dispatch: "sync" }
        );
        expect(observedKeys).toEqual([[0, 1]]);

        array.push(3);
        expect(observedKeys).toEqual([
            [0, 1],
            [0, 1, 2]
        ]);
    });

    it("supports reactive entries()", () => {
        const array = reactiveArray<number>([1, 2]);

        const observedEntries: [number, number][][] = [];
        effect(
            () => {
                observedEntries.push(Array.from(array.entries()));
            },
            { dispatch: "sync" }
        );
        expect(observedEntries).toEqual([
            [
                [0, 1],
                [1, 2]
            ]
        ]);

        array.push(3);
        expect(observedEntries).toEqual([
            [
                [0, 1],
                [1, 2]
            ],
            [
                [0, 1],
                [1, 2],
                [2, 3]
            ]
        ]);
    });

    it("supports reactive getItems()", () => {
        const array = reactiveArray<number>([1, 2]);

        const observedItems: number[][] = [];
        effect(
            () => {
                observedItems.push(array.getItems());
            },
            { dispatch: "sync" }
        );
        expect(observedItems).toEqual([[1, 2]]);

        array.push(3);
        expect(observedItems).toEqual([
            [1, 2],
            [1, 2, 3]
        ]);

        array.set(1, 20);
        expect(observedItems).toEqual([
            [1, 2],
            [1, 2, 3],
            [1, 20, 3]
        ]);
    });

    it("supports reactive slice()", () => {
        const array = reactiveArray<number>([1, 2, 3, 4]);

        const observedSlice: number[][] = [];
        effect(
            () => {
                observedSlice.push(array.slice(1, 3).getItems());
            },
            { dispatch: "sync" }
        );
        expect(observedSlice).toEqual([[2, 3]]);

        // Changing an index in the slice range triggers
        array.set(1, 20);
        expect(observedSlice).toEqual([
            [2, 3],
            [20, 3]
        ]);

        // Changing an index outside the slice range doesn't trigger
        array.set(0, 10);
        expect(observedSlice).toEqual([
            [2, 3],
            [20, 3]
        ]);

        array.set(3, 40);
        expect(observedSlice).toEqual([
            [2, 3],
            [20, 3]
        ]);
    });

    it("supports reactive forEach()", () => {
        const array = reactiveArray<string>(["a", "b"]);

        const observedValues: string[][] = [];
        effect(
            () => {
                const values: string[] = [];
                array.forEach((v) => values.push(v));
                observedValues.push(values);
            },
            { dispatch: "sync" }
        );
        expect(observedValues).toEqual([["a", "b"]]);

        array.push("c");
        expect(observedValues).toEqual([
            ["a", "b"],
            ["a", "b", "c"]
        ]);
    });

    it("supports reactive filter()", () => {
        const array = reactiveArray<number>([1, 2, 3, 4]);

        const observedFiltered: number[][] = [];
        effect(
            () => {
                observedFiltered.push(array.filter((v) => v > 2).getItems());
            },
            { dispatch: "sync" }
        );
        expect(observedFiltered).toEqual([[3, 4]]);

        array.push(5);
        expect(observedFiltered).toEqual([
            [3, 4],
            [3, 4, 5]
        ]);
    });

    it("supports reactive map()", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        const observedMapped: number[][] = [];
        effect(
            () => {
                observedMapped.push(array.map((v) => v * 2).getItems());
            },
            { dispatch: "sync" }
        );
        expect(observedMapped).toEqual([[2, 4, 6]]);

        array.set(1, 20);
        expect(observedMapped).toEqual([
            [2, 4, 6],
            [2, 40, 6]
        ]);
    });

    it("supports reactive reduce()", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        const observedSums: number[] = [];
        effect(
            () => {
                observedSums.push(array.reduce((acc, v) => acc + v, 0));
            },
            { dispatch: "sync" }
        );
        expect(observedSums).toEqual([6]);

        array.push(4);
        expect(observedSums).toEqual([6, 10]);

        array.set(0, 10);
        expect(observedSums).toEqual([6, 10, 19]);
    });

    it("supports reactive includes()", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        const observedIncludes: boolean[] = [];
        effect(
            () => {
                observedIncludes.push(array.includes(2));
            },
            { dispatch: "sync" }
        );
        expect(observedIncludes).toEqual([true]);

        array.set(1, 20);
        expect(observedIncludes).toEqual([true, false]);

        array.push(2);
        expect(observedIncludes).toEqual([true, false, true]);
    });

    it("supports reactive indexOf()", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        const observedIndexes: number[] = [];
        effect(
            () => {
                observedIndexes.push(array.indexOf(2));
            },
            { dispatch: "sync" }
        );
        expect(observedIndexes).toEqual([1]);

        array.set(1, 20);
        expect(observedIndexes).toEqual([1, -1]);
    });

    it("supports reactive find()", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        const observedValues: (number | undefined)[] = [];
        effect(
            () => {
                observedValues.push(array.find((v) => v > 2));
            },
            { dispatch: "sync" }
        );
        expect(observedValues).toEqual([3]);

        array.set(2, 30);
        expect(observedValues).toEqual([3, 30]);
    });

    it("negative indices in at() are reactive", () => {
        const array = reactiveArray<number>([1, 2, 3]);

        const observedValues: (number | undefined)[] = [];
        effect(
            () => {
                observedValues.push(array.at(-1));
            },
            { dispatch: "sync" }
        );
        expect(observedValues).toEqual([3]);

        // Changing the last element
        array.set(2, 30);
        expect(observedValues).toEqual([3, 30]);

        // Adding a new element changes what -1 refers to
        array.push(4);
        expect(observedValues).toEqual([3, 30, 4]);
    });
});
