---
"@conterra/reactivity-core": minor
---

Introduce `dispatch` option to `effect()`, `watch()` and `watchValue`:

- `"async"`: callbacks are executed in the next major task (the default, and the existing behavior)
- `"sync"`: callbacks are executed synchronously (like `syncEffect` etc.)

Example:

```ts
import { effect, reactive } from "@conterra/reactivity-core";

const signal = reactive(0);

effect(
    () => {
        console.log(signal.value);
    },
    { dispatch: "sync" } // default: "async"
);

signal.value = 1; // effect triggers immediately
```
