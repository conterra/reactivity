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
            defineMembers(this, definition);
            init(this, args);
        }
    }
    return ReactiveStruct as ReactiveStructConstructor<T>;
}

function defineMembers(target: any, definition: ReactiveStructDefinition<any>) {
    const propertyNames = Object.keys(definition);
    propertyNames.forEach((name) => {
        const field = definition[name];

        if (typeof field === "function") {
            return defineMember(
                {
                    classValue: field,
                    reactive: false
                },
                target,
                name
            );
        }

        if (typeof field === "object") {
            return defineMember(field, target, name);
        }

        // simple type
        return defineMember({ classValue: field }, target, name);
    });
}

function defineMember(member: MemberType<any>, instance: any, name: string | number | symbol) {
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


function init(target: any, args?: any) {
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
