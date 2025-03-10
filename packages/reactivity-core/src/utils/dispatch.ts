// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { CleanupHandle } from "../types";
import { TaskQueue } from "./TaskQueue";

const TASKS = new TaskQueue();

/**
 * Dispatches a callback to be invoked in a future task.
 *
 * @group Utilities
 */
export function dispatchAsyncCallback(callback: () => void): CleanupHandle {
    return TASKS.enqueue(callback);
}

/**
 * Returns a promise that resolves after all _currently scheduled_ asynchronous callbacks have executed.
 *
 * This function is useful in tests to wait for the execution of side effects triggered by an asynchronous `watch` or an `effect`.
 *
 * @group Utilities
 */
export function nextTick(): Promise<void> {
    return new Promise((resolve) => {
        dispatchAsyncCallback(resolve);
    });
}
