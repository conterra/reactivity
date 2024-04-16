# @conterra/reactivity-core

> UI framework independent reactivity library with support for all kinds of values

## Quick Example

```ts
import { reactive, computed, watch } from "@conterra/reactivity-core";

const firstName = reactive("John");
const lastName = reactive("Doe");
const fullName = computed(() => `${firstName.value} ${lastName.value}`);

watch(
    () => [fullName.value],
    ([fullName]) => {
        console.log(fullName);
    },
    {
        immediate: true
    }
);

firstName.value = "Jane";
```

## Usage

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
        this._lastName.value = name;
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

In that case, you can use `watch()` to have more fine grain control:

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
    },
    // (3)
    { immediate: true }
);
```

`watch()` takes two functions and one (optional) options object:

-   **(1)**: The _selector_ function.
    This function's body is tracked (like in `effect()`) and all its reactive dependencies are recorded.
    The function must return an array of values.
-   **(2)**: The _callback_ function.
    This function is called whenever the selector function returned different values, and it receives those values as its first argument.
    The callback itself is _not_ reactive.
-   **(3)**: By default, the callback function will only be invoked after the watched values changed at least once.
    By specifying `immediate: true`, the callback will also run for the initial values.

In this example, the callback function will only re-run when the computed sum truly changed.

### Complex values

TODO: Object identity, arrays, immutability --> Reactive Collections

### Cleanup

Both `effect()` and `watch()` return a `CleanupHandle` to stop watching for changes:

```js
const h1 = effect(/* ... */);
const h2 = watch(/* ... */);

// When you are no longer interested in changes:
h1.destroy();
h2.destroy();
```

When a watcher is not cleaned up properly, it will continue to execute (possibly forever).
This leads to unintended side effects, unnecessary memory consumption and waste of computational power.

### Reactive collections

This package provides a set of collection classes to simplify working with complex values.

#### Array

The `ReactiveArray<T>` behaves largely like a normal `Array<T>`.
Most standard methods have been reimplemented with support for reactivity (new methods can be added on demand).

The only major difference is that one cannot use the `[]` operator.
Users must use the `array.get(index)` and `array.set(index, value)` methods instead.

Example:

```ts
import { reactiveArray } from "@conterra/reactivity-core";

// Optionally accepts initial content
const array = reactiveArray<string>();

// Prints undefined since the array is initially empty
effect(() => {
    console.log(array.get(0));
});

array.push(1); // effect prints 1

// later
array.set(0, 123); // effect prints 123
```

#### Set

The `ReactiveSet<T>` can be used as substitute for the standard `Set<T>`.

Example:

```ts
import { reactiveSet } from "@conterra/reactivity-core";

// Optionally accepts initial content
const set = reactiveSet<number>();

// Prints 0 since the set is initially empty
effect(() => {
    console.log(set.size);
});

set.add(123); // effect prints 1
```

#### Map

The `ReactiveMap<T>` can be used as a substitute for the standard `Map<T>`.

Example:

```ts
import { reactiveSet } from "@conterra/reactivity-core";

// Optionally accepts initial content
const map = reactiveMap<string, string>();

// Prints undefined since the map is initially empty
effect(() => {
    console.log(map.get("foo"));
});

map.set("foo", "bar"); // effect prints "bar"
```

#### Struct

With the basic building blocks like `reactive` and `computed` you are able to create reactive objects.
For example, you can create a `Person` class having a first name, a last name and computed property computing the full name, whenever first or last name changes.
Instances of that class are reactive objects.

The reactivity API helps you to create such reactive objects by providing a function called `reactiveStruct`.

For example, to create a person with `reactiveStruct` proceed as follows:

```ts
import { reactiveStruct } from "@conterra/reactivity-core";

// declare a type for the reactive object
type PersonType = {
    firstName: string;
    lastName: string;
}

