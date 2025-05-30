---
"@conterra/reactivity-core": minor
---

Add two new options to all signal types: `watched` and `unwatched`.

- `watched()` is called when the _first_ watcher starts watching the signal.
  This can be used, for example, to setup some background task.
- `unwatched()` is called when the _last_ watcher stops watching the signal.
  This can be used to clean up any resources created in `watched()`.

Example:

```ts
const signal = reactive(123, {
    watched: () => {
        console.log("Signal is now being watched");
    },
    unwatched: () => {
        console.log("Signal is no longer being watched");
    }
});
```
