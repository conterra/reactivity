// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { it, expect, describe, vi } from "vitest";
import { reactiveSet } from "./set";
import { effect } from "../effect";
import { EffectCallback } from "../types";

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

    it("supports iteration via forEach", () => {
        const set = reactiveSet<string>(["foo", "bar"]);
        set.add("baz");

        const cb = vi.fn();
        set.forEach(cb);

        expect(cb.mock.calls).toMatchInlineSnapshot(`
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

const syncEffect = (cb: EffectCallback) => effect(cb, { dispatch: "sync" });

describe("reactivity", () => {
    it("triggers effect when size changes via add", () => {
        const set = reactiveSet<string>();
        const spy = vi.fn();
        syncEffect(() => {
            spy(set.size);
        });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(0);

        set.add("foo");
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenCalledWith(1);
    });

    it("does not trigger effect when adding a duplicate value", () => {
        const set = reactiveSet<string>(["foo"]);
        const spy = vi.fn();
        syncEffect(() => {
            spy(set.size);
        });
        expect(spy).toHaveBeenCalledTimes(1);

        set.add("foo");
        expect(spy).toHaveBeenCalledTimes(1); // no change
    });

    it("triggers effect when size changes via delete", () => {
        const set = reactiveSet<string>(["foo", "bar"]);
        const spy = vi.fn();
        syncEffect(() => {
            spy(set.size);
        });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(2);

        set.delete("foo");
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenCalledWith(1);
    });

    it("does not trigger effect when deleting a non-existing value", () => {
        const set = reactiveSet<string>(["foo"]);
        const spy = vi.fn();
        syncEffect(() => {
            spy(set.size);
        });
        expect(spy).toHaveBeenCalledTimes(1);

        set.delete("bar");
        expect(spy).toHaveBeenCalledTimes(1); // no change
    });

    it("triggers effect when clearing", () => {
        const set = reactiveSet<string>(["foo", "bar"]);
        const spy = vi.fn();
        syncEffect(() => {
            spy(set.size);
        });
        expect(spy).toHaveBeenCalledTimes(1);

        set.clear();
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenCalledWith(0);
    });

    it("tracks has() reactively", () => {
        const set = reactiveSet<string>();
        const spy = vi.fn();
        syncEffect(() => {
            spy(set.has("foo"));
        });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(false);

        set.add("foo");
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenCalledWith(true);

        set.delete("foo");
        expect(spy).toHaveBeenCalledTimes(3);
        expect(spy).toHaveBeenCalledWith(false);
    });

    it("tracks iteration reactively", () => {
        const set = reactiveSet<string>(["a"]);
        const spy = vi.fn();
        syncEffect(() => {
            spy(Array.from(set));
        });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(["a"]);

        set.add("b");
        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy).toHaveBeenCalledWith(["a", "b"]);
    });
});
