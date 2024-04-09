import { expect, it, vi } from "vitest";
import { TaskQueue } from "./TaskQueue";

it("dispatches queued tasks", async () => {
    const queue = new TaskQueue();
    const spy = vi.fn();
    queue.enqueue(spy);

    // dispatch is async
    expect(spy).not.toHaveBeenCalled();
    await waitForMacroTask();
    expect(spy).toHaveBeenCalledTimes(1);
});

it("runs queued tasks in order", async () => {
    const queue = new TaskQueue();
    const events: string[] = [];

    queue.enqueue(() => events.push("A"));
    queue.enqueue(() => events.push("B"));
    queue.enqueue(() => {
        events.push("C");
        queue.enqueue(() => events.push("D"));
    });

    expect(events.length).toBe(0);
    await waitForMacroTask();
    expect(events).toEqual(["A", "B", "C", "D"]);
});

it("supports cancelling queued tasks", async () => {
    const queue = new TaskQueue();
    const spy = vi.fn();
    const handle = queue.enqueue(spy);
    handle.destroy();

    expect(spy).not.toHaveBeenCalled();
    await waitForMacroTask();
    expect(spy).not.toHaveBeenCalled();
});

it("supports cancelling queued tasks while dispatching is already running", async () => {
    const queue = new TaskQueue();
    const spy = vi.fn();
    queue.enqueue(() => handle.destroy()); // cancel the other job, which is already pending
    const handle = queue.enqueue(spy);

    expect(spy).not.toHaveBeenCalled();
    await waitForMacroTask();
    expect(spy).not.toHaveBeenCalled();
});

function waitForMacroTask() {
    return new Promise((resolve) => setTimeout(resolve, 10));
}
