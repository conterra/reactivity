import { it, expect, describe } from "vitest";
import { reactiveSet } from "./ReactiveSet";

describe("basic API", () => {
    it("can be constructed with initial data", () => {
        const set = reactiveSet<string>(["foo", "bar"]);
        expect(set.has("foo")).toBe(true);
        expect(set.has("bar")).toBe(true);
        expect(set.has("baz")).toBe(false);
        expect(set.size).toBe(2);
    });

    it("supports adding and deleting values", () => {
        const set = reactiveSet<string>();
        expect(set.size).toBe(0);
        expect(set.has("foo")).toBe(false);

        set.add("foo");
        expect(set.size).toBe(1);
        expect(set.has("foo")).toBe(true);

        const removed = set.delete("foo");
        expect(removed).toBe(true);
        expect(set.size).toBe(0);
        expect(set.has("foo")).toBe(false);
    });

    it("removing a non existing value does nothing", () => {
        const set = reactiveSet<string>();
        const removed = set.delete("foo");
        expect(removed).toBe(false);
    });

    it("supports iteration", () => {
        const set = reactiveSet<string>(["foo", "bar"]);
        set.add("baz");

        expect(Array.from(set)).toMatchInlineSnapshot(`
          [
            "foo",
            "bar",
            "baz",
          ]
        `);
        expect(Array.from(set.values())).toMatchInlineSnapshot(`
          [
            "foo",
            "bar",
            "baz",
          ]
        `);
        expect(Array.from(set.entries())).toMatchInlineSnapshot(`
          [
            [
              "foo",
              "foo",
            ],
            [
              "bar",
              "bar",
            ],
            [
              "baz",
              "baz",
            ],
          ]
        `);
    });

    it("supports clearing the set", () => {
        const set = reactiveSet<string>(["foo", "bar"]);
        expect(set.size).toBe(2);
        set.clear();
        expect(set.size).toBe(0);
    });
});

// no reactivity tests because the implementation is based on ReactiveMap
