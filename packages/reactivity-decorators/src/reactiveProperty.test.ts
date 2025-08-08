// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { effect } from "@conterra/reactivity-core";
import { expect, it, vi } from "vitest";
import { reactiveProperty } from "./reactiveProperty";

it("adds a reactive property backed by a signal", () => {
    class ReactiveClass {
        @reactiveProperty
        accessor value = 3;
    }

    const obj = new ReactiveClass();
    const spy = vi.fn();
    effect(
        () => {
            spy(obj.value);
        },
        { dispatch: "sync" }
    );

    obj.value += 1;
    obj.value = 20;
    expect(spy.mock.calls.map((c) => c[0]!)).toMatchInlineSnapshot(`
      [
        3,
        4,
        20,
      ]
    `);
});

it("supports private properties", () => {
    class ReactiveClass {
        @reactiveProperty
        accessor #value = 1;

        updateValue(newValue: number) {
            this.#value = newValue;
        }

        getValue() {
            return this.#value;
        }
    }

    const obj = new ReactiveClass();
    const spy = vi.fn();
    effect(
        () => {
            spy(obj.getValue());
        },
        { dispatch: "sync" }
    );

    obj.updateValue(4);
    expect(spy.mock.calls.map((c) => c[0]!)).toMatchInlineSnapshot(`
      [
        1,
        4,
      ]
    `);
});

it("does not share state between instances", () => {
    class ReactiveClass {
        @reactiveProperty
        accessor value: number;

        constructor(v: number) {
            this.value = v;
        }
    }

    const obj1 = new ReactiveClass(1);
    const obj2 = new ReactiveClass(2);
    expect(obj1.value).toBe(1);
    expect(obj2.value).toBe(2);
});

it("supports options", () => {
    interface Point {
        x: number;
        y: number;
    }

    class ReactiveClass {
        @reactiveProperty.configure({
            equal(p1, p2) {
                return p1?.x === p2.x && p1.y === p2.y;
            }
        })
        accessor point: Point;

        constructor(point: Point) {
            // Up to this line, `this.point` is undefined (the signal is present, but without an initial value).
            // This is why the `equal` function above must handle the `undefined` case as well.
            this.point = point;
        }
    }

    const p1 = { x: 1, y: 1 };
    const p2 = { x: 1, y: 1 };
    const p3 = { x: 1, y: 2 };

    const obj = new ReactiveClass(p1);
    expect(obj.point).toBe(p1);

    obj.point = p2;
    expect(obj.point).toBe(p1); // old value (p1 equal to p2)

    obj.point = p3;
    expect(obj.point).toBe(p3); // not equal, write went through
});
