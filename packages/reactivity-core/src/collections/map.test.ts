import { it, expect, describe, vi } from "vitest";
import { ReactiveMap, reactiveMap } from "./map";
import { batch, computed } from "../signals";
import { syncEffect } from "../effect/syncEffect";

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
        syncEffect(() => {
            observedValues.push(map.get("foo"));
        });

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
        syncEffect(() => {
            observedValues.push(map.has("foo"));
        });
        expect(observedValues).toEqual([false]);

        map.set("foo", 123);
        expect(observedValues).toEqual([false, true]);

        map.set("foo", 124);
        expect(observedValues).toEqual([false, true]);

        map.delete("foo");
        expect(observedValues).toEqual([false, true, false]);
    });

    it("supports key iteration", () => {
        const map = reactiveMap<string, number>();

        const observedValues: string[][] = [];
        syncEffect(() => {
            observedValues.push(Array.from(map.keys()));
        });
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
        syncEffect(() => {
            observedValues.push(Array.from(map.values()));
        });
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
        syncEffect(() => {
            observedValues.push(Array.from(map.entries()));
        });
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

    /**
     * This test documents the currently intended behavior.
     * Whenever a new key is added or an existing key is removed ("structural change"),
     * _all_ watchers on the map will be reevaluated (length, get, has, ...).
     *
     * This is not exactly optimal for performance (too many invocations), but its not really wrong either.
     * The alternative is a much more complicated implementation using fine grained signals even for
     * keys _not_ in the map (and the resulting memory management / leaks).
     */
    it("fires coarse change events for structural changes", () => {
        const testStructuralChange = (
            title: string,
            operation: (map: ReactiveMap<string, number>) => void,
            options?: {
                expectChange?: boolean;
                startEmpty?: boolean;
            }
        ) => {
            const { startEmpty = false, expectChange = true } = options ?? {};

            const map = reactiveMap<string, number>(
                startEmpty ? undefined : [["existing key", 123]]
            );

            let triggered = 0;
            syncEffect(() => {
                map.size; // currently triggered whenever something triggers a coarse structural change
                triggered++;
            });
            expect(triggered).toBe(1);

            operation(map);
            if (expectChange) {
                expect(
                    triggered,
                    `${title}: operation should trigger a change in the map's structure`
                ).toBe(2);
            } else {
                expect(
                    triggered,
                    `${title}: operation should NOT trigger a change in the map's structure`
                ).toBe(1);
            }
        };

        testStructuralChange("adding a new key", (map) => {
            map.set("new key", 456);
        });
        testStructuralChange(
            "overwriting an existing key",
            (map) => {
                map.set("existing key", 456);
            },
            { expectChange: false }
        );
        testStructuralChange("removing an existing key", (map) => {
            map.delete("existing key");
        });
        testStructuralChange(
            "removing a non-existing key",
            (map) => {
                map.delete("other key");
            },
            { expectChange: false }
        );
        testStructuralChange("clearing a non-empty map", (map) => {
            map.clear();
        });
        testStructuralChange(
            "clearing an empty map",
            (map) => {
                map.clear();
            },
            { expectChange: false, startEmpty: true }
        );
    });
});
