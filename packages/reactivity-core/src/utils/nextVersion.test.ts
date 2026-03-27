// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";
import { nextVersion } from "./nextVersion";

it("returns the next version", () => {
    expect(nextVersion(0)).toBe(1);
    expect(nextVersion(1)).toBe(2);
});

it("wraps to zero", () => {
    expect(nextVersion(2 ** 32 - 1)).toBe(0);
});
