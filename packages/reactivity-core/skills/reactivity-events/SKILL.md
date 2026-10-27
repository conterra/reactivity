---
name: reactivity-events
description: How to use @conterra/reactivity-events (emitter, emit, on, EventSource, EventEmitter). Use when writing, reviewing or debugging code that imports from "@conterra/reactivity-events", or when designing typed events or notifications in TypeScript code that depends on it.
---

# @conterra/reactivity-events

Typed event emitters for reactive objects, built on `@conterra/reactivity-core`.
For signals, `batch`, `nextTick` etc. see the `reactivity-core` skill.

Full documentation: `node_modules/@conterra/reactivity-events/README.md`.
API docs are in the type declarations (e.g. `node_modules/@conterra/reactivity-events/dist/index.d.ts` from the importing package).

## When to use

- Events are for things that _happen_ (clicks, messages, "saved", "closed"), where every occurrence matters and there is no current value to read.
- State that can be read at any time belongs in signals (`@conterra/reactivity-core`); consumers can `watch` it.
- Don't model events as a boolean signal flipped back and forth: signal changes coalesce, so occurrences get lost.
- Prefer `emitter` + `EventSource` over hand-written listener lists or untyped event emitters in classes and services.

## Basics

```ts
import { emit, emitter, on } from "@conterra/reactivity-events";

const clicked = emitter<{ x: number; y: number }>(); // EventEmitter<T>
const closed = emitter(); // T defaults to void: emit(closed) without argument

const handle = on(clicked, (event) => {
    console.log(event.x, event.y);
});

emit(clicked, { x: 10, y: 20 });
emit(closed);

// Always destroy when no longer needed, otherwise the subscription leaks.
handle.destroy();
```

## Events on classes

Expose events as `EventSource<T>` in public interfaces so consumers can only subscribe.
Keep the `EventEmitter<T>` in the implementation to emit.
This is a compile time restriction only; at runtime both are the same object.

```ts
import { emit, emitter, type EventSource } from "@conterra/reactivity-events";

interface ViewApi {
    readonly clicked: EventSource<ClickEvent>;
}

class ViewImpl implements ViewApi {
    readonly clicked = emitter<ClickEvent>();

    handleClick(x: number, y: number) {
        emit(this.clicked, { x, y });
    }
}
```

## Subscribe options

`on(source, callback, { once, dispatch })`:

- `once: true`: unsubscribe automatically after the first event. Still destroy the handle if you may need to unsubscribe earlier. Useful to tie cleanup to another object's lifetime: `on(other.destroyed, cleanup, { once: true })`.
- `dispatch: "async"` (default): callbacks run in a later task (like `setTimeout(cb, 0)`).
- `dispatch: "sync"`: callbacks run immediately during `emit`, or, inside `batch()`, after the outermost batch completes.
- Do not use the deprecated `onSync`; use `on(..., { dispatch: "sync" })`.

## Reactive event sources

`source` may be a plain event source, a signal holding one, or a getter function reading signals.
`on` then always stays subscribed to the _current_ source and unsubscribes from the previous one automatically:

```ts
const currentLogger = reactive(logger1);
const handle = on(
    () => currentLogger.value.onMessage,
    (message) => console.log(message)
);
currentLogger.value = logger2; // now subscribed to logger2 only
```

## Lazy setup

Use `subscribed` / `unsubscribed` to start and stop underlying resources only while somebody listens:

```ts
const mouseMoved = emitter<MouseEvent>({
    subscribed: () => {
        /* first subscriber: start listening */
    },
    unsubscribed: () => {
        /* last subscriber gone: stop listening */
    }
});
```

## Common mistakes

- Don't lose the handle returned by `on`: whoever subscribes must call `destroy()` (e.g. in its own `destroy()` method).
- Don't expose `EventEmitter<T>` in public APIs; use `EventSource<T>` (see [Events on classes](#events-on-classes)).

### Don't assert right after `emit` in tests

With the default `dispatch: "async"`, callbacks have not run yet right after `emit`.

```ts
// Wrong
emit(clicked, { x: 1, y: 2 });
expect(spy).toHaveBeenCalled();

// Okay
emit(clicked, { x: 1, y: 2 });
await nextTick(); // from @conterra/reactivity-core
expect(spy).toHaveBeenCalled();

// Better: independent of timing
import { vi } from "vitest";
emit(clicked, { x: 1, y: 2 });
await vi.waitFor(() => expect(spy).toHaveBeenCalled());
```
