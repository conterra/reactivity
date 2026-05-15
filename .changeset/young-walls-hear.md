---
"@conterra/reactivity-core": minor
---

Remove `syncEffect`, `syncWatch` and `syncWatchValue`.
Use `effect`, `watch` or `watchValue` with option `{ dispatch: "sync" }` instead.
