// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import {
    computed as rawComputed,
    effect as rawEffect,
    ReadonlySignal as RawReadonlySignal,
    signal as rawSignal
} from "@preact/signals-core";
import { describe, expect, it } from "vitest";
import { forceGc, forceGcUntil } from "./test/gc";

// A long lived, watched computed ("center") must not leak the short lived computeds and
// effects that subscribe to it. These tests use the raw signals directly: the wrapper
// classes of this library are not referenced by the raw signals and are always collectable.
describe("garbage collection", () => {
    it("collects downstream computeds and effects once the effects are disposed", async () => {
        const center = rawComputed(() => true);
        const refs = allocate((track) => {
            for (let i = 0; i < 100; i++) {
                const { downstream, effectInstance, dispose } = createWatchedDownstream(center);
                track(downstream, effectInstance);
                dispose();
            }
        });

        await forceGcUntil(() => countAlive(refs) === 0);
        expect(countAlive(refs)).toBe(0);
    });

    it("keeps downstream computeds and effects alive while the effects are not disposed", async () => {
        const center = rawComputed(() => true);
        const refs = allocate((track) => {
            for (let i = 0; i < 100; i++) {
                const { downstream, effectInstance } = createWatchedDownstream(center);
                track(downstream, effectInstance);
                // the dispose function is intentionally dropped
            }
        });

        await forceGc();
        // the center's subscriber list holds strong references to everything
        expect(countAlive(refs)).toBe(200);
    });

    it("collects a computed once a watching effect no longer depends on it", async () => {
        const center = rawComputed(() => true);
        const condition = rawSignal(true);

        // the holder lets us release our own reference to the computed later; the effect's
        // internal dependency list is then the only thing that could keep it alive
        const setup = () => {
            const holder: { downstream?: RawReadonlySignal<boolean> } = {
                downstream: rawComputed(() => center.value)
            };
            const dispose = rawEffect(() => {
                if (condition.value) {
                    holder.downstream?.value;
                }
            });
            return { holder, ref: new WeakRef(holder.downstream!), dispose };
        };
        const { holder, ref, dispose } = setup();

        condition.value = false; // the effect reruns and drops the computed as a dependency
        holder.downstream = undefined;
        await forceGcUntil(() => ref.deref() === undefined);

        expect(ref.deref()).toBeUndefined();
        dispose();
    });
});

/** Creates a computed reading `center`, watched by an effect. */
function createWatchedDownstream(center: RawReadonlySignal<unknown>) {
    let effectInstance!: object;
    const downstream = rawComputed(() => center.value);
    const dispose = rawEffect(function () {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        effectInstance = this; // `this` is the library-internal Effect instance
        downstream.value;
    });
    return { downstream, effectInstance, dispose };
}

/**
 * Runs `fn` and returns weak refs to all objects passed to `track`.
 *
 * The tracked objects are deliberately created in a nested function frame:
 * objects still referenced from the test function's own (live) stack frame
 * would never be garbage collected.
 */
function allocate(fn: (track: (...objects: object[]) => void) => void): WeakRef<object>[] {
    const refs: WeakRef<object>[] = [];
    fn((...objects) => refs.push(...objects.map((object) => new WeakRef(object))));
    return refs;
}

function countAlive(refs: WeakRef<object>[]): number {
    return refs.filter((ref) => ref.deref() !== undefined).length;
}
