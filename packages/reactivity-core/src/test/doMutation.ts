import { MockInstance, onTestFinished, vi } from "vitest";
import { nextTick } from "../effect/dispatch";
import * as report from "../utils/reportTaskError";

let ERROR_SPY!: MockInstance | undefined;

export function setupDoMutation() {
    ERROR_SPY = vi.spyOn(report, "reportTaskError").mockImplementation(() => {});
    onTestFinished(() => {
        ERROR_SPY?.mockRestore();
        ERROR_SPY = undefined;
    });
}

/**
 * Mutates signals within the given `fn` and waits for the effects to happen.
 *
 * Throws any error by mocking the shared `reportTasksError` function.
 */
export async function doMutation(fn: () => void, type: "sync" | "async"): Promise<void> {
    if (type === "sync") {
        fn();
    } else if (type === "async") {
        let err: Error | undefined;
        ERROR_SPY!.mockImplementationOnce((e) => (err = e));
        fn();
        await nextTick();
        if (err) {
            throw err;
        }
    }
}
