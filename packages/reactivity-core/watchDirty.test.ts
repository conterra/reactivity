import { expect, it, vi } from "vitest";
import { computed, reactive } from "./ReactiveImpl";
import { subtleWatchDirty } from "./watchDirty";

it("notifies the callback when the signal changed", () => {
    const v = reactive(0);
    const callback = vi.fn();
    subtleWatchDirty(v, callback);

    expect(callback).toHaveBeenCalledTimes(0);

    v.value = 1;
    expect(callback).toHaveBeenCalledTimes(1);

    v.value = 2;
    expect(callback).toHaveBeenCalledTimes(2);
});

it("stops notifications when the watch is destroyed", () => {
    const v = reactive(0);
    const callback = vi.fn();
    const { destroy } = subtleWatchDirty(v, callback);

    v.value = 1;
    expect(callback).toHaveBeenCalledTimes(1);

    destroy();
    v.value = 2;
    expect(callback).toHaveBeenCalledTimes(1);
});

it("does not trigger computed signals", () => {
    const count = reactive(0);
    const compute = vi.fn(() => count.value + 1);
    const signal = computed(compute);
    expect(compute).toHaveBeenCalledTimes(0);

    const callback = vi.fn();
    subtleWatchDirty(signal, callback);
    expect(callback).toHaveBeenCalledTimes(0);
    expect(compute).toHaveBeenCalledTimes(1); // watchDirty accesses the value once during setup

    count.value = 1;
    expect(callback).toHaveBeenCalledTimes(1);
    expect(compute).toHaveBeenCalledTimes(1); // not called again

    signal.value;
    expect(compute).toHaveBeenCalledTimes(2);
});

it("tracks the signal even if the initial access throws", () => {
    const count = reactive(0);
    const compute = vi.fn(() => {
        if (count.value === 0) {
            throw new Error("oops!");
        }
        return count.value + 1;
    });
    const signal = computed(compute);

    const callback = vi.fn();
    subtleWatchDirty(signal, callback);
    expect(callback).toHaveBeenCalledTimes(0);

    // Was called during setup and the error was ignored.
    expect(compute).toHaveBeenCalledTimes(1);
    expect(compute.mock.results).toMatchInlineSnapshot(`
      [
        {
          "type": "throw",
          "value": [Error: oops!],
        },
      ]
    `);

    // Update triggers notification
    count.value = 1;
    expect(callback).toHaveBeenCalledTimes(1);
});
