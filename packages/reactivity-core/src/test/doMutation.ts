// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { MockInstance, onTestFinished, vi } from "vitest";
import { DispatchType } from "../types";
import { nextTick } from "../utils/dispatch";
import * as report from "../utils/reportCallbackError";

let ERROR_SPY!: MockInstance | undefined;

export function setupDoMutation(): void {
    ERROR_SPY = vi.spyOn(report, "reportCallbackError").mockImplementation(() => {});
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
export async function doMutation(fn: () => void, type: DispatchType): Promise<void> {
    if (type === "sync") {
        fn();
    } else if (type === "async") {
        let err: Error | undefined;
        ERROR_SPY!.mockImplementationOnce((e: Error) => {
            err = e;
        });
        fn();
        await nextTick();
        if (err) {
            throw err;
        }
    }
}
