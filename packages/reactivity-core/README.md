# @conterra/reactivity-core

This library implements a reactivity system based on [signals](https://github.com/preactjs/signals).
It is designed to serve as the foundation for reactive applications (such as user interfaces).

## Motivation

One of the most important responsibilities of an application is to accurately present the current state of the system.
Such an application will have to implement the means to:

1. Fetch the _current_ state and present it to the user.
2. Subscribe to state changes:

    - On change, goto 1.

While step 1 is rather trivial, step 2 turns out to contain lots of complexity in practice, especially if many different sources of state (e.g. objects) are involved.

Many frameworks have found different solutions for keeping the UI synchronized with the application's state (e.g. React, Vue, Flux architecture, store libraries such as Zustand/VueX/Pinia, etc.).
These solutions often come with some trade-offs:

-   They are often tied to an UI framework (e.g. React).
-   They may impose unusual programming paradigms (e.g. a centralized store instead of a graph of objects) that may be different to integrate with technologies like TypeScript.
-   They may only support reactivity for _some_ objects.
    For example, Vue's reactivity system is based on wrapping objects with proxies; this is incompatible with some legitimate objects - a fact that can be both surprising and difficult to debug.
-   They may only support reactivity _locally_.
    For example, a store library may support reactivity _within_ a single store, but referring to values from multiple stores may be difficult.

This library implements a different set of trade-offs, based on signals:

-   The implementation is not tied to any UI technology.
    It can be used with any UI Framework, or none, or multiple UI Frameworks at the same time.
-   All kinds of values are supported.
    Updating the current value in a reactive "box" will notify all interested parties (such as effects, watchers or computed objects).
    However, values that have not been prepared for reactivity will not be deeply reactive: when authoring a class, one has to use the reactive primitives or collections provided by this package.
-   State can be kept in objects and classes (this pairs nicely with TypeScript).
    The state rendered by the user interface can be gathered from an arbitrary set of objects.

## Overview

Signals are reactive "boxes" that contain a value that may change at any time.
They can be easily watched for changes by, for example, registering a callback using `watch()`.

Signals may also be composed via _computed_ signals, whose values are derived from other signals and are then automatically kept up to date.
They can also be used in classes (or plain objects) for organization based on concern or privacy.

### Basics

The following snippet creates a signal `r` through the function `reactive<T>()` that initially holds the value `"foo"`.
`reactive<T>()` is one of the most basic forms to construct a signal:

```ts
import { reactive } from "@conterra/reactivity-core";

const r = reactive("foo");
console.log(r.value); // prints "foo"

r.value = "bar";
console.log(r.value); // prints "bar"
```

The current value of a signal can be accessed by reading the property `.value`.
If you have a writable signal (which is the case for signals returned by `reactive<T>()`), you can update the inner value of assigning to the property `.value`.

Whenever the value of a signal changes, any watcher (a party interested in the current value) will automatically be notified.
The `effect()` function is one way to track one (or many) signals:

```ts
import { reactive, effect } from "@conterra/reactivity-core";

const r = reactive("foo");

// Effect callback is executed once; prints "foo" immediately
effect(() => {
    console.log(r.value);
});

// Triggers another execution of the effect; prints "bar" now.
r.value = "bar";
```

`effect()` executes a callback function and tracks which signals have been accessed (meaning: reading `signal.value`) by that function - even indirectly.
Whenever one of those signals changes in any way, the effect will be triggered again.

Signals can be composed by deriving values from them via `computed()`.
`computed()` takes a callback function as its argument.
That function can access any number of signals and should then return some JavaScript value.
The following example creates a computed signal that always returns twice the original `age`.

```ts
import { reactive, computed } from "@conterra/reactivity-core";

const age = reactive(21);
const doubleAge = computed(() => age.value * 2);

console.log(doubleAge.value); // 42
age.value = 22;
console.log(doubleAge.value); // 44
```

Computed signals can be watched (e.g. via `effect()`) like any other signal:

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

Computed signals only re-compute their value (by invoking the callback function) when any of their dependencies have changed.
For as long as nothing has changed, the current value will be cached.
This can make even complex computed signals very efficient.

Note that the callback function for a computed signal should be stateless:
it is supposed to compute a value (possibly very often), and it should not change the state of the application while doing so.

### Using signals for reactive object properties

You can use signals in your classes (or single objects) to implement reactive objects.
For example:

```ts
import { reactive } from "@conterra/reactivity-core";

class Person {
    // Could be private or public
    _name = reactive("");

    get name() {
        return this._name.value;
    }

    set name(value) {
        // Reactive write -> watches that used the `name` getter are notified.
        // We could use this setter (which could also be a normal method) to enforce preconditions.
        this._name.value = value;
    }
}
```

Instances of person are now reactive, since their state is actually stored in signals:

```ts
import { effect } from "@conterra/reactivity-core";

// Person from previous example
const p = new Person();
p.name = "E. Example";

// Prints "E. Example"
effect(() => {
    console.log(p.name);
});

// Triggers effect again; prints "T. Test"
p.name = "T. Test";
```

You can also provide computed values or accessor methods in your class:

```ts
import { reactive, computed } from "@conterra/reactivity-core";

// In this example, first name and last name can only be written to.
// Only the combined full name is available to users of the class.
class Person {
    _firstName = reactive("");
    _lastName = reactive("");
    _fullName = computed(() => `${this._firstName.value} ${this._lastName.value}`);

    setFirstName(name) {
        this._firstName.value = name;
    }

    setLastName(name) {
        this._lastName_.value = name;
    }

    getFullName() {
        return this._fullName.value;
    }
}
```

### Effect vs. Watch

We provide two different APIs to run code when reactive values change.
The simpler one is effect `effect()`:

```js
import { reactive, effect } from "@conterra/reactivity-core";

const r1 = reactive(0);
const r2 = reactive(1);
const r3 = reactive(2);

// Will run whenever _any_ of the given signals changed,
// even if the sum turns out to be the same.
effect(() => {
    const sum = r1.value + r2.value + r3.value;
    console.log(sum);
});
```

If your effect callbacks become more complex, it may be difficult to control which signals are ultimately used.
This can result in your effect running too often, because you're really only interested in _some_ changes and not all of them.

In that case, you can use `watch()`:

```js
import { reactive, watch } from "@conterra/reactivity-core";

const r1 = reactive(0);
const r2 = reactive(1);
const r3 = reactive(2);

watch(
    // (1)
    () => {
        const sum = r1.value + r2.value + r3.value;
        return [sum];
    },
    // (2)
    ([sum]) => {
        console.log(sum);
    }
);
```

`watch()` takes two functions:

-   **(1)**: The _selector_ function. This function's body is tracked (like in `effect()`) and all its reactive dependencies are recorded. The function must return an array of values.
-   **(2)**: The _callback_ function. This function is called whenever the selector function returned different values. The callback itself is _not_ reactive.

In this example, the callback function will only re-run when the computed sum truly changed.

### Reactive collections

## API

### Primitives

### Subscribing to changes

### Collections

### Types

## Gotchas

### Avoid side effects in computed signals

###
