---
"@conterra/reactivity-core": patch
---

Reimplement `synchronized()` based on preact signal's watched/unwatched callbacks instead of patching the signal's internals.
