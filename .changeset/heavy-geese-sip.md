---
"@conterra/reactivity-core": patch
---

Introduce `ReactiveGetter<T>` type to mark functions used to compute reactive values.
This is used in the signatures of `computed` and `*watch*`.
`ReactiveGetter<T>` is a simple type alias for `() => T`.
