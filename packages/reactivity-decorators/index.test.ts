import { reactive, syncEffect } from "@conterra/reactivity-core";
import { expect, it, vi } from "vitest";
import { computedProperty, reactiveProperty } from "./index";

it("supports classes with reactive properties", () => {
    class ReactiveClass {
        @reactiveProperty
        accessor value = 3;
    }

    const obj = new ReactiveClass();
    const spy = vi.fn();
    syncEffect(() => {
        spy(obj.value);
    });

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

it("supports computed properties", () => {
    const computeSpy = vi.fn();

    class ReactiveClass {
        @reactiveProperty
        accessor value = 3;

        @computedProperty
        get doubleValue() {
            computeSpy(this.value);
            return this.value * 2;
        }
    }

    const obj = new ReactiveClass();
    expect(obj.doubleValue).toBe(6);
    expect(computeSpy).toBeCalledTimes(1);

    obj.doubleValue;
    expect(computeSpy).toBeCalledTimes(1); // cached

    obj.value = 4;
    expect(obj.doubleValue).toBe(8);
    expect(computeSpy).toBeCalledTimes(2);
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
    syncEffect(() => {
        spy(obj.getValue());
    });

    obj.updateValue(4);
    expect(spy.mock.calls.map((c) => c[0]!)).toMatchInlineSnapshot(`
      [
        1,
        4,
      ]
    `);
});

it("supports initialization from constructor", () => {
    class ReactiveClass {
        @reactiveProperty
        accessor value: number;

        constructor() {
            this.value = 3;
        }
    }

    const obj = new ReactiveClass();
    const spy = vi.fn();
    syncEffect(() => {
        spy(obj.value);
    });

    obj.value = 4;
    expect(spy.mock.calls.map((c) => c[0]!)).toMatchInlineSnapshot(`
      [
        3,
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

it("supports options for reactive properties", () => {
    interface Point {
        x: number;
        y: number;
    }

    class ReactiveClass {
        @reactiveProperty.withOptions({
            equal(p1, p2) {
                // TODO: point is initially undefined...
                return p1?.x === p2.x && p1?.y === p2.y;
            }
        })
        accessor point: Point;

        constructor(point: Point) {
            this.point = point;
        }
    }

    const p1 = { x: 1, y: 1};
    const p2 = { x: 1, y: 1};
    const p3 = { x: 1, y: 2};
    
    const obj = new ReactiveClass(p1);
    expect(obj.point).toBe(p1);

    obj.point = p2;
    expect(obj.point).toBe(p1); // old value (p1 equal to p2)

    obj.point = p3;
    expect(obj.point).toBe(p3); // not equal, write went through
});

it("supports options for computed properties", () => {
    const name = reactive("foo");

    const computedSpy = vi.fn();
    class ReactiveClass {
        @computedProperty.withOptions({
            equal(o1, o2) {
                return o1.name === o2.name;
            }
        })
        get objWithName() {
            computedSpy(name.value);
            return { name: name.value.toUpperCase() };
        } 
    }

    const obj = new ReactiveClass();
    const initial = obj.objWithName;
    expect(computedSpy).toHaveBeenCalledTimes(1);
    expect(initial.name).toBe("FOO");

    name.value = "Foo";
    expect(obj.objWithName).toBe(initial); // got same object
    expect(computedSpy).toHaveBeenCalledTimes(2); // but getter was called

    name.value = "Bar";
    expect(obj.objWithName.name).toBe("BAR");
    expect(computedSpy).toHaveBeenCalledTimes(3);
});
