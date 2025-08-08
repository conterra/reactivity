---
"@conterra/reactivity-events": minor
---

Introduce `dispatch` option to `on()`.

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
