// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import {
    ReactiveOptions,
    computed,
    isReactive,
    isReadonlyReactive,
    reactive
} from "@conterra/reactivity-core";

export interface ReactivePropertyDecoratorApi {
    <This, Prop>(
        target: ClassAccessorDecoratorTarget<This, Prop>,
        context: ClassAccessorDecoratorContext<This, Prop> & {
            static: false;
        }
    ): ClassAccessorDecoratorResult<This, Prop>;

    withOptions<Prop>(options: ReactiveOptions<Prop>): <This>(
        target: ClassAccessorDecoratorTarget<This, Prop>,
        context: ClassAccessorDecoratorContext<This, Prop> & {
            static: false;
        }
    ) => ClassAccessorDecoratorResult<This, Prop>;
}

export const reactiveProperty = Object.assign(defineReactiveProperty, {
    withOptions(options: ReactiveOptions<unknown>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (target: any, context: any) => defineReactiveProperty(target, context, options);
    }
}) as ReactivePropertyDecoratorApi;

export interface ComputedPropertyDecoratorApi {
    <This, Prop>(
        target: () => Prop,
        context: ClassGetterDecoratorContext<This, Prop> & {
            static: false;
        }
    ): () => Prop;

    withOptions<Prop>(options: ReactiveOptions<Prop>): <This>(
        target: () => Prop,
        context: ClassGetterDecoratorContext<This, Prop> & {
            static: false;
        }
    ) => () => Prop;
}

export const computedProperty = Object.assign(defineComputedProperty, {
    withOptions(options: ReactiveOptions<unknown>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (target: any, context: any) => defineComputedProperty(target, context, options);
    }
}) as ComputedPropertyDecoratorApi;

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

function defineComputedProperty<This, Prop>(
    target: () => Prop,
    context: ClassGetterDecoratorContext<This, Prop> & {
        static: false;
    },
    options?: ReactiveOptions<Prop> | undefined
): () => Prop {
    const COMPUTED_KEY = Symbol(
        process.env.NODE_ENV === "development" ? `computed_${context.name.toString()}` : undefined
    );

    context.addInitializer(function () {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this as any)[COMPUTED_KEY] = computed(() => {
            return target.call(this);
        }, options);
    });

    return function getComputedProperty(this: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const signal = (this as any)[COMPUTED_KEY];
        if (!isReadonlyReactive(signal)) {
            throw new Error("Internal error: computed signal was not initialized.");
        }
        return signal.value;
    };
}
