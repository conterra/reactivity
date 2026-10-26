---
name: reactivity-core
description: How to use @conterra/reactivity-core (signals, computed, linked, effect, watch, reactive collections, reactiveStruct). Use when writing, reviewing or debugging code that imports from "@conterra/reactivity-core".
---

# @conterra/reactivity-core

Framework-agnostic signals library (built on `@preact/signals-core`).
State lives in signals; derived values and side effects track the signals they read automatically.

Full documentation with more examples: `node_modules/@conterra/reactivity-core/README.md`.
Search it by section heading (e.g. `### Linked signals`, `### Working with promises`) when you need details.
API docs are in the type declarations (`node_modules/@conterra/reactivity-core/dist/index.d.ts`).

## Primitives

```ts
import { reactive, computed, linked, constant, synchronized } from "@conterra/reactivity-core";

const count = reactive(0); // Reactive<number>, read/write via .value
const double = computed(() => count.value * 2); // ReadonlyReactive<number>, cached, lazy
const fixed = constant(3); // ReadonlyReactive<number>, never changes

count.value = 1; // notifies dependents
```

- Read with `.value` (tracked). `signal.peek()` reads without tracking.
- `computed` callbacks must be pure: no writes, no side effects. They only recompute when a dependency changed.
- Change detection uses `Object.is`. For objects/arrays pass `{ equal: (a, b) => ... }` to `reactive`/`computed`/`linked`.
- `linked(source, reset?)`: writable signal that resets when `source` changes. Use for "user selection that resets when options change".
- `synchronized(getValue, subscribe)`: bridge external (event based) state into a signal. `subscribe(onChange)` must return an unsubscribe function.
- Do not use deprecated APIs: `external` (use `synchronized`), `peekValue` (use `untracked` + `getValue`), `syncEffect` / `syncWatch` / `syncWatchValue` (use the `dispatch: "sync"` option). Never use `internal_*` exports.

## Reactive classes

Keep signals private, expose plain getters/setters/methods. Consumers never see signals:

```ts
import { reactive, computed } from "@conterra/reactivity-core";

class Person {
    #firstName = reactive("John");
    #lastName = reactive("Doe");
    #fullName = computed(() => `${this.#firstName.value} ${this.#lastName.value}`);

    get firstName() {
        return this.#firstName.value;
    }
    set firstName(value: string) {
        this.#firstName.value = value;
    }
    get fullName() {
        return this.#fullName.value;
    }
}
```

Any getter backed by signals is reactive when read inside `computed`/`effect`/`watch`.
For simple data objects, `reactiveStruct<T>().define({...})` generates such a class (supports `writable: false`, `reactive: false`, `compute()`, `method()`); see README section `#### Struct`.

## Effect vs. watch

| Function       | Tracks                                | Callback runs                                   |
| -------------- | ------------------------------------- | ----------------------------------------------- |
| `effect(cb)`   | every signal read in `cb`             | immediately, then after _any_ dependency change |
| `watchValue()` | signals read in the selector          | when selected value changes (`Object.is`)       |
| `watch()`      | selector returning an array of values | when any array item changes (shallow equality)  |

```ts
import { effect, watchValue } from "@conterra/reactivity-core";

const h1 = effect(() => {
    console.log(count.value);
});

const h2 = watchValue(
    () => count.value, // selector: tracked, pure
    (value, oldValue, ctx) => {
        // callback: NOT tracked, may have side effects
        console.log(value, oldValue);
    },
    { immediate: true } // default false: only runs after the first change
);

// Always destroy when no longer needed, otherwise it runs (and leaks) forever.
h1.destroy();
h2.destroy();
```

