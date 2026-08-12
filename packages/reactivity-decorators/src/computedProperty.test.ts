// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { reactive } from "@conterra/reactivity-core";
import { expect, it, vi } from "vitest";
import { computedProperty, reactiveProperty } from "./index";

it("creates a reactive property backed by a computed signal ", () => {
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

it("supports options", () => {
    const name = reactive("foo");

    const computedSpy = vi.fn();
    class ReactiveClass {
        @computedProperty.configure({
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
