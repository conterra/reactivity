# @conterra/reactivity-events [![NPM Version](https://img.shields.io/npm/v/%40conterra%2Freactivity-events)](https://www.npmjs.com/package/@conterra/reactivity-events)

Event support for reactive objects. Based on `@conterra/reactivity-core`.

Click here to visit the [rendered API Documentation](https://conterra.github.io/reactivity/latest/).

## Quick Example

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
```

## Usage

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

Use `emit(emitter, event)` to emit an event.
For example:

```ts
import { emit, emitter } from "@conterra/reactivity-events";

// Emits objects with x and y properties
const clicked = emitter<{ x: number; y: number }>();

// Broadcasts the event to all subscribers of `clicked`
emit(clicked, { x: 10, y: 20 });
```

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

### Sync vs async event callbacks

The events API supports a similar `dispatch` option as `@conterra/reactivity-core` when subscribing via `on()`:

- `"async"` (the default): Callbacks are called asynchronously (in a future task, similar to `setTimeout(cb, 0)`).
  This is usually what you want.
- `"sync"`: Callbacks are called synchronously, immediately after they have been emitted.
  Note that there is a subtle interaction with `batch` (see [Integration with `batch`](#integration-with-batch)).

### Reactive event sources

`on()` support multiple kinds of event source parameters:

- A plain event source (like `view.clicked` in the example above; not reactive).
- A signal holding an event source (reactive).
- A function returning an event source, implemented using signals (reactive).

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

Note that is still a good idea to call `destroy` on the handle returned by `on` if you want to unsubscribe manually before the first event has been emitted.

### Detecting subscribers

When providing an event, you can use the `subscribed` and `unsubscribed` options to detect when your event is actually being used:

- `subscribed()` will be called when the _first_ subscriber subscribes to the event.
  This can be used to initialize the event source lazily.
- `unsubscribed()` will be called when the _last_ subscriber unsubscribes from the event.
  This can be used to clean up resources initialized in `subscribed()`.

Example:

```ts
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