- Prefer `watchValue`/`watch` when only specific changes matter; `effect` re-runs on every dependency change.
- Watch options: `immediate`, `equal` (custom comparison for the watched value), `dispatch`. `effect` only accepts `dispatch`.
- `dispatch: "async"` (default): re-runs are deferred to a later macro task, so synchronous changes coalesce. The _initial_ `effect` run is always synchronous.
- `dispatch: "sync"`: runs inside the `.value` assignment (or at the end of `batch`). Only use when exact timing matters.
- Callbacks may return a cleanup function; it runs before the next execution and on `destroy()`. Use it to abort requests, remove listeners, etc.
- To stop from inside the callback, use `ctx.destroy()` (the returned handle does not exist yet during an immediate first run).

## Collections and complex values

Signals are not deeply reactive: mutating an object/array stored in a signal does not notify anybody.
Either replace the value immutably:

```ts
const authors = reactive<string[]>([]);
authors.value = [...authors.value, "King"];
```

or use reactive collections:

```ts
import { reactiveArray, reactiveSet, reactiveMap } from "@conterra/reactivity-core";

const array = reactiveArray<number>([1, 2]);
array.push(3);
array.get(0); // no [] operator: use get(i) / set(i, v)
array.getItems(); // tracked snapshot as plain array

const set = reactiveSet<string>();
const map = reactiveMap<string, number>();
```

## Helpers

- `batch(() => { ... })`: group multiple writes so watchers fire once with consistent state. Wrap complex updates in it.
- `untracked(() => ...)`: read signals without becoming a dependency (works in `computed`, `effect`, watch selectors).
- `MaybeReactive<T>` = value | signal | getter function. Accept it in reusable APIs; read the current value with `getReactive(x)`, or turn it into a getter function with `toReactiveGetter(x)`.
- `getValue(x)`: unwraps a signal or returns a plain value.

## Common mistakes

- Don't mutate signal values in place (`list.value.push(x)`); see [Collections and complex values](#collections-and-complex-values).
- Don't expose signals publicly; see [Reactive classes](#reactive-classes).
- Don't lose effect or watch handles: whoever creates an `effect`/`watch` must store the handle and call `destroy()` (e.g. in its own `destroy()` method).

### Don't derive state in an effect

Use `computed` for values derived from other signals.

```ts
// Wrong
effect(() => {
    b.value = a.value * 2;
});

// Right
const b = computed(() => a.value * 2);
```

### Avoid "Cycle detected" errors

An effect that writes one of its own dependencies (`v.value += 1`) throws "Cycle detected". If you really need the current value, read it without tracking via `untracked(() => v.value)` or `v.peek()`.
The same error is thrown when a computed reads its own value during computation.

```ts
// Wrong
effect(() => {
    count.value = count.value + other.value;
});

// Right
effect(() => {
    count.value = count.peek() + other.value;
});
```

### Don't pass async functions to `effect`, `computed` or watch selectors

Only code before the first `await` is tracked. Start the work synchronously and write the result into a signal. The right example also aborts outdated requests in the cleanup function.

```ts
// Wrong
effect(async () => {
    data.value = await load(id.value);
});

// Right
const result = reactive<{ state: "pending" | "done" | "error"; data?: Data }>({ state: "pending" });
watchValue(
    () => id.value,
    (id) => {
        const controller = new AbortController();
        result.value = { state: "pending" };
        load(id, controller.signal).then(
            (data) => {
                if (!controller.signal.aborted) result.value = { state: "done", data };
            },
            () => {
                if (!controller.signal.aborted) result.value = { state: "error" };
            }
        );
        return () => controller.abort();
    },
    { immediate: true }
);
```

### Don't assert right after a write in tests

With the default `dispatch: "async"`, effects and watch callbacks have not run yet right after a write.

```ts
// Wrong
s.value = 1;
expect(spy).toHaveBeenCalled();

// Right
s.value = 1;
await nextTick(); // exported by this package
expect(spy).toHaveBeenCalled();
```

### Don't create effects inside `computed` or other effects

Nested effects are not destroyed automatically when the outer one re-runs. Create them once outside, or destroy them in the outer callback's cleanup function. Never create effects inside `computed`.
