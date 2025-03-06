---
"@conterra/reactivity-core": minor
---

Use `Object.is` instead of `===` for cleaner comparisons (e.g. around NaN).

Note that this does not resolve all issues around NaN: a computed signal returning `NaN` will still be considered a change.
This is due to the underlying implementation in `@preact/signals-core`, which compares values using `===`.
