---
"@conterra/reactivity-events": patch
---

Use `MaybeReactive<T>` for the event source argument of `on` (and `onSync`). The only observable effect is that `ReadonlyReactive<EventSource>` is now also allowed (previoulsy, only writable signals were supported in the type signature).
