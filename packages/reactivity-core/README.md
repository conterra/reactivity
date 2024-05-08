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
If you have a writable signal (which is the case for signals returned by `reactive<T>()`), you can update the inner value by assigning to the property `.value`.

Whenever the value of a signal changes, any watcher (a party interested in the current value) will automatically be notified.
The `effect()` function is one way to track one (or many) signals:

```ts
import { reactive, effect } from "@conterra/reactivity-core";

const r = reactive("foo");

// Effect callback is executed once; prints "foo" immediately
effect(() => {
    // This access to `r.value` is tracked by the effect.
    // When the signal's value changes, the effect is executed again.
    console.log(r.value);
});

// Triggers another execution of the effect; prints "bar" now.
r.value = "bar";
```

`effect(callback)` works like this:

-   First, it will execute the given `callback` immediately.
-   During the execution, it tracks all signals whose values were accessed by `callback`.
    This also works indirectly, for example if you call one or more functions which internally use signals.
-   When _any_ of those signals are updated, the effect will re-execute `callback`.
-   These re-executions will happen indefinitely: either until the signals no longer change or until the effect has been destroyed.
    Effects can be destroyed by using the object returned by `effect()` (see [Cleanup](#cleanup)).
-   For an alternative API that doesn't trigger on _every_ change, see [watch()](#effect-vs-watch).

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

### Effect vs. Watch

We provide two different APIs to run code when reactive values change.
The simpler one is effect `effect()`:

```ts
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

```ts
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

Up to this point, examples have used primitive values such as strings or integers.
Signals support _any_ kind of `value`, for example:

```ts
import { reactive, watch } from "@conterra/reactivity-core";

const currentUser = reactive({
    name: "User 1"
});

watch(
    () => [currentUser.value],
    ([user]) => {
        console.log(user.name);
    },
    { immediate: true }
);

// Assignment to a signal's `.value` is reactive
currentUser.value = { name: "User 2" };
```

You should keep in mind that, by default, change detection is based on JavaScript's default comparison (i.e. `===`).
This means that objects or arrays (or any other reference type) may trigger changes even if their contents are equivalent (equal _content_ but different _identity_).
For example, the following change would trigger the `watch()` of the previous example, even though the `name` is the same:

```ts
// new object and thus a change
currentUser.value = { name: "User 1" };
```

For this reason, `reactive` and `computed` allow you to supply a custom equality function.
This allows you to ignore certain updates by specifying that a value is _equal_ to another value:

```ts
import { reactive, watch } from "@conterra/reactivity-core";

const currentUser = reactive(
    {
        name: "User 1"
    },
    {
        equal: (u1, u2) => u1.name === u2.name
    }
);

watch(
    () => [currentUser.value],
    ([user]) => {
        console.log(user.name);
    },
    { immediate: true }
);

// Assignment is ignored because the name is the same.
currentUser.value = { name: "User 1" };
```

### Working with collections

As mentioned above, signals support any kind of value.
This means that you can easily wrap an object, an array, or any other kind of container (e.g. Map/Set) in a signal.
However, you will only be notified when the _object_ (or array) changes, and not when its _content_ does.
In other words, deep reactivity is not support for "normal" JavaScript values.

At this point, we can recommend two approaches, based on your requirements.

#### Using immutable values

This approach can be convenient for small collections or collections that don't update very often.
Essentially, instead of updating the content of an collection, you replace the entire collection with an updated one:

```ts
import { effect, reactive } from "@conterra/reactivity-core";

const authors = reactive<string[]>(["Tolkien", "Grisham"]);
effect(() => {
    console.log(authors.value);
});

function addAuthor(name: string) {
    // Replace the array instead of updating it in place.
    // This way, we can use a normal signal for reactivity.
    authors.value = authors.value.concat(name);
}

addAuthor("King");
```

#### Using reactive collection classes

We implemented a few classes to make working with reactive collection easier, see [Reactive Collections](#reactive-collections).

The previous example could also be written as:

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

### Cleanup

Both `effect()` and `watch()` return a `CleanupHandle` to stop watching for changes:

```ts
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

The `ReactiveArray<T>` behaves largely like a normal [`Array<T>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array).
Most standard methods have been reimplemented with support for reactivity (new methods can be added on demand).

The only major difference is that one cannot use the `[]` operator.
Users must use the `array.get(index)` and `array.set(index, value)` methods instead.

Example:

```ts
import { effect, reactiveArray } from "@conterra/reactivity-core";

// Optionally accepts initial content
const array = reactiveArray<number>();

// Prints undefined since the array is initially empty
effect(() => {
    console.log(array.get(0));
});

array.push(1); // effect prints 1

// later
array.set(0, 123); // effect prints 123
```

#### Set

The `ReactiveSet<T>` can be used as substitute for the standard [`Set<T>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set).

Example:

```ts
import { effect, reactiveSet } from "@conterra/reactivity-core";

// Optionally accepts initial content
const set = reactiveSet<number>();

// Prints 0 since the set is initially empty
effect(() => {
    console.log(set.size);
});

set.add(123); // effect prints 1
```

#### Map

The `ReactiveMap<T>` can be used as a substitute for the standard [`Map<T>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map).

Example:

```ts
import { effect, reactiveMap } from "@conterra/reactivity-core";

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

The reactivity API helps you to create simple reactive objects by providing a function called `reactiveStruct`.

For example, to create a person with `reactiveStruct` proceed as follows:

```ts
import { reactiveStruct } from "@conterra/reactivity-core";

// declare a type for the reactive object
interface Person {
    firstName: string;
    lastName: string;
}

// define a class like PersonClass
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
console.log(fullName.value); // John Doe

person.firstName = "Jane";
console.log(fullName.value); // Jane Doe
```

The `define` function can be used to

-   make properties read-only
-   declare non-reactive properties
-   create computed properties
-   add methods to the reactive object

The following example shows declaring an extended `Person`:

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

Reactive structs are designed to help implement very simple classes: you can think of reactive structs as objects having reactive properties, computed properties and methods.
They are not designed to replace every usage of the `class` keyword.
For example, they do not support base classes or private properties.

If you need an advanced class, we recommend writing it yourself using standard JavaScript / TypeScript means.
You can still (if needed) use a reactive struct internally, or you can use manual signals instead.

#### Integrating external state

This reactivity system does automatically integrate with other ways to manage state (e.g. event based systems, third party reactivity systems).
However, we do provide facilities to easily integrate "external" state yourself using the `external` signal.

To use `external`, you must implement two functionalities:

1. A function to _compute_ the _current_ value of the external state.
   This is very similar to the way computed signals work, but it is not automatically reactive.
2. You must subscribe to changes of the external state (through whatever appropriate means) and `.trigger()` the external signal.
   This tells our reactivity system that the current value is no longer up-to-date.

Example:

```ts
import { effect, external } from "@conterra/reactivity-core";

// An abort signal is a value that may be `aborted` through its controller.
// It provides both the `aborted` property (the current state) and a simple event that fires when that state changes.
// We use these facilities to provide a reactive boolean that accurately reflects the current state.
const controller = new AbortController();
const signal = controller.signal;

// boolean signal that tracks the aborted state.
// calls 'trigger()` on the signal when the signal is aborted.
const isAborted = external(() => signal.aborted);
signal.addEventListener("abort", isAborted.trigger);
// later, don't forget to unregister the event handler:
// signal.removeEventListener("abort", isAborted.trigger);

effect(() => {
    console.log("is aborted:", isAborted.value);
});

setTimeout(() => {
    controller.abort();
}, 1000);
```

Output:

```text
is aborted: false
is aborted: true
```

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

### Avoid cycles in computed signals

Don't use the value of a computed signal during its own computation.
The error will be obvious in a simple example, but it may also occur by accident when many objects or functions are involved.

Example:

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

Updating the value of some signal from within an effect is fine in general.
However, you should take care not to produce a cycle.

Example: this is okay (but could be replaced by a computed signal).

```ts
import { reactive, effect } from "@conterra/reactivity-core";

const v1 = reactive(0);
const v2 = reactive(1);
effect(() => {
    // Updates v2 whenever v1 changes
    v2.value = v1.value * 2;
});
```

Example: this is _not_ okay.

```ts
import { reactive, effect } from "@conterra/reactivity-core";

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

Every update to a signal will usually trigger all watchers.
This is not really a problem when using the default `watch()` or `effect()`, since multiple changes that follow _immediately_ after each other are grouped into a single notification, with a minimal delay.

However, when using `syncEffect` or `syncWatch`, you will be triggered many times:

```ts
import { reactive, syncEffect } from "@conterra/reactivity-core";

const count = reactive(0);
syncEffect(() => {
    console.log(count.value);
});

count.value += 1;
count.value += 1;
count.value += 1;
count.value += 1;
// Effect has executed 5 times
```

You can avoid this by grouping many updates into a single _batch_.
Effects or watchers will not get notified until the batch is complete:

```ts
import { reactive, syncEffect, batch } from "@conterra/reactivity-core";

const count = reactive(0);
syncEffect(() => {
    console.log(count.value);
});

batch(() => {
    count.value += 1;
    count.value += 1;
    count.value += 1;
    count.value += 1;
});
// Effect has executed only twice: one initial call and once after batch() as completed.
```

It is usually a good idea to surround a complex update operation with `batch()`.

### Sync vs async effect / watch

By default, the re-executions of `effect` and the callback executions of `watch` do not happen _immediately_ when a signal is changed.
Instead, the new executions are dispatched to occur in the next [event loop iteration ("macro task")](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth).
This means that they are delayed very slightly (similar to `setTimeout(..., 0)`) in order to group multiple synchronous changes into a single execution (see [Batching](#batching-multiple-updates)).

Consider the following example:

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

This will print:

```text
effect: 1           # the initial effect execution always happens synchronously
after assignment    # watch and effect did NOT execute yet
effect: 2           # now effect and watch will execute
watch: 2
```

If you need more control over your callbacks, you can use `syncEffect` and `syncWatch` instead:

```ts
import { syncWatch, syncEffect, reactive } from "@conterra/reactivity-core";

const s = reactive(1);
syncEffect(() => {
    console.log("effect:", s.value);
});

syncWatch(
    () => [s.value],
    ([value]) => {
        console.log("watch:", value);
    }
);

s.value = 2; // this line also executes the effect and the watch callback!
console.log("after assignment");
```

This will print:

```text
effect: 1
effect: 2
watch: 2
after assignment
```

### Writing nonreactive code

Sometimes you want to read the _current_ value of a signal without being triggered when that signal changes.
You can do that by opting out of the automatic dependency tracking using the `untracked` function, for example:

```ts
import { effect, reactive, untracked } from "@conterra/reactivity-core";

const s1 = reactive(0);
const s2 = reactive(0);
effect(() => {
    const v1 = s1.value; // tracked read
    const v2 = untracked(() => s2.value); // untracked read

    console.log("effect", v1, v2);
});

s2.value = 1; // does not cause the effect to trigger again
s1.value = 1; // _does_ cause the effect to trigger again
```

`untracked()` works everywhere dependencies are tracked:

-   inside `computed()`
-   in effect callbacks
-   in the `selector` argument of `watch()`

### Effects triggering often when working with collections

The current implementation of collection types (`Array`, `Map`, `Set`) only supports fine grained reactivity for _existing_ values.
When the set of values is changed (e.g. by calling `.push()` on an array or `.set` with a new key on a `Map`), only a coarse "change event" will be emitted.

Consider the following example:

```ts
import { effect, reactiveArray } from "@conterra/reactivity-core";

const array = reactiveArray([1]);
effect(() => {
    console.log("first array item", array.get(0));
});

array.push(2);
```

The snippet above will print the first array item _twice_, even though that item is never modified.
The current implementation is a compromise between memory efficiency, code complexity and usability that results in this quirk.

To work around the issue, simply use a `watch()` or wrap the array access into a `computed()` signal.
Both ways will ensure that the effect or callback is only triggered when the value _actually_ changed:

```ts
import { computed, effect, reactiveArray, watch } from "@conterra/reactivity-core";

const array = reactiveArray([1]);

// This works because computed() caches its value and only propagates change
// when the value is actually updated.
// Essentially, the computed's callback will still re-execute but no one else will be notified.
const firstItem = computed(() => array.get(0));
effect(() => {
    console.log("first array item (effect)", firstItem.value);
});

// This works because the callback is only invoked when the selector returns different values.
// Essentially, the selector is executed multiple times but watch() will not invoke the callback.
// (Behind the scenes, watch() is based on `computed` as well).
watch(
    () => [array.get(0)],
    ([item]) => {
        console.log("first array item (watch)", item);
    }
);

// Triggers neither the effect nor the watch callback.
array.push(2);
```

### Working with promises

All dependency tracking (computed, watch, effect, etc.) is based on tracking accesses to `signal.value` in _synchronous_ code.

The following snippet will _not_ be reactive with respect to the values accessed after the effect's body:

```ts
import { effect, reactive } from "@conterra/reactivity-core";

const s1 = reactive("a");
const s2 = reactive("b");

effect(() => {
    const v1 = s1.value; // (1)
    functionThatReturnsAPromise(v1).then(() => {
        console.log(s2.value); // (2)
    });
});
```

The effect will be triggered again if the value of `s1` changes because `s1` is read from within the effect in (1).
The execution of the `.then()` callback in (2) will always happen after the effect's body is done - possibly much later.
Thus, the effect will not re-execute if `s2` is updated.
If you need reactivity for `s2`, simply read it at an earlier time, e.g. next to (1).

This trap is easy to fall into when using asynchronous functions:

```ts
import { effect, reactive } from "@conterra/reactivity-core";

const s1 = reactive("a");
const s2 = reactive("b");

// note the `async` keyword
effect(async () => {
    const v1 = s1.value; // (1)
    const result = await functionThatReturnsAPromise(v1);
    const v2 = s2.value; // (2)
});
```

This syntax works in practice, but it is easy to make mistakes.
Like in the previous example, the access to `s1` in (1) will work.
However, because of the `await` keyword, the effect will _not_ track (2).
This is because `async` / `await` is just a different syntax for promises with `.then()` / `.catch()`.

Because it is so easy to make this mistake, we recommend _not_ using `async` / `await` directly in `effect`, `watch` or computed signals.

## License

Apache-2.0 (see `LICENSE` file)
