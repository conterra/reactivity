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

Note that the callback function used by a computed signal should be stateless:
it is supposed to compute a value (possibly very often), and it should not change the state of the system while doing so.

## API

### Primitives

### Subscribing to changes

### Collections

## Gotchas

### Avoid side effects in computed signals

###
