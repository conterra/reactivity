# @conterra/reactivity-events

## 0.8.1

### Patch Changes

- 9e04c43: Remove references to `import.meta.env.VITEST` from published code.
- Updated dependencies [9e04c43]
- Updated dependencies [28a36f1]
    - @conterra/reactivity-core@0.8.1

## 0.8.0

### Minor Changes

- 1e3090b: Deprecate `onSync()`.
  Use `on()` with the new `dispatch` option instead.
- 1e3090b: Introduce `dispatch` option to `on()`.
    - `"async"`: callbacks are executed in the next major task (the default, and the existing behavior)
    - `"sync"`: callbacks are executed synchronously (like `onSync` etc.)

    Example:

    ```ts
    import { on } from "@conterra/reactivity-events";

    const eventEmitter = /* ... */;

    on(
        eventEmitter,
        (event) => {
            console.log(`Click at ${event.x}, ${event.y}`);
        },
        {
            dispatch: "sync"
        }
    );
    ```

### Patch Changes

- Updated dependencies [8667eff]
- Updated dependencies [e7690b7]
- Updated dependencies [6ee0459]
- Updated dependencies [7f6e38d]
- Updated dependencies [8667eff]
- Updated dependencies [29fc994]
- Updated dependencies [e7690b7]
    - @conterra/reactivity-core@0.8.0

## 0.7.0

### Minor Changes

- 7b7ed6d: The `emitter()` function now supports two new options: `subscribed` and `unsubscribed`.
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

### Patch Changes

- Updated dependencies [546f3ec]
- Updated dependencies [546f3ec]
- Updated dependencies [e704f30]
    - @conterra/reactivity-core@0.7.0

## 0.6.0

### Patch Changes

- 33a39ab: Correct wrong order of parameters in a description
- Updated dependencies [0baa4f2]
    - @conterra/reactivity-core@0.6.0

## 0.5.0

### Minor Changes

- 0e9bd35: Initial release.

### Patch Changes

- Updated dependencies [0e9bd35]
- Updated dependencies [0e9bd35]
- Updated dependencies [0e9bd35]
- Updated dependencies [0e9bd35]
- Updated dependencies [0e9bd35]
    - @conterra/reactivity-core@0.5.0
