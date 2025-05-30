---
"@conterra/reactivity-events": minor
---

The `emitter()` function now supports two new options: `subscribed` and `unsubscribed`.

- `subscribed()` will be called when the _first_ subscriber subscribes to the event.
  This can be used to initialize the event source lazily.
- `unsubscribed()` will be called when the _last_ subscriber unsubscribes from the event.
  This can be used to clean up resources initialized in `subscribed()`.

Example:

```ts
const mouseMoved = emitter({
    subscribed: () => {
        // Start listening for mouse events
    }),
    unsubscribed: () => {
        // Stop listening for mouse events
    },
});
```
