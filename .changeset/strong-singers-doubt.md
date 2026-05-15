---
"@conterra/reactivity-core": patch
---

Implement new `constant` signal.

Constant signals are created with a fixed value that never changes.
In addition, they implement the `ReadonlyReactive` interface.

```ts
const foo = constant(3);
console.log(foo.value); // 3
foo.value = 4; // TypeScript error and runtime error
```
