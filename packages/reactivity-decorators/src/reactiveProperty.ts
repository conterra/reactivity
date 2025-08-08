// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { ReactiveOptions, isReactive, reactive } from "@conterra/reactivity-core";

/**
 * Basic decorator signature for reactive properties.
 */
type ReactivePropertyDecoratorBase = <Class, ValueType>(
    target: ClassAccessorDecoratorTarget<Class, ValueType>,
    context: ClassAccessorDecoratorContext<Class, ValueType> & {
        static: false;
    }
) => ClassAccessorDecoratorResult<Class, ValueType>;

/**
 * Decorator signature for reactive properties with custom options.
 */
type ReactivePropertyDecoratorWithOptions<ValueType> = <Class>(
    target: ClassAccessorDecoratorTarget<Class, ValueType>,
    context: ClassAccessorDecoratorContext<Class, ValueType> & {
        static: false;
    }
) => ClassAccessorDecoratorResult<Class, ValueType>;

/**
 * Options supported by {@link ReactivePropertyDecorator.configure}.
 *
 * These are the basic {@link ReactiveOptions}, but with special handling of the `equal` function.
 */
export type ReactiveDecoratorOptions<ValueType> = Omit<ReactiveOptions<ValueType>, "equal"> & {
    /**
     * Shall return `true` if the two values are considered equal.
     *
     * Reactive assignments using a new value equal to the current value
     * will be ignored.
     * By default, `Object.is` is used to compare values.
     *
     * NOTE: This signature must support `a` being undefined for the case where
     * the reactive property is initially undefined and only initialized in the constructor.
     */
    equal?: (a: ValueType | undefined, b: ValueType) => boolean;
};

/**
 * The type of the {@link reactiveProperty} decorator API.
 */
export interface ReactivePropertyDecorator extends ReactivePropertyDecoratorBase {
    /**
     * A decorator that creates a reactive class property with the given options.
     */
    configure<ValueType>(
        options: ReactiveDecoratorOptions<ValueType>
    ): ReactivePropertyDecoratorWithOptions<ValueType>;
}

/**
 * A decorator that creates a reactive class property.
 *
 * Using the decorator function directory creates a simple reactive property, for example:
 *
 * ```ts
 * import { reactiveProperty } from "@conterra/reactivity-decorators";
 *
 * class ReactiveClass {
 *     @reactiveProperty
 *     accessor value = 3;
 * }
 *
 * const obj = new ReactiveClass();
 * obj.value = 4; // reactive
 * ```
 *
 * You can also use {@link ReactivePropertyDecorator.configure} to customize the signal, for example to provide a custom equality function:
 *
 * ```ts
 * import { reactiveProperty } from "@conterra/reactivity-decorators";
 *
 * class ReactiveClass {
 *     @reactiveProperty.configure({
 *         equal(p1, p2) {
 *             return p1?.x === p2.x && p1?.y === p2.y;
 *         }
 *     })
 *     accessor point: Point;
 *
 *     constructor(point: Point) {
 *         this.point = point;
 *     }
 * }
 * ```
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const reactiveProperty: ReactivePropertyDecorator = Object.assign(
    (target: any, context: any) => defineReactiveProperty(target, context, undefined),
    {
        configure(options: ReactiveOptions<unknown>) {
            return (target: any, context: any) => defineReactiveProperty(target, context, options);
        }
    }
) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * A decorator that defines a new reactive property on the given target.
 *
 * This works by
 *
 * - Creating a signal using `reactive()` for the internal storage (in `init()`)
 * - Changing get and set to work on the provided signal instead of a raw value
 */
function defineReactiveProperty<This, Prop>(
    target: ClassAccessorDecoratorTarget<This, Prop>,
    _context: ClassAccessorDecoratorContext<This, Prop> & {
        static: false;
    },
    options?: ReactiveOptions<Prop> | undefined
): ClassAccessorDecoratorResult<This, Prop> {
    const getSignal = (instance: This) => {
        const signal = target.get.call(instance) as unknown;
        if (!isReactive(signal)) {
            throw new Error("Internal error: signal was not initialized.");
        }
        return signal;
    };

    return {
        get() {
            const signal = getSignal(this);
            return signal.value as Prop;
        },
        set(value) {
            const signal = getSignal(this);
            signal.value = value;
        },
        init(initialValue) {
            // XXX: Replaces the value of the internal field with a wrapping signal.
            // This changes the type of the field (which typescript really doesn't like).
            // The getter / setter above restore type safety, so this should not be a problem for
            // users of this property.
            // However, the signal might be visible in other decorators on the same property.
            //
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return reactive(initialValue, options) as any;
        }
    };
}
