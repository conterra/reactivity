/* eslint-disable @typescript-eslint/no-explicit-any */

import { reactive } from "../ReactiveImpl";

export type SimpleType = string | boolean | number | symbol;
export type FunctionType<T> = (this: T, ...args: any) => any;
export type MemberType<V> = {
    classValue?: V;
    writable?: boolean;
    reactive?: boolean;
};

export type ReactiveStructDefinition<T> = {
    [key in keyof T]: MemberType<T[key]> | FunctionType<T> | SimpleType;
};

export type ReactiveStructConstructor<T> = new (args?: Partial<T>) => T;

export function reactiveStruct<T>(
    definition: ReactiveStructDefinition<T>
): ReactiveStructConstructor<T> {
    class ReactiveStruct {
        constructor(args?: Partial<T>) {
            defineMembers<T>(this as any, definition);
            init<T>(this as any, args);
        }
    }
    return ReactiveStruct as ReactiveStructConstructor<T>;
}

function init<T>(target: T, args?: Partial<T>) {
    if (args != null) {
        Object.entries(args).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                (target as any)[key] = [...value];
            } else {
                (target as any)[key] = value;
            }
        });
    };
}


function defineMembers<T>(target: T, definition: ReactiveStructDefinition<T>) {
    const propertyNames = Object.keys(definition) as (keyof T)[];
    propertyNames.forEach((name) => {
        const field = definition[name];

        if (typeof field === "function") {
            return defineMember<T>(
                {
                    classValue: field,
                    reactive: false
                },
                target,
                name
            );
        }

        if (typeof field === "object") {
            return defineMember<T>(field, target, name);
        }

        // simple type
        return defineMember<T>({ classValue: field }, target, name);
    });
}

function defineMember<T>(member: MemberType<any>, instance: Partial<T>, name: string | number | symbol) {
    const enumerable = true;

    if (member.reactive !== false) {
        const _reactiveValue = reactive(member.classValue);

        const attributes: any = {
            get: function () {
                return _reactiveValue.value;
            },
            enumerable
        };
        if (member.writable !== false) {
            attributes.set = function (newValue: any) {
                _reactiveValue.value = newValue;
            };
        }
        Object.defineProperty(instance, name, attributes);
        return;
    }

    // not reactive
    Object.defineProperty(instance, name, {
        value: member.classValue,
        writable: member.writable ?? true,
        enumerable
    });
}