// define a class like PersonClass
const PersonClass = reactiveStruct<PersonType>().define({
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
console.log(fullName.value); // John Doe

person.firstName = "Jane";
console.log(fullName.value); // Jane Doe
```

The `define` function can be used to

- make properties read-only
- declare non reactive properties
- create computed properties
- add methods to the reactive object

The following example shows declaring an extended `Person`:

```ts
type PersonType = {
    firstName: string;
    lastName: string;
    fullName: string; // will be a computed property
    printName: () => void // a method printing the full name
}

const PersonClass = reactiveStruct<PersonType>().define({
    firstName: {},
    lastName: { writable: false },
    fullName: {
        compute() {
            // executed whenever first or last name changes
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

// create a new reactive instance
const person = new PersonClass({
    firstName: "John",
    lastName: "Doe"
});
person.printName(); // My name is John Doe
person.firstName = "Jane";
person.printName(); // My name is Jane Doe
```

Reactive structs are class like, as they don't support inheritance for example.
You can imagine reactive structs as simple objects having reactive properties, computed properties and methods.
Please consider writing your own classes with the basic API like `reactive` if a _class like_ is not enough.

## Why?

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

This library implements a different set of trade-offs, based on [signals](https://github.com/preactjs/signals):

-   The implementation is not tied to any UI technology.
    It can be used with any UI Framework, or none, or multiple UI Frameworks at the same time.
-   All kinds of values are supported.
    Updating the current value in a reactive "box" will notify all interested parties (such as effects, watchers or computed objects).
    However, values that have not been prepared for reactivity will not be deeply reactive: when authoring a class, one has to use the reactive primitives or collections provided by this package.
-   State can be kept in objects and classes (this pairs nicely with TypeScript).
    The state rendered by the user interface can be gathered from an arbitrary set of objects.

## API

See the comments inside the type declarations or the built TypeDoc documentation.

## Installation

With [npm](https://npmjs.org/) installed, run

```sh
npm install @conterra/reactivity-core
```

## Gotchas and tips

### Avoid side effects in computed signals

Computed signals should use a side effect free function.
Oftentimes, you cannot control how often the function is re-executed, because that depends on how often
the dependencies of your functions change and when your signal is actually read (computation is lazy).

Example:

```ts
let nonreactiveValue = 1;
const reactiveValue = reactive(1);
const computedValue = computed(() => {
    // This works, but it usually bad style for the reasons outlined above:
    nonReactiveValue += 1;

    // XXX
    // This is outright forbidden and will result in a runtime error.
    // You cannot modify a signal from inside a computed signal.
    reactiveValue.value += 1;
    return "whatever";
});
```

### Don't trigger an effect from within itself

Updating the value of some signal from within an effect is fine in general.
However, you should take care not to produce a cycle.

Example: this is okay (but could be replaced by a computed signal).

```ts
const v1 = reactive(0);
const v2 = reactive(1);
effect(() => {
    // Updates v2 whenever v1 changes
    v2.value = v1.value * 2;
});
```

Example: this is _not_ okay.

```ts
const v1 = reactive(0);
effect(() => {
    // same as `v1.value = v1.value + 1`
    v1.value += 1; // throws!
});
```

This is the shortest possible example of a cycle within an effect.
When the effect executed, it _reads_ from `v1` (thus requiring that the effect re-executes whenever `v1` changes)
and then it _writes_ to v1, thus changing it.
This effect would re-trigger itself endlessly - luckily the underlying signals library throws an exception when this case is detected.

#### Workaround

Sometimes you _really_ have to read something and don't want to become a reactive dependency.
In that case, you can wrap the code block with `untracked()`.
Example:

```ts
import { reactive, effect, untracked } from "@conterra/reactivity-core";

const v1 = reactive(0);
effect(() => {
    // Code inside untracked() will not be come a dependency of the effect.
    const value = untracked(() => v1.value);
    v1.value = value + 1;
});
```

The example above will not throw an error anymore because the _read_ to `v1` has been wrapped with `untracked()`.

> NOTE: In very simple situations you can also use the `.peek()` method of a signal, which is essentially a tiny `untracked` block that only reads from that signal. The code above could be changed to `const value = v1.peek()`.

### Batching multiple updates

### Sync vs async effect / watch

### Writing nonreactive code

### Effects triggering "too often"

## License

Apache-2.0 (see `LICENSE` file)
