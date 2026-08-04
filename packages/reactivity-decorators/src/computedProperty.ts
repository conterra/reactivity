// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { ReactiveOptions, computed, isReadonlyReactive } from "@conterra/reactivity-core";

/**
 * Basic decorator signature for computed properties.
 */
type ComputedPropertyDecoratorBase = <Class, ValueType>(
    target: () => ValueType,
    context: ClassGetterDecoratorContext<Class, ValueType> & {
        static: false;
    }
) => () => ValueType;

/**
 * Decorator signature for computed properties with custom options.
 */
type ComputedPropertyDecoratorWithOptions<ValueType> = <Class>(
    target: () => ValueType,
    context: ClassGetterDecoratorContext<Class, ValueType> & {
        static: false;
    }
) => () => ValueType;

/**
 * The type of the {@link computedProperty} decorator API.
 */
export interface ComputedPropertyDecorator extends ComputedPropertyDecoratorBase {
    /**
     * A decorator that creates a computed class property with the given options.
     */
    configure<ValueType>(
        options: ReactiveOptions<ValueType>
    ): ComputedPropertyDecoratorWithOptions<ValueType>;
}

/**
 * A decorator that creates a computed class property.
 *
 * Using the decorator function directory creates a simple computed property, for example:
 *
 * ```ts
 * import { reactiveProperty } from "@conterra/reactivity-decorators";
 *
 * class ReactiveClass {
 *     @reactiveProperty
 *     accessor value = 3;
 *
 *     // The getter is wrapped in a computed().
 *     @computedProperty
 *     get doubleValue() {
 *         return this.value * 2;
 *     }
 * }
 * ```
 *
 * You can also use the {@link ComputedPropertyDecorator.configure} method to customize the computed signal,
 * for example to define a custom equality function:
 *
 * ```ts
 * import { computedProperty } from "@conterra/reactivity-decorators";
 *
 * class ReactiveClass {
 *     @computedProperty.configure({
 *         equal(o1, o2) {
 *             return o1.name === o2.name;
 *         }
 *     })
 *     get objWithName() {
 *          return { name: "foo" };
 *     }
 * }
 * ```
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const computedProperty: ComputedPropertyDecorator = Object.assign(defineComputedProperty, {
    configure(options: ReactiveOptions<unknown>) {
        return (target: any, context: any) => defineComputedProperty(target, context, options);
    }
}) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * A decorator that defines an new computed property on the given target.
 *
 * This works like this:
 *
 * - Wrapping the original getter with a `computed()` signal.
 *   This signal is created in the objects constructor and attached to the object using a hidden key.
 * - The final getter will simply dereference the computed signal.
 */
function defineComputedProperty<This, Prop>(
    target: () => Prop,
    context: ClassGetterDecoratorContext<This, Prop> & {
        static: false;
    },
    options?: ReactiveOptions<Prop> | undefined
): () => Prop {
    // Unique symbol to store the computed signal
    const keyName =
        process.env.NODE_ENV === "development" ? `computed_${context.name.toString()}` : undefined;
    const key = Symbol(keyName);

    context.addInitializer(function () {
        // Calls the body of the original getter from the computed signal.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any)[key] = computed(() => {
            return target.call(this);
        }, options);
    });

    return function getComputedProperty(this: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const signal = (this as any)[key];
        if (!isReadonlyReactive(signal)) {
            throw new Error("Internal error: computed signal was not initialized.");
        }
        return signal.value;
    };
}
