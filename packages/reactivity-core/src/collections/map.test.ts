// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from "vitest";
import { effect } from "../effect";
import { batch, computed } from "../signals";
import { reactiveMap } from "./map";

describe("basic API", () => {
    it("can be constructed with initial data", () => {
        const map = reactiveMap<string, number>([
            ["foo", 1],
            ["bar", 2]
        ]);
        expect(map.get("foo")).toBe(1);
        expect(map.get("bar")).toBe(2);
        expect(map.size).toBe(2);
    });

    it("supports adding, reading and deleting values", () => {
        const map = reactiveMap<string, number>();
        expect(map.has("foo")).toBe(false);
        expect(map.get("foo")).toBe(undefined);
        expect(map.size).toBe(0);

        map.set("foo", 123);
        expect(map.has("foo")).toBe(true);
        expect(map.get("foo")).toBe(123);
        expect(map.size).toBe(1);

        const removed = map.delete("foo");
        expect(removed).toBe(true);
        expect(map.has("foo")).toBe(false);
        expect(map.get("foo")).toBe(undefined);
        expect(map.size).toBe(0);
    });

    it("supports overwriting existing values", () => {
        const map = reactiveMap<string, number>();
        map.set("foo", 123);
        map.set("foo", 456);
        expect(map.get("foo")).toBe(456);
    });

    it("deleting a non existing key does nothing", () => {
        const map = reactiveMap<string, number>();
        const removed = map.delete("foo");
        expect(removed).toBe(false);
    });

    it("supports iteration via forEach", () => {
        const map = reactiveMap<string, number>([
            ["foo", 1],
            ["bar", 2]
        ]);
        map.set("baz", 3);

        const cb = vi.fn();
        map.forEach(cb);

        expect(cb.mock.calls).toMatchInlineSnapshot(`
          [
            [
              1,
              "foo",
            ],
            [
              2,
              "bar",
            ],
            [
              3,
              "baz",
            ],
          ]
        `);
    });

    it("supports iteration", () => {
        const map = reactiveMap<string, number>([
            ["foo", 1],
            ["bar", 2]
        ]);
        map.set("baz", 3);

        expect(Array.from(map)).toMatchInlineSnapshot(`
          [
            [
              "foo",
              1,
            ],
            [
              "bar",
              2,
            ],
            [
              "baz",
              3,
            ],
          ]
        `);
        expect(Array.from(map.entries())).toMatchInlineSnapshot(`
          [
            [
              "foo",
              1,
            ],
            [
              "bar",
              2,
            ],
            [
              "baz",
              3,
            ],
          ]
        `);
        expect(Array.from(map.keys())).toMatchInlineSnapshot(`
          [
            "foo",
            "bar",
            "baz",
          ]
        `);
        expect(Array.from(map.values())).toMatchInlineSnapshot(`
          [
            1,
            2,
            3,
          ]
        `);
    });

    it("supports clearing the map", () => {
        const map = reactiveMap<string, number>([
            ["foo", 1],
            ["bar", 2]
        ]);
        expect(map.size).toBe(2);
        map.clear();
        expect(map.size).toBe(0);
    });
});

