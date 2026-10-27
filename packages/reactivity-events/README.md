# @conterra/reactivity-events [![NPM Version](https://img.shields.io/npm/v/%40conterra%2Freactivity-events)](https://www.npmjs.com/package/@conterra/reactivity-events)

Event support for reactive objects. Based on `@conterra/reactivity-core`.

- [Rendered API documentation](https://conterra.github.io/reactivity/latest/)
- Source code and issues: [github.com/conterra/reactivity](https://github.com/conterra/reactivity)

## Installation

With [pnpm](https://pnpm.io/) installed, run

```sh
pnpm add @conterra/reactivity-events
```

## Quick example

```ts
import { emit, emitter, on } from "@conterra/reactivity-events";

interface ClickEvent {
    x: number;
    y: number;
}

class View {
    readonly clicked = emitter<ClickEvent>();
}

const view = new View();

// Subscribe to the click event
on(view.clicked, (event) => {
    console.log(`Click at ${event.x}, ${event.y}`);
});

// Emit the click event, calling all subscribers
emit(view.clicked, { x: 10, y: 20 });
// prints "Click at 10, 20" (asynchronously, see "Timing and batching")
```

For more details, see [Core concepts](#core-concepts).

## Why?

Many things in an application simply _happen_: a button is clicked, a message arrives, a job finishes.
Objects need a way to announce these moments, and other parts of the application need a way to react to them.

This package provides small, type-safe event emitters for that purpose.
Each event is a property of the object that emits it, so its type is checked by TypeScript and easy to discover.
Subscriptions are explicit and can be removed with a single `destroy()` call.
Event emitters are not tied to any UI framework.

The package builds on `@conterra/reactivity-core`, so events also work well with signals (see [Reactive event sources](#reactive-event-sources) and [Integration with `batch`](#integration-with-batch)).

## Core concepts

### Creating emitters

Use `emitter()` to create an event emitter.
Event emitters can be used to emit events (using `emit()`) and to subscribe to them (using `on()`).

Example:

```ts
import { emitter } from "@conterra/reactivity-events";

// Emits numbers
const e1 = emitter<number>();

// Emits objects with x and y properties
const e2 = emitter<{ x: number; y: number }>();

// Emits nothing (void)
const e3 = emitter();
```

### Emitting events

Use `emit(emitter, event)` to emit an event.
For example:

```ts
import { emit, emitter } from "@conterra/reactivity-events";

// Emits objects with x and y properties
const clicked = emitter<{ x: number; y: number }>();

// Broadcasts the event to all subscribers of `clicked`
emit(clicked, { x: 10, y: 20 });
```

For `void` emitters, the event argument is omitted: `emit(e3)`.

### Subscribing and cleanup

Use `on(emitter, callback)` to subscribe to events:

```ts
import { emitter, on } from "@conterra/reactivity-events";

const clicked = emitter<{ x: number; y: number }>();

// Callback will be invoked whenever the event is emitted
const handle = on(clicked, (event) => {
    console.log("Clicked at", event.x, event.y);
});

// Use the handle to unsubscribe from the event when no longer needed
handle.destroy();
```

A subscription that is not destroyed stays active (possibly forever), which may lead to memory leaks and unintended side effects.

## Advanced usage

### Reactive event sources

`on()` supports multiple kinds of event source parameters:

- A plain event source (like `view.clicked` in the example above; not reactive).
- A signal holding a reactive event source.
- A function returning an event source, implemented using signals.

In the following examples, the signal `currentLogger` points to the active logger object (either `logger1` or `logger2`).
The subscription configured by `on` automatically switches between the two loggers whenever the signal changes.
In other words, it always stays subscribed to the current one.

```ts
import { nextTick, reactive } from "@conterra/reactivity-core";
import { emit, emitter, on } from "@conterra/reactivity-events";

class Logger {
    onMessage = emitter<string>();
}

const logger1 = new Logger();
const logger2 = new Logger();
const currentLogger = reactive(logger1);

// Stays subscribed to the current logger, even if it changes.
on(
    () => currentLogger.value.onMessage,
    (message) => console.log("on message:", message)
);
emit(logger1.onMessage, "Message to logger 1");

// Wait for event listener to be called (just for illustration).
await nextTick();

// Signal changes, `on` automatically unsubscribes from logger1 and subscribes to logger2.
currentLogger.value = logger2;
emit(logger2.onMessage, "Message to logger 2");

// Output:
// on message: Message to logger 1
// on message: Message to logger 2
```

### One-off event listeners

Configuring `once: true` within a subscription will automatically unsubscribe after the first event has been emitted:

```ts
import { emit, emitter, on } from "@conterra/reactivity-events";

const clicked = emitter();

on(clicked, () => console.log("clicked"), { once: true });
emit(clicked);
emit(clicked);
// Output: clicked (only once)
```

Note that it is still a good idea to call `destroy` on the handle returned by `on` if you want to unsubscribe manually before the first event has been emitted.

### Detecting subscribers

When providing an event, you can use the `subscribed` and `unsubscribed` options to detect when your event is actually being used:

- `subscribed()` will be called when the _first_ subscriber subscribes to the event.
  This can be used to initialize the event source lazily.
- `unsubscribed()` will be called when the _last_ subscriber unsubscribes from the event.
  This can be used to clean up resources initialized in `subscribed()`.

Example:

```ts
import { emitter } from "@conterra/reactivity-events";

const mouseMoved = emitter({
    subscribed: () => {
        // Start listening for mouse events
    },
    unsubscribed: () => {
        // Stop listening for mouse events
    }
});
```

### TypeScript support

This package provides two important TypeScript types:

- `EventEmitter<T>`.
  The return type of `emitter<T>`.
  This type supports both emitting and subscribing to events.
- `EventSource<T>`.
  This type allows only subscribing to events.
  This is useful for public interfaces where users are not supposed to emit events themselves.

Note that the restrictions imposed by `EventSource<T>` are a compile time feature only:
at runtime, both interfaces are represented by the same object.

The following example demonstrates the use of `EventSource` to separate the public interface from the implementation:

```ts
import { emit, emitter, on, EventSource } from "@conterra/reactivity-events";

interface ClickEvent {
    x: number;
    y: number;
}

// Public interface
interface ViewApi {
    readonly clicked: EventSource<ClickEvent>;
}

// Private implementation
class ViewImpl implements ViewApi {
    clicked = emitter<ClickEvent>();
}

const viewImpl = new ViewImpl();
const viewApi: ViewApi = viewImpl;
on(viewApi.clicked, (event) => console.log("Clicked at", event.x, event.y));

emit(viewImpl.clicked, { x: 1, y: 2 });

// would be a TypeScript error:
// emit(viewApi.clicked, { x: 3, y: 4 });
```

## Timing and batching

### Sync vs async event callbacks

The events API supports a similar `dispatch` option as `@conterra/reactivity-core` when subscribing via `on()`:

- `"async"` (the default): Callbacks are called asynchronously (in a future task, similar to `setTimeout(cb, 0)`).
  This is usually what you want.
- `"sync"`: Callbacks are called synchronously, immediately after they have been emitted.
  Note that there is a subtle interaction with `batch` (see [Integration with `batch`](#integration-with-batch)).

```ts
import { emit, emitter, on } from "@conterra/reactivity-events";

const clicked = emitter();
on(clicked, () => console.log("async callback"));
on(clicked, () => console.log("sync callback"), { dispatch: "sync" });

emit(clicked);
console.log("after emit");

// Output:
// sync callback
// after emit
// async callback
```

To wait for pending async callbacks (e.g. in tests), use `await nextTick()` from `@conterra/reactivity-core`.

### Integration with `batch`

The `batch()` function from `@conterra/reactivity-core` can be used to group reactive changes to one or more signals, comparable to a transaction.
Effects or watches are not executed until the batch completes.
This prevents intermediate states (which may be inconsistent) from being observed by other parts of the application.

Event handling works the same way: even when `on()` is used with `dispatch: "sync"`, event handlers are not running _immediately_, but only after the batch completes.
This prevents event handlers from observing intermediate states as well.

For example:

```ts
import { batch, reactive } from "@conterra/reactivity-core";
import { emit, emitter, on } from "@conterra/reactivity-events";

class Foo {
    changed = emitter();

    a = reactive(0);
    b = reactive(1);

    changeValues() {
        batch(() => {
            console.debug("batch start");

            // Values are changed together.
            this.a.value += 1;
            emit(this.changed); // Callbacks are _not_ running here
            this.b.value += 1;

            console.debug("batch end");
        }); // Callbacks are running here
    }
}

const foo = new Foo();
on(
    foo.changed,
    () => {
        console.log("on change");
    },
    { dispatch: "sync" }
);
foo.changeValues();
// Output:
// batch start
// batch end
// on change
```

Try removing the `batch` call to see the difference.

## API overview

All functions are exported from the package root (`@conterra/reactivity-events`).
See the [API documentation](https://conterra.github.io/reactivity/latest/) or the type declarations for full signatures.

### Functions

| Export                       | Purpose                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `emitter<T>(opts?)`          | Creates an `EventEmitter<T>` (`T` defaults to `void`). See [Creating emitters](#creating-emitters).                                                  |
| `emit(emitter, event?)`      | Emits an event to all subscribers. The event argument is omitted for `void` emitters. See [Emitting events](#emitting-events).                       |
| `on(source, callback, opts)` | Subscribes to events; returns a `CleanupHandle`. `source` may be reactive. Options: `once`, `dispatch`. See [Subscribing](#subscribing-and-cleanup). |

### Types

| Type                | Purpose                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| `EventEmitter<T>`   | Event channel that supports emitting and subscribing.                                 |
| `EventSource<T>`    | Subscribe-only view of an `EventEmitter<T>`, for public interfaces.                   |
| `EmitterOptions<T>` | Options for `emitter()`: `subscribed`, `unsubscribed`.                                |
| `SubscribeOptions`  | Options for `on()`: `once`, `dispatch`.                                               |
| `DispatchType`      | `"async"` (default) or `"sync"`. See [Sync vs async](#sync-vs-async-event-callbacks). |
| `EventCallback<T>`  | Signature of an event listener callback.                                              |
| `EventArgs<T>`      | Arguments for `emit()` / callbacks: `[event: T]`, or `[]` for `void` events.          |

## Agent skills

An agent skill for this library (`reactivity-events`) is shipped with `@conterra/reactivity-core` (in `skills/reactivity-events`).
With pnpm >= 12.11, add `@conterra/reactivity-core` as a direct dependency and approve its skills to have it linked automatically.
See the [pnpm documentation](https://pnpm.io/agent-skills) and the [`@conterra/reactivity-core` README](https://github.com/conterra/reactivity/tree/main/packages/reactivity-core#agent-skills).

## License

Apache-2.0 (see `LICENSE` file)
