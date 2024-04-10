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

This library implements a different set of trade-offs, based on signals:

-   The implementation is not tied to any UI technology.
    It can be used with any UI Framework, or none, or multiple UI Frameworks at the same time.
-   All kinds of values are supported.
    Updating the current value in a reactive "box" will notify all interested parties (such as effects, watchers or computed objects).
    However, values that have not been prepared for reactivity will not be deeply reactive: when authoring a class, one has to use the reactive primitives or collections provided by this package.
-   State can be kept in objects and classes (this pairs nicely with TypeScript).
    The state rendered by the user interface can be gathered from an arbitrary set of objects.

## Overview

Signals are reactive "boxes" that contain a value, that may change at any time.
They may be composed via derived (or "computed") signals, which are updated automatically whenever one of their dependencies is updated.
They can also be used in classes (or plain objects) for organization based on concern or privacy.
Finally, any kind of value(s) that have been made reactive using signals can be watched for changes by registering a callback.

## API

### Primitives

### Subscribing to changes

### Collections