describe("reactivity", () => {
    it("supports reactive size", () => {
        const map = reactiveMap<string, number>();

        let calls = 0;
        const size = computed(() => {
            calls++;
            return map.size;
        });
        expect(size.value).toBe(0);
        expect(calls).toBe(1);

        // Structural change (new key) updates the size
        map.set("foo", 3);
        expect(size.value).toBe(1);
        expect(calls).toBe(2);

        // No change (key exists, no structural change)
        map.set("foo", 3);
        expect(size.value).toBe(1);
        expect(calls).toBe(2);

        // Delete updates size
        map.delete("foo");
        expect(size.value).toBe(0);
        expect(calls).toBe(3);
    });

    it("supports reactive set, get and delete", () => {
        const map = reactiveMap<string, number>();

        const observedValues: (number | undefined)[] = [];
        effect(
            () => {
                observedValues.push(map.get("foo"));
            },
            { dispatch: "sync" }
        );

        // Initial run -> foo not present
        expect(observedValues).toEqual([undefined]);

        // Effect runs and sees actual value
        map.set("foo", 3);
        expect(observedValues).toEqual([undefined, 3]);

        // Effect runs again with new value
        map.set("foo", 4);
        expect(observedValues).toEqual([undefined, 3, 4]);

        // Removal triggers effect
        const removed = map.delete("foo");
        expect(removed).toBe(true);
        expect(observedValues).toEqual([undefined, 3, 4, undefined]);
    });

    it("supports reactive has", () => {
        const map = reactiveMap<string, number>();

        const observedValues: boolean[] = [];
        effect(
            () => {
                observedValues.push(map.has("foo"));
            },
            { dispatch: "sync" }
        );
        expect(observedValues).toEqual([false]);

        map.set("foo", 123);
        expect(observedValues).toEqual([false, true]);

        map.set("foo", 124);
        expect(observedValues).toEqual([false, true, true]); // Currently re-triggers on change

        map.delete("foo");
        expect(observedValues).toEqual([false, true, true, false]);
    });

    it("supports key iteration", () => {
        const map = reactiveMap<string, number>();

        const observedValues: string[][] = [];
        effect(
            () => {
                observedValues.push(Array.from(map.keys()));
            },
            { dispatch: "sync" }
        );
        expect(observedValues).toMatchInlineSnapshot(`
          [
            [],
          ]
        `);

        batch(() => {
            map.set("foo", 1);
            map.set("bar", 2);
        });
        expect(observedValues).toMatchInlineSnapshot(`
          [
            [],
            [
              "foo",
              "bar",
            ],
          ]
        `);

        map.delete("bar");
        expect(observedValues).toMatchInlineSnapshot(`
          [
            [],
            [
              "foo",
              "bar",
            ],
            [
              "foo",
            ],
          ]
        `);
    });

    it("supports value iteration", () => {
        const map = reactiveMap<string, number>();

        const observedValues: number[][] = [];
        effect(
            () => {
                observedValues.push(Array.from(map.values()));
            },
            { dispatch: "sync" }
        );
        expect(observedValues).toMatchInlineSnapshot(`
          [
            [],
          ]
        `);

        batch(() => {
            map.set("foo", 1);
            map.set("bar", 2);
        });
        expect(observedValues).toMatchInlineSnapshot(`
          [
            [],
            [
              1,
              2,
            ],
          ]
        `);

        map.delete("bar");
        expect(observedValues).toMatchInlineSnapshot(`
          [
            [],
            [
              1,
              2,
            ],
            [
              1,
            ],
          ]
        `);
    });

    it("supports entry iteration", () => {
        const map = reactiveMap<string, number>();

        const observedValues: [string, number][][] = [];
        effect(
            () => {
                observedValues.push(Array.from(map.entries()));
            },
            { dispatch: "sync" }
        );
        expect(observedValues).toMatchInlineSnapshot(`
          [
            [],
          ]
        `);

        batch(() => {
            map.set("foo", 1);
            map.set("bar", 2);
        });
        expect(observedValues).toMatchInlineSnapshot(`
          [
            [],
            [
              [
                "foo",
                1,
              ],
              [
                "bar",
                2,
              ],
            ],
          ]
        `);

        map.delete("bar");
        expect(observedValues).toMatchInlineSnapshot(`
          [
            [],
            [
              [
                "foo",
                1,
              ],
              [
                "bar",
                2,
              ],
            ],
            [
              [
                "foo",
                1,
              ],
            ],
          ]
        `);
    });

    it("unrelated key has no effect", () => {
        const map = reactiveMap<string, number>();

        const events: (number | undefined)[] = [];
        effect(
            () => {
                events.push(map.get("foo"));
            },
            { dispatch: "sync" }
        );
        expect(events).toEqual([undefined]);

        // Setting unrelated key
        map.set("bar", 123);
        expect(events).toEqual([undefined]);

        // Clearing has no effect
        map.clear();
        expect(events).toEqual([undefined]);

        // Again, unrelated
        map.set("bar", 321);
        expect(events).toEqual([undefined]);

        // Removing unrelated key has no effect
        map.delete("bar");
        expect(events).toEqual([undefined]);

        // Finally, the actual key
        map.set("foo", 0);
        expect(events).toEqual([undefined, 0]);
    });
});
