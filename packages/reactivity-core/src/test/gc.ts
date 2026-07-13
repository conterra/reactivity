// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0

/**
 * Runs the garbage collector repeatedly until `settled` returns true or a certain
 * number of attempts have been made.
 *
 * Use this when asserting that objects eventually get collected or that finalization
 * side effects eventually happen.
 *
 * Gives up  of attempts so that the assertion in the surrounding test can fail.
 */
export async function forceGcUntil(settled: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 100 && !settled(); attempt++) {
        await runGc();
    }
}

/**
 * Runs the garbage collector a few times.
 *
 * Use this when asserting that objects are still *alive* afterwards, where there is no
 * condition that could be polled via {@link forceGcUntil}.
 */
export async function forceGc(): Promise<void> {
    for (let i = 0; i < 3; i++) {
        await runGc();
    }
    await nextTask();
}

async function runGc(): Promise<void> {
    // Objects used in the current task may not be collectable yet -> gc in a new task.
    await nextTask();
    // Provided by node's --expose-gc flag (see vitest config).
    (globalThis as { gc?: () => void }).gc!();
}

function nextTask(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}
