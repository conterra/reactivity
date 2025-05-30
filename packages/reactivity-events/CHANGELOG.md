# @conterra/reactivity-events

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
        },
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
