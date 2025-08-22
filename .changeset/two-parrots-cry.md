---
"@conterra/reactivity-core": minor
---

Change implementation of `synchronized` signals.

When a synchronized signal is being accessed without it currently being watched,
the package will now briefly subscribe to that signal's source to be notified about changes.
The current value is now being cached more aggressively while the underlying data source does _not_ report any changes.
