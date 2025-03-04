# @conterra/reactivity-events ![NPM Version](https://img.shields.io/npm/v/%40conterra%2Freactivity-events)

Event support for reactive objects. Based on `@conterra/reactivity-core`.

Click here to visit the [rendered API Documentation](https://conterra.github.io/reactivity/latest/).

## Quick Example

```ts
import { emit, EVENT_TYPES, on } from "@conterra/reactivity-events";

interface ClickEvent {
    x: number;
    y: number;
}

class View {
    // Declare event types (only needed for TypeScript support)
    declare [EVENT_TYPES]: {
        click: ClickEvent;
    };
}

const view = new View();

// Subscribe to event
on(view, "click", (event) => {
    console.log("on click", event.x, event.y);
});

// Emit event
emit(view, "click", { x: 10, y: 20 });
```

## Usage

Events can be emitted and subscribed to on any (non-primitive) JavaScript object using the functions `emit` and `on`/`onSync`.

Use `emit(eventSource, eventName, eventObject)` to emit an event.
For example:

```ts
import { emit } from "@conterra/reactivity-events";

// in a class
emit(this, "click", { x: 10, y: 20 });

// or on some object
emit(view, "click", { x: 10, y: 20 });
```

Use `on(eventSource, eventName, callback)` (or `onSync`) to subscribe to an event:

```ts
const handle = on(view, "click", (event) => {
    console.log("on click", event.x, event.y);
});

// Later, to unsubscribe:
handle.destroy();
```

### Sync vs async events

Similar to `watch` / `watchSync` in `@conterra/reactivity-core`, there are two versions of the `on` function: `on` and `onSync`:

- `on`: Callbacks are called asynchronously (in a future task, similar to `setTimeout(0, cb)`). This is usually what you want.
- `onSync`: Callbacks are called synchronously, immediately after they have been emitted.
  Note that there is a subtle interaction with `batch` (see [Integration with `batch`](#integration-with-batch)).

### Reactive event sources

`on` and `onSync` support multiple kinds of event source parameters:

- A plain object (like `view` in the example above).
- A signal.
- A function returning an event source, implemented using signals.

In the following examples, the signal `currentEventEmitter` points to the active event emitter (either `emitter1` or `emitter2`).
The subscription configured by `on` automatically switches between the two emitters whenever the signal changes.
In other words, it always stays subscribed to the current one.

```ts
import { nextTick, reactive } from "@conterra/reactivity-core";
import { emit, EVENT_TYPES, on } from "@conterra/reactivity-events";

class EventEmitter {
    declare [EVENT_TYPES]: {
        "message": string;
    };
}

const emitter1 = new EventEmitter();
const emitter2 = new EventEmitter();
const currentEventEmitter = reactive(emitter1);

// Stays subscribed to the current emitter, even if it changes.
on(
    () => currentEventEmitter.value,
    "message",
    (message) => console.log("on message:", message)
);
emit(emitter1, "message", "Message to emitter 1");

// Wait for event listener to be called (just for illustration).
await nextTick();

// Signal changes, `on` automatically unsubscribes from emitter1 and subscribes to emitter2.
currentEventEmitter.value = emitter2;
emit(emitter2, "message", "Message to emitter 2");
```

### One-off event listeners

Configuring `once: true` within a subscription will automatically unsubscribe the listener after the first event has been emitted:

```ts
import { emit, EVENT_TYPES, on } from "@conterra/reactivity-events";

class EventEmitter {
    declare [EVENT_TYPES]: {
        "click": void;
    };
}

const emitter = new EventEmitter();
on(emitter, "click", () => console.log("on click"), { once: true });
emit(emitter, "click");
emit(emitter, "click");
// Outputs: on click (once)
```

Note that is still a good idea to call `destroy` on the handle returned by `on` if you want to unsubscribe manually before the first event has been emitted.

### TypeScript integration

We use the `EVENT_TYPES` symbol to declare the events supported by a class or interface.
This declaration tells the compiler which events are supported by an object:

```ts
import { EVENT_TYPES } from "@conterra/reactivity-events";

interface ClickEvent {
    // ...
}

interface MoveEvent {
    // ...
}

class View {
    declare [EVENT_TYPES]: {
        click: ClickEvent; // Declares event name `click` with event object type `ClickEvent`
        move: MoveEvent;
        destroyed: void; // Event without payload
    };
}
```

The type map `[EVENT_TYPES]` is used by this package to typecheck event subscriptions and emissions.
This ensures that you only use events that are actually declared and that the event object type emitted by the event matches the declaration.

The event types will only be interpreted at compile time, so it is fine to never actually initialize them at runtime (effectively the `declare` statement lies to the compiler).

The same approach works for interface declarations as well:

```ts
import { emit, EVENT_TYPES, on } from "@conterra/reactivity-events";

interface ClickEvent {
    x: number;
    y: number;
}

// Public interface
interface ViewApi {
    [EVENT_TYPES]?: {
        click: ClickEvent;
    };
}

// Private implementation (may provide additional methods or internal events)
class ViewImpl implements ViewApi {
    // This repetition is (unfortunately) necessary to avoid typescript errors
    // when using the implementation class instead of the interface.
    declare [EVENT_TYPES]: ViewApi[typeof EVENT_TYPES];
}

const impl = new ViewImpl(); // internal view
const view: ViewApi = impl; // public view

// Subscribe to event
on(view, "click", (event) => {
    console.log("on click", event.x, event.y);
});

// Emit event
emit(impl, "click", { x: 10, y: 20 });
```

You can also use the `EventSource` interface:

```ts
import { EventSource } from "@conterra/reactivity-events";

interface ClickEvent {
    x: number;
    y: number;
}

interface ViewEvents {
    click: ClickEvent;
}

interface ViewApi extends EventSource<ClickEvent> {
    someMethod(): void;
}
```

### Private events

Event names can be either strings (the usual case) or symbols.
Private events can be implemented by using symbols that are not exported from your module:

```ts
import { emit, EVENT_TYPES, on } from "@conterra/reactivity-events";

const PRIVATE_EVENT = Symbol("private-event");

class EventEmitter {
    declare [EVENT_TYPES]: {
        [PRIVATE_EVENT]: string;
    };
}

const emitter = new EventEmitter();
on(emitter, PRIVATE_EVENT, (message) => console.log("on private event:", message));
emit(emitter, PRIVATE_EVENT, "test");
```

Because `PRIVATE_EVENT` is not exported, third parties cannot subscribe to this event.

### Integration with `batch`

The `batch()` function from `@conterra/reactivity-core` can be used to group reactive changes to one or more signals, comparable to a transaction.
Effects or watches are not run executed until the batch completes.
This prevents intermediate states (which may be inconsistent) from being observed by other parts of the application.

Event handling works the same way: even when `onSync` is used, event handlers are not running _immediately_, but only after the batch completes.

For example:

```ts
import { batch, reactive } from "@conterra/reactivity-core";
import { emit, EVENT_TYPES, onSync } from "@conterra/reactivity-events";

class EventEmitter {
    declare [EVENT_TYPES]: {
        "changed": void;
    };

    a = reactive(0);
    b = reactive(1);

    // TODO: Remove `this` type workaround
    changeValues(this: EventEmitter) {
        batch(() => {
            console.debug("batch start");

            // Values are changed together.
            this.a.value += 1;
            emit(this, "changed"); // Callbacks are _not_ running here
            this.b.value += 1;

            console.debug("batch end");
        }); // Callbacks are running here
    }
}

const emitter = new EventEmitter();
onSync(emitter, "changed", () => {
    console.log("on change");
});
emitter.changeValues();
// Output:
// batch start
// batch end
// on change
```

Try removing the `batch` call to see the difference.
