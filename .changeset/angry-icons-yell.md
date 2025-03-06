---
"@conterra/reactivity-core": patch
---

Relax type signature of `watch` and `syncWatch`: the array of values is no longer `readonly` (but it still must not be modified at runtime).
