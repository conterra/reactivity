---
"@conterra/reactivity-core": patch
---

Optimize change tracking in reactive collections.

Maps, sets and arrays now support fine grained changes for keys that are _not_ in the collection.
Previously, one would receive a change if _any_ key was added or removed.
Now, the collection will only emit changes for the keys that are actually involved.
