// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0

/**
 * Increments the value by 1, with wrap around to 0 after 32 bits.
 */
export function nextVersion(currentVersion: number): number {
    return (currentVersion + 1) >>> 0;
}
