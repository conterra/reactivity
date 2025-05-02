---
"@conterra/reactivity-core": minor
---

Implement `linked` signals.

Linked signals are derived from a _source_, but may change freely while _source_ remains the same.

**Example:**

```ts
import { reactive, linked } from "@conterra/reactivity-core";

const options = reactive(["a", "b", "c"]);
const currentOption = linked(() => options.value[0]); // default to first item

console.log(currentOption.value); // "a"

currentOption.value = "b";
console.log(currentOption.value); // "b"

options.value = ["x", "y", "z"];
console.log(currentOption.value); // reset to "x"
```

For more information, see the new section in `README.md`.
