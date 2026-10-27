# @conterra/reactivity-core [![NPM Version](https://img.shields.io/npm/v/%40conterra%2Freactivity-core)](https://www.npmjs.com/package/@conterra/reactivity-core)

A UI framework independent reactivity library, based on signals, that supports all kinds of values.

- [Rendered API documentation](https://conterra.github.io/reactivity/latest/)
- Source code and issues: [github.com/conterra/reactivity](https://github.com/conterra/reactivity)

## Installation

With [pnpm](https://pnpm.io/) installed, run

```sh
pnpm add @conterra/reactivity-core
```

## Quick example

```ts
import { reactive, computed, watchValue } from "@conterra/reactivity-core";

const firstName = reactive("John");
const lastName = reactive("Doe");
const fullName = computed(() => `${firstName.value} ${lastName.value}`);

watchValue(
    () => fullName.value,
    (fullName) => {
        console.log(fullName);
    },
    { immediate: true }
);
// prints "John Doe"

firstName.value = "Jane";
// prints "Jane Doe" (asynchronously, see "Timing and batching")
```

For more details, see [Core concepts](#core-concepts).

## Why?

One of the most important responsibilities of an application is to accurately present the current state of the system.
Such an application has to:

1. Fetch the _current_ state and present it to the user.
2. Subscribe to state changes:
    - On change, go to 1.

While step 1 is rather trivial, step 2 contains lots of complexity in practice, especially if many different sources of state (e.g. objects) are involved.

Many frameworks have found different solutions for keeping the UI synchronized with the application's state (e.g. React, Vue, Flux architecture, store libraries such as Zustand/VueX/Pinia, etc.).
These solutions often come with trade-offs:

- They are often tied to a UI framework (e.g. React).
- They may impose unusual programming paradigms (e.g. a centralized store instead of a graph of objects) that may be difficult to integrate with technologies like TypeScript.
- They may only support reactivity for _some_ objects.
  For example, Vue's reactivity system is based on wrapping objects with proxies; this is incompatible with some legitimate objects - a fact that can be both surprising and difficult to debug.
- They may only support reactivity _locally_.
  For example, a store library may support reactivity _within_ a single store, but referring to values from multiple stores may be difficult.

This library implements a different set of trade-offs, based on [signals](https://github.com/preactjs/signals):

- It is not tied to any UI technology.
  It can be used with any UI framework, with none, or with multiple UI frameworks at the same time.
- All kinds of values are supported.
  Updating the value in a reactive "box" notifies all interested parties (such as effects, watchers or computed signals).
  However, values are not _deeply_ reactive: when authoring a class, use the reactive primitives or collections provided by this package.
- State can be kept in objects and classes (this pairs nicely with TypeScript).
  The state rendered by the user interface can be gathered from an arbitrary set of objects.

## Core concepts

Signals are reactive "boxes" that contain a value that may change at any time.
They can be watched for changes, for example by registering a callback using `watch()`.
Signals can be composed via _computed_ signals, whose values are derived from other signals and are automatically kept up to date.
They can also be used in classes (or plain objects) to organize state by concern or privacy.

### Signals

`reactive<T>()` creates the most basic kind of signal.
The following snippet creates a signal `r` that initially holds the value `"foo"`:

```ts
import { reactive } from "@conterra/reactivity-core";

const r = reactive("foo");
console.log(r.value); // prints "foo"

r.value = "bar";
console.log(r.value); // prints "bar"
```

Read the current value through the `.value` property.
If the signal is writable (as signals returned by `reactive<T>()` are), assign to `.value` to update it.
Whenever the value of a signal changes, all watchers (parties interested in the current value) are notified automatically.

### Computed signals

`computed()` derives a value from other signals.
It takes a callback function that may read any number of signals and returns a value.
The following example creates a computed signal that always returns twice the original `age`:

```ts
import { reactive, computed } from "@conterra/reactivity-core";

const age = reactive(21);
const doubleAge = computed(() => age.value * 2);

console.log(doubleAge.value); // prints 42
age.value = 22;
console.log(doubleAge.value); // prints 44
```

Computed signals only re-compute their value when any of their dependencies have changed.
For as long as nothing has changed, the current value is cached.
This makes even complex computed signals very efficient.

The callback of a computed signal should be free of side effects:
it computes a value (possibly very often), and it should not change the state of the application while doing so.

> NOTE: Not every _derived_ value needs to be a `computed`. Sometimes a _getter_ is sufficient.
> See [MaybeReactive](#maybereactive).

### Effects

`effect()` runs code whenever the signals it uses change:

```ts
import { reactive, effect } from "@conterra/reactivity-core";

const r = reactive("foo");

// Effect callback is executed once immediately; prints "foo"
effect(() => {
    // This access to `r.value` is tracked by the effect.
    // When the signal's value changes, the effect is executed again.
    console.log(r.value);
});

// Triggers another execution of the effect; prints "bar"
r.value = "bar";
```

`effect(callback)` works like this:

- It executes `callback` immediately (synchronously).
- During the execution, it tracks all signals whose values were read by `callback`.
  This also works indirectly, for example when calling functions which internally use signals.
- When _any_ of those signals change, the effect re-executes `callback` (asynchronously by default, see [Async vs. sync dispatch](#async-vs-sync-dispatch)) and tracks dependencies again.
- This continues until the effect is destroyed (see [Cleanup](#cleanup)).

Computed signals can be used in effects like any other signal:

```ts
import { reactive, computed, effect } from "@conterra/reactivity-core";

const age = reactive(21);
const doubleAge = computed(() => age.value * 2);

// prints 42
effect(() => {
    console.log(doubleAge.value);
});

// re-executes effect, which prints 44
age.value = 22;
```

### Watch

`watchValue()` gives fine grained control over _what_ is observed:

```ts
import { reactive, watchValue } from "@conterra/reactivity-core";

const r1 = reactive(0);
const r2 = reactive(1);
const r3 = reactive(2);

watchValue(
    // (1)
    () => {
        const sum = r1.value + r2.value + r3.value;
        return sum;
    },
    // (2)
    (sum) => {
        console.log(sum);
    },
    // (3)
    { immediate: true }
);
```

`watchValue()` takes two functions and an optional options object:

- **(1)** The _selector_ function.
  Its signal reads are tracked (like in `effect()`).
  It must return the value you want to watch and should not have side effects.
- **(2)** The _callback_ function.
  It is called whenever the selector returns a different value, and it receives that value as its first argument.
  The callback itself is _not_ tracked and may trigger arbitrary side effects.
- **(3)** Options. By default, the callback is only invoked after the watched value changed at least once.
  With `immediate: true`, the callback also runs for the initial value.
  The `dispatch` option controls when the callback runs, see [Async vs. sync dispatch](#async-vs-sync-dispatch).

In this example, the callback only runs when the computed sum actually changed.

`watch()` works the same way, but its selector returns an array of values which is compared shallowly.
This makes it easy to watch multiple values at once:

```ts
import { reactive, watch } from "@conterra/reactivity-core";

const a = reactive(1);
const b = reactive(2);

watch(
    () => [a.value, b.value],
    ([a, b]) => {
        console.log(a, b);
    }
);
```

Both `watch()` and `watchValue()` accept a custom `equal` option (see [Complex values and custom equality](#complex-values-and-custom-equality)).

#### Accessing previous values

The callback receives the previous value as its second argument:

```ts
import { reactive, watchValue } from "@conterra/reactivity-core";

const counter = reactive(0);
watchValue(
    () => counter.value,
    (count, oldCount) => {
        console.log(count, oldCount);
    }
);

counter.value += 1;
// prints 1 0
```

With `immediate: true`, the previous value is `undefined` during the first execution (there is no previous value).

### Effect vs. watch

`effect()` is simpler, but runs whenever _any_ signal it read changed:

```ts
import { reactive, effect } from "@conterra/reactivity-core";

const r1 = reactive(0);
const r2 = reactive(1);
const r3 = reactive(2);

// Runs whenever _any_ of the signals changed,
// even if the sum turns out to be the same.
effect(() => {
    const sum = r1.value + r2.value + r3.value;
    console.log(sum);
});
```

In complex effect callbacks it can be difficult to control which signals are ultimately used, so the effect may run more often than intended.
Use `watchValue()` or `watch()` in that case.

| Function       | Kind of values                                     | Callback condition                               |
| -------------- | -------------------------------------------------- | ------------------------------------------------ |
| `effect()`     | N/A                                                | After _any_ used signal changes.                 |
| `watchValue()` | Single value (compared with `Object.is`).          | After the watched value changed.                 |
| `watch()`      | Multiple values (via array with shallow equality). | After one or more of the watched values changed. |

`watchValue()` and `watch()` are almost identical: only their default `equal` function differs.
All three run their callbacks asynchronously by default; see [Async vs. sync dispatch](#async-vs-sync-dispatch).

### Cleanup

#### Destroying effects and watches

`effect()`, `watch()` and `watchValue()` return a `CleanupHandle`:

```ts
import { effect, watch } from "@conterra/reactivity-core";

const h1 = effect(() => {
    /* ... */
});
const h2 = watch(
    () => [/* ... */],
    () => {
        /* ... */
    }
);

// When you are no longer interested in changes:
h1.destroy();
h2.destroy();
```

A watcher that is not destroyed keeps executing (possibly forever).
This leads to unintended side effects, unnecessary memory consumption and wasted computation.

#### Returning cleanup functions

Effect and watch callbacks may return a function.
It is invoked before the callback runs again, and when the effect / watch is destroyed.
Use it to undo or cancel an action started by your callback.

The following example fetches user details whenever the user id changes:

```ts
import { reactive, effect, watchValue } from "@conterra/reactivity-core";

const userId = reactive("test-1");

// Fetch user details whenever the user id changes.
// The cleanup function cancels the previous job if it's still running.
effect(() => {
    const controller = new AbortController();
    const id = userId.value;
    fetchUserDetails(id, controller.signal);
    return () => {
        controller.abort();
    };
});

// Same thing, using watchValue():
watchValue(
    () => userId.value,
    (id) => {
        const controller = new AbortController();
        fetchUserDetails(id, controller.signal);
        return () => {
            controller.abort();
        };
    },
    { immediate: true }
);

// Trigger watch and effect
userId.value = "test-2";

async function fetchUserDetails(id: string, signal: AbortSignal): Promise<void> {
    // ... would do a network request
    console.log("fetch user", id);
}
```

#### Self-destructing effects or watches

Effect callbacks (first argument) and watch callbacks (third argument) receive a `ctx` object.
`ctx.destroy()` destroys the effect / watch from within its own callback.
This is useful to wait for a condition and stop afterwards:

```ts
import { reactive, ReadonlyReactive, watchValue } from "@conterra/reactivity-core";

// Waits for the signal to be at least 2.
function waitForTwo(signal: ReadonlyReactive<number>): Promise<void> {
    return new Promise((resolve) => {
        const handle = watchValue(
            () => signal.value,
            (value, _oldValue, ctx) => {
                console.log("intermediate value", value);

                // resolve the promise when the condition is met
                if (value >= 2) {
                    // may result in error: handle.destroy();
                    // this always works:
                    ctx.destroy();
                    resolve();
                }
            },
            {
                // run immediately to check the initial value as well
                immediate: true
            }
        );
    });
}

const signal = reactive(0);
waitForTwo(signal).then(() => {
    console.log("done");
});

setTimeout(() => {
    signal.value += 1;
    setTimeout(() => {
        signal.value += 1;
        setTimeout(() => {
            // 3 is not printed by the watch callback since it has been destroyed
            signal.value += 1;
        }, 250);
    }, 250);
}, 250);

// prints:
// intermediate value 0
// intermediate value 1
// intermediate value 2
// done
```

Calling `handle.destroy()` here would be a subtle bug: with `immediate: true`, the callback first runs _inside_ `watchValue()`, before `handle` has been assigned.
`ctx.destroy()` always works.

## Advanced usage

### Reactive objects and classes

Use signals in classes (or plain objects) to implement reactive objects:

```ts
import { reactive } from "@conterra/reactivity-core";

class Person {
    // Could be private or public
    _name = reactive("");

    get name() {
        return this._name.value;
    }

    set name(value) {
        // Reactive write -> watchers that used the `name` getter are notified.
        // This setter (which could also be a normal method) can enforce preconditions.
        this._name.value = value;
    }
}
```

Instances of `Person` are reactive, since their state is stored in signals:

```ts
import { effect } from "@conterra/reactivity-core";

// Person class from previous example
const p = new Person();
p.name = "E. Example";

// prints "E. Example"
effect(() => {
    console.log(p.name);
});

// Triggers effect again; prints "T. Test"
p.name = "T. Test";
```

Classes can also expose computed values or accessor methods:

```ts
import { reactive, computed } from "@conterra/reactivity-core";

// First name and last name can only be written to.
// Only the combined full name is available to users of the class.
class Person {
    _firstName = reactive("John");
    _lastName = reactive("Doe");
    _fullName = computed(() => `${this._firstName.value} ${this._lastName.value}`);

    setFirstName(name: string) {
        this._firstName.value = name;
    }

    setLastName(name: string) {
        this._lastName.value = name;
    }

    getFullName() {
        return this._fullName.value;
    }
}
```

### Complex values and custom equality

Signals support _any_ kind of value, for example objects:

```ts
import { reactive, watchValue } from "@conterra/reactivity-core";

const currentUser = reactive({
    name: "User 1"
});

watchValue(
    () => currentUser.value,
    (user) => {
        console.log(user.name);
    },
    { immediate: true }
);

// Assignment to a signal's `.value` is reactive
currentUser.value = { name: "User 2" };
```

By default, change detection uses `Object.is`.
Objects, arrays and other reference types therefore trigger changes even if their contents are equivalent (equal _content_, different _identity_).
For example, this assignment triggers the watcher from the previous example, even though the `name` is the same:

```ts
// new object and thus a change
currentUser.value = { name: "User 1" };
```

`reactive()` and `computed()` accept a custom `equal` function to ignore such updates:

```ts
import { reactive, watchValue } from "@conterra/reactivity-core";

const currentUser = reactive(
    {
        name: "User 1"
    },
    {
        equal: (u1, u2) => u1.name === u2.name
    }
);

watchValue(
    () => currentUser.value,
    (user) => {
        console.log(user.name);
    },
    { immediate: true }
);

// Assignment is ignored because the name is the same.
currentUser.value = { name: "User 1" };
```

If you only need custom equality for a single watcher, use the `equal` option of `watchValue()` / `watch()`:

```ts
import { reactive, watchValue } from "@conterra/reactivity-core";

// No custom equality here.
const currentUser = reactive({
    name: "User 1"
});

watchValue(
    () => currentUser.value,
    (user) => {
        console.log(user.name);
    },
    {
        immediate: true,
        // Custom equality directly for the watch callback.
        equal: (prev, next) => {
            return prev.name === next.name;
        }
    }
);

// Callback is not invoked because the name is the same.
currentUser.value = { name: "User 1" };
```

### Working with collections

A signal can hold an object, an array, or any other container (e.g. `Map` / `Set`).
However, you are only notified when the _container_ is replaced, not when its _content_ changes.
In other words, plain JavaScript values are not deeply reactive.

There are two recommended approaches.

#### Using immutable values

Convenient for small collections or collections that don't update very often.
Instead of updating a collection in place, replace it with an updated copy:

```ts
import { effect, reactive } from "@conterra/reactivity-core";

const authors = reactive<string[]>(["Tolkien", "Grisham"]);
effect(() => {
    console.log(authors.value);
});

function addAuthor(name: string) {
    // Replace the array instead of updating it in place.
    // This way, a normal signal is sufficient for reactivity.
    authors.value = authors.value.concat(name);
}

addAuthor("King");
```

#### Using reactive collection classes

Alternatively, use one of the [reactive collections](#reactive-collections):

```ts
import { effect, reactiveArray } from "@conterra/reactivity-core";

// NOTE: not a normal array (but mostly API-compatible).
const authors = reactiveArray(["Tolkien", "Grisham"]);
effect(() => {
    console.log(authors.getItems());
});

function addAuthor(name: string) {
    authors.push(name);
}

addAuthor("King");
```

### Reactive collections

#### Array

`ReactiveArray<T>` (created via `reactiveArray()`) behaves largely like a normal [`Array<T>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array).
Most standard methods have been reimplemented with support for reactivity.

The major difference is that the `[]` operator cannot be used.
Use `array.get(index)` and `array.set(index, value)` instead.

```ts
import { effect, reactiveArray } from "@conterra/reactivity-core";

// Optionally accepts initial content
const array = reactiveArray<number>();

// prints undefined since the array is initially empty
effect(() => {
    console.log(array.get(0));
});

array.push(1); // effect prints 1

// later
array.set(0, 123); // effect prints 123
```

#### Set

`ReactiveSet<T>` (created via `reactiveSet()`) is a substitute for the standard [`Set<T>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set).

```ts
import { effect, reactiveSet } from "@conterra/reactivity-core";

// Optionally accepts initial content
const set = reactiveSet<number>();

// prints 0 since the set is initially empty
effect(() => {
    console.log(set.size);
});

set.add(123); // effect prints 1
```

#### Map

`ReactiveMap<K, V>` (created via `reactiveMap()`) is a substitute for the standard [`Map<K, V>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map).

```ts
import { effect, reactiveMap } from "@conterra/reactivity-core";

// Optionally accepts initial content
const map = reactiveMap<string, string>();

// prints undefined since the map is initially empty
effect(() => {
    console.log(map.get("foo"));
});

map.set("foo", "bar"); // effect prints "bar"
```

### Reactive structs

`reactiveStruct()` is a shortcut for defining simple reactive classes without writing the signal boilerplate yourself:

```ts
import { computed, reactiveStruct } from "@conterra/reactivity-core";

// declare a type for the reactive object
interface Person {
    firstName: string;
    lastName: string;
}

// define a class
const PersonClass = reactiveStruct<Person>().define({
    firstName: {}, // default options (reactive and writable)
    lastName: { writable: false } // read-only
});

// create a new reactive instance
const person = new PersonClass({
    firstName: "John",
    lastName: "Doe"
});

// compute the full name
const fullName = computed(() => `${person.firstName} ${person.lastName}`);
console.log(fullName.value); // prints "John Doe"

person.firstName = "Jane";
console.log(fullName.value); // prints "Jane Doe"
```

The `define()` function can be used to

- make properties read-only
- declare non-reactive properties
- create computed properties
- add methods

```ts
import { reactiveStruct } from "@conterra/reactivity-core";

interface Person {
    firstName: string;
    lastName: string;
    fullName: string; // will be a computed property
    printName(): void; // a method printing the full name
}

const PersonClass = reactiveStruct<Person>().define({
    firstName: {},
    lastName: { writable: false },
    fullName: {
        compute() {
            // re-computed whenever first or last name changes
            return `${this.firstName} ${this.lastName}`;
        }
    },
    printName: {
        method() {
            // always prints the current full name
            console.log(`My name is ${this.fullName}`);
        }
    }
});

const person = new PersonClass({
    firstName: "John",
    lastName: "Doe"
});
person.printName(); // prints "My name is John Doe"
person.firstName = "Jane";
person.printName(); // prints "My name is Jane Doe"
```

Reactive structs are intended for very simple classes: objects with reactive properties, computed properties and methods.
They do not support base classes or private properties.
For anything more advanced, write a regular class using signals (see [Reactive objects and classes](#reactive-objects-and-classes)); it may still use a reactive struct internally.

### Constant signals

Constant signals never change their value.
They are helpful for APIs that expect a `ReadonlyReactive<T>`:

```ts
import { constant } from "@conterra/reactivity-core";

const foo = constant(3);
console.log(foo.value); // prints 3
foo.value = 4; // TypeScript error and runtime error
```

### Linked signals

Reactive signals may change arbitrarily, and computed signals are completely derived from other signals.
Linked signals are a hybrid of both:

- A linked signal has a _source_ value derived from other signals.
- While the source remains unchanged, the linked signal's _value_ may be updated by the user.
- When the source changes, the linked signal's value is reset.

#### Example 1: reset to a default

A component lets the user select a value from a set of options that may change behind the scenes:

```ts
import { reactive, linked } from "@conterra/reactivity-core";

const options = reactive(["a", "b", "c"]);
const currentOption = linked(() => options.value[0]); // default to first item

// (1)
console.log(currentOption.value); // prints "a"

// (2)
currentOption.value = "b";
console.log(currentOption.value); // prints "b"

// (3)
options.value = ["x", "y", "z"];
console.log(currentOption.value); // prints "x"
```

- **(1)** `currentOption` is initialized to the first item of `options`.
- **(2)** While `options.value` remains unchanged, `currentOption.value` can be changed freely.
- **(3)** Changing `options.value` resets `currentOption.value` to the first item of the new options.

#### Example 2: custom reset logic

The previous example always resets the user's choice, even if it would still be valid.
The optional second argument to `linked()` computes the new value from the new source and the previous value:

```ts
import { reactive, linked } from "@conterra/reactivity-core";

const options = reactive(["a", "b", "c"]);
const currentOption = linked(
    () => options.value,
    (options, previousValue?: string) => {
        if (previousValue != null && options.includes(previousValue)) {
            // Previous value is still valid
            return previousValue;
        }
        // Reset to first value
        return options[0];
    }
);
console.log(currentOption.value); // prints "a"

currentOption.value = "b";
console.log(currentOption.value); // prints "b"

options.value = ["x", "y", "b"];
console.log(currentOption.value); // still prints "b"

options.value = ["x", "y", "z"];
console.log(currentOption.value); // prints "x"
```

#### Notes

- Like other signals, `linked` supports a custom `equal` function.
  It applies to the signal's _value_, not to the _source_ (these can differ, see Example 2).
  If you need custom equality for the source, wrap the source in a `computed` signal.
- The semantics are inspired by [Angular's linked signals](https://angular.dev/guide/signals/linked-signal).
  The implementation is based on a technique shown by [Ryan Carniato](https://dev.to/ryansolid).

### Integrating external state

This library cannot automatically integrate other ways of managing state (e.g. event based systems or third party reactivity systems).
Use `synchronized()` to integrate external state yourself.
It takes two functions:

1. A function that returns the _current_ value of the external state.
   This is similar to a computed signal's callback, but it is not automatically reactive.
2. A function that subscribes to the external data source and returns an unsubscribe function.

```ts
import { synchronized } from "@conterra/reactivity-core";

const signal = synchronized(
    () => /* get value from external (non-reactive) source */,
    (onChange) => {
        /* register onChange: to be called when the external value changes */
        return () => {
            /* unregister onChange again: don't leak event listeners */
        };
    }
);
signal.value;
```

The following example makes the `aborted` state of an `AbortSignal` available to reactive code.
`aborted` can be used like any other `computed` signal:

```ts
import { effect, synchronized } from "@conterra/reactivity-core";

const abortController = new AbortController();
const abortSignal = abortController.signal;

// Reactive binding for abortSignal.aborted
const aborted = synchronized(
    () => abortSignal.aborted,
    (onChange) => {
        abortSignal.addEventListener("abort", onChange);
        return () => abortSignal.removeEventListener("abort", onChange);
    }
);

effect(() => {
    console.log(`Aborted: ${aborted.value}`);
});

abortController.abort();
```

Output:

```text
Aborted: false
Aborted: true
```

### MaybeReactive

The type `MaybeReactive<T>` and the function `getReactive()` minimize the difference between _getters_, signals and plain values.
This is helpful for reusable APIs that accept arbitrary (possibly reactive) inputs:

```ts
import { MaybeReactive, getReactive, reactive, computed, effect } from "@conterra/reactivity-core";

// Example function: watch a reactive number and print its values.
function trackNumberChanges(currentNumber: MaybeReactive<number>) {
    effect(() => {
        const value = getReactive(currentNumber);
        console.log(value);
    });
}

// Not reactive, but works
trackNumberChanges(1);

// Reactive: prints new values if `reactiveNumber` changes.
const reactiveNumber = reactive(1);
trackNumberChanges(reactiveNumber);

// Two arbitrary signals
const number1 = reactive(1);
const number2 = reactive(2);

// Track a computed signal, reactive too.
const sum = computed(() => number1.value + number2.value);
trackNumberChanges(() => sum.value);

// Also works: using a getter directly, without wrapping it into a computed first.
trackNumberChanges(() => number1.value + number2.value);
```

A `MaybeReactive<T>` is one of:

| Kind of value                                         | `getReactive(v)` returns |
| ----------------------------------------------------- | ------------------------ |
| A plain value (not reactive)                          | `v`                      |
| A signal (`reactive`, `computed`, etc.)               | `v.value`                |
| A getter function (usually implemented using signals) | `v()`                    |

Related helpers: `getValue(v)` handles plain values and signals only (no getters), and `toReactiveGetter(v)` converts a `MaybeReactive<T>` into a getter function.

#### Getter vs. computed

A getter is re-evaluated on every access, while a computed signal caches its result and only re-computes when a dependency changes.
Prefer `computed` for expensive derivations; use a plain getter for trivial expressions or to avoid creating a signal object.

### Untracked reads

Sometimes you want to read the _current_ value of a signal without being triggered when that signal changes.
Opt out of dependency tracking with `untracked()`:

```ts
import { effect, reactive, untracked } from "@conterra/reactivity-core";

const s1 = reactive(0);
const s2 = reactive(0);
effect(() => {
    const v1 = s1.value; // tracked read
    const v2 = untracked(() => s2.value); // untracked read

    console.log("effect", v1, v2);
});

s2.value = 1; // does not trigger the effect again
s1.value = 1; // _does_ trigger the effect again
```

`untracked()` works everywhere dependencies are tracked:

- inside `computed()`
- in effect callbacks
- in the selector of `watch()` / `watchValue()`

> NOTE: For a single signal, `signal.peek()` is a shorthand for `untracked(() => signal.value)`.

## Timing and batching

### Async vs. sync dispatch

`effect()`, `watch()` and `watchValue()` support the `dispatch` option:

- `"async"` (the default):
  Callbacks are invoked with a slight delay, in a later event loop iteration ([macro task](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth), similar to `setTimeout(cb, 0)`).
  Synchronous code and handlers for already resolved promises run _before_ the callback.
  Multiple changes in quick succession may result in a single callback execution, which observes the latest value.
- `"sync"`:
  Callbacks are invoked synchronously: either _immediately_ within the `.value` assignment, or when leaving a `batch()` (see [Batching](#batching)).
  This results in more callback executions and is less efficient; only use it when the exact timing is required.

The _initial_ execution of an effect (and of a watch callback with `immediate: true`) always happens synchronously.

Example with the default (`"async"`):

```ts
import { watch, effect, reactive } from "@conterra/reactivity-core";

const s = reactive(1);
effect(() => {
    console.log("effect:", s.value);
});

watch(
    () => [s.value],
    ([value]) => {
        console.log("watch:", value);
    }
);

s.value = 2;
console.log("after assignment");
```

Output:

```text
effect: 1           # the initial effect execution always happens synchronously
after assignment    # watch and effect did NOT execute yet
effect: 2           # now effect and watch execute
watch: 2
```

The same example with `dispatch: "sync"`:

```ts
import { watch, effect, reactive } from "@conterra/reactivity-core";

const s = reactive(1);
effect(
    () => {
        console.log("effect:", s.value);
    },
    { dispatch: "sync" }
);

watch(
    () => [s.value],
    ([value]) => {
        console.log("watch:", value);
    },
    { dispatch: "sync" }
);

s.value = 2; // this line also executes the effect and the watch callback!
console.log("after assignment");
```

Output:

```text
effect: 1
effect: 2
watch: 2
after assignment
```

To wait for pending async callbacks (e.g. in tests), use `await nextTick()`.

### Batching

With `dispatch: "sync"`, every update triggers all watchers. They may be triggered

- very often, or
- in the middle of a logical operation (inconsistent state).

```ts
import { reactive, effect } from "@conterra/reactivity-core";

const count = reactive(0);
effect(
    () => {
        console.log(count.value);
    },
    { dispatch: "sync" }
);

count.value += 1;
count.value += 1;
count.value += 1;
count.value += 1;
// Effect has executed 5 times, all in-between values were observed.
```

Group multiple updates into a single _batch_ with `batch()`.
Watchers are not notified until the batch is complete:

```ts
import { reactive, effect, batch } from "@conterra/reactivity-core";

const count = reactive(0);
effect(
    () => {
        console.log(count.value);
    },
    { dispatch: "sync" }
);

batch(() => {
    count.value += 1;
    count.value += 1;
    count.value += 1;
    count.value += 1;
});
// Effect has executed only twice: once initially and once after batch() completed.
```

With the default `"async"` dispatch, synchronous updates are already grouped into a single notification.
It is still a good idea to wrap complex update operations in `batch()`.

## Gotchas

### Avoid cycles in computed signals

Don't read the value of a computed signal during its own computation.
This is obvious in a simple example, but may happen by accident when many objects or functions are involved.

```ts
import { computed } from "@conterra/reactivity-core";

const computedValue = computed(() => {
    // Trivial example. This may happen through many layers of indirection in real world code.
    let v = computedValue.value;
    return v * 2;
});

console.log(computedValue.value); // throws "Cycle detected"
```

### Don't trigger an effect from within itself

Writing to a signal from within an effect is fine in general, but don't produce a cycle.

This is okay (but could be replaced by a computed signal):

```ts
import { reactive, effect } from "@conterra/reactivity-core";

const v1 = reactive(0);
const v2 = reactive(1);
effect(() => {
    // Updates v2 whenever v1 changes
    v2.value = v1.value * 2;
});
```

This is _not_ okay:

```ts
import { reactive, effect } from "@conterra/reactivity-core";

const v1 = reactive(0);
effect(() => {
    // same as `v1.value = v1.value + 1`
    v1.value += 1; // throws!
});
```

The effect _reads_ `v1` (so it must re-execute whenever `v1` changes) and then _writes_ to `v1`, changing it.
It would re-trigger itself endlessly; the underlying signals library throws an exception when this is detected.

If you really need to read a value without depending on it, use an [untracked read](#untracked-reads):

```ts
import { reactive, effect, untracked } from "@conterra/reactivity-core";

const v1 = reactive(0);
effect(() => {
    // Code inside untracked() does not become a dependency of the effect.
    const value = untracked(() => v1.value); // or: v1.peek()
    v1.value = value + 1;
});
```

### Don't use async/await directly in reactive callbacks

Managing asynchronous operations from reactive code is legitimate.
For example, this effect starts a new operation whenever `input` changes:

```ts
import { reactive, effect } from "@conterra/reactivity-core";

const input = reactive("foo");
effect(() => {
    const currentInput = input.value;
    longRunningOperation(currentInput).catch((e) => {
        console.error("Something went wrong", e);
    });
});

input.value = "bar";

async function longRunningOperation(param: string) {
    // ...
    console.log("long running:", param);
}
```

Signals can also track the status of an asynchronous operation:

```ts
import { reactive, effect } from "@conterra/reactivity-core";

type JobState =
    { state: "pending" } | { state: "done"; result: unknown } | { state: "error"; error: unknown };

const jobState = reactive<JobState>({ state: "pending" });
effect(() => {
    console.log(jobState.value);
});

performJob()
    .then((result) => {
        jobState.value = { state: "done", result };
    })
    .catch((error) => {
        jobState.value = { state: "error", error };
    });

async function performJob() {
    // ...
    return 42;
}
```

**However, do not use `async` / `await` _directly_ in an effect, watch or computed callback.**
The following is bad style and leads to surprising behavior:

```ts
import { effect, reactive } from "@conterra/reactivity-core";

const s1 = reactive("a");
const s2 = reactive("b");

// BAD: note the `async` keyword
effect(async () => {
    const v1 = s1.value;
    const result = await functionThatReturnsAPromise(v1); // (1)
    const v2 = s2.value;
    console.log(v2);
});

setTimeout(() => {
    s2.value = "c"; // (2)
}, 1000);

async function functionThatReturnsAPromise(v1: string) {
    // ...
}
```

The effect executes once initially, but it is _not_ triggered by the update in (2).
The read of `s2.value` happens after the `await` and is therefore not tracked.
This becomes more obvious when writing the same effect differently:

```ts
// does pretty much the same as the previous effect
effect(() => {
    const v1 = s1.value;
    functionThatReturnsAPromise(v1).then((result) => {
        const v2 = s2.value;
        console.log(v2);
    });
});
```

The read of `s1.value` happens _directly_ inside the effect, but the read of `s2.value` happens later.
By then, the effect callback has already completed: all APIs in this package only track dependencies in _synchronous_ code.
Only the code before the first `await` is reactive; since this is confusing and error prone, avoid `async` callbacks altogether.

## API overview

All functions are exported from the package root (`@conterra/reactivity-core`).
See the [API documentation](https://conterra.github.io/reactivity/latest/) or the type declarations for full signatures.

### Primitives

| Export                   | Purpose                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `reactive(value, opts?)` | Writable signal. Read/write via `.value`. See [Signals](#signals).                                             |
| `computed(fn, opts?)`    | Read-only signal derived from other signals; cached. See [Computed signals](#computed-signals).                |
| `linked(source, reset?)` | Writable signal that resets when its source changes. See [Linked signals](#linked-signals).                    |
| `constant(value)`        | Read-only signal that never changes. See [Constant signals](#constant-signals).                                |
| `synchronized(get, sub)` | Signal backed by external (non-reactive) state. See [Integrating external state](#integrating-external-state). |
| `batch(fn)`              | Group multiple writes; watchers are notified once at the end. See [Batching](#batching).                       |
| `untracked(fn)`          | Run `fn` without tracking signal reads. See [Untracked reads](#untracked-reads).                               |
| `getValue(v)`            | Returns `v.value` if `v` is a signal, otherwise `v`.                                                           |
| `getReactive(v)`         | Like `getValue`, but also calls getter functions. See [MaybeReactive](#maybereactive).                         |
| `toReactiveGetter(v)`    | Converts a `MaybeReactive<T>` into a getter function `() => T`.                                                |
| `isReactive(v)`          | Type guard: is `v` a writable signal?                                                                          |
| `isReadonlyReactive(v)`  | Type guard: is `v` a (possibly read-only) signal?                                                              |

Types: `ReadonlyReactive<T>`, `Reactive<T>`, `MaybeReactive<T>`, `ReactiveGetter<T>`, `ReactiveSource<T>`, `ReactiveOptions<T>`, `EqualsFunc<T>`, `SubscribeFunc`.

### Watching

| Export                            | Purpose                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `effect(fn, opts?)`               | Runs `fn` now and again whenever any signal it read changes. See [Effects](#effects).   |
| `watchValue(selector, cb, opts?)` | Calls `cb` when the selector's return value changes (`Object.is`). See [Watch](#watch). |
| `watch(selector, cb, opts?)`      | Like `watchValue`, but the selector returns an array compared shallowly.                |

All three return a `CleanupHandle` (call `.destroy()` to stop) and accept `dispatch: "async" | "sync"` (default `"async"`). See [Async vs. sync dispatch](#async-vs-sync-dispatch).
Types: `CleanupHandle`, `CleanupFunc`, `EffectCallback`, `EffectContext`, `EffectOptions`, `WatchCallback<T>`, `WatchImmediateCallback<T>`, `WatchContext`, `WatchOptions<T>`, `DispatchType`.

### Collections

| Export                  | Purpose                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `reactiveArray(items?)` | Reactive `Array`-like collection (`ReactiveArray<T>`, `ReadonlyReactiveArray<T>`). |
| `reactiveSet(items?)`   | Reactive `Set` (`ReactiveSet<T>`, `ReadonlyReactiveSet<T>`).                       |
| `reactiveMap(entries?)` | Reactive `Map` (`ReactiveMap<K, V>`, `ReadonlyReactiveMap<K, V>`).                 |

See [Reactive collections](#reactive-collections).

### Struct

| Export                              | Purpose                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `reactiveStruct<T>().define({...})` | Creates a class with reactive, read-only, computed properties and methods. See [Reactive structs](#reactive-structs). |

### Utilities

| Export       | Purpose                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------- |
| `nextTick()` | Promise that resolves after pending async effect/watch callbacks have run. Useful in tests. |

Exports prefixed with `internal_` are **not** part of the public API and may change at any time.

## Agent skills

This package ships agent skills that teach AI coding agents how to use this library:

- `reactivity-core`: signals, effects, watches and reactive collections (this package).
- `reactivity-events`: event emitters from [`@conterra/reactivity-events`](https://www.npmjs.com/package/@conterra/reactivity-events).

With pnpm >= 12.11, the skills are linked into your agent's skill directory automatically once approved (via `pnpm approve` or in `pnpm-workspace.yaml`).
See the [pnpm documentation](https://pnpm.io/agent-skills) for details.

```yaml
# pnpm-workspace.yaml
permissions:
    "@conterra/reactivity-core":
        skills: true
```

Otherwise, copy or symlink the directories from `node_modules/@conterra/reactivity-core/skills/` into your agent's skill directory (e.g. `.agents/skills/` or `.claude/skills/`).

## License

Apache-2.0 (see `LICENSE` file)
