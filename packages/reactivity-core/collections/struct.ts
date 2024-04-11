/* eslint-disable @typescript-eslint/no-explicit-any */

import { reactive } from "../ReactiveImpl";

export type FunctionType<T> = (this: T, ...args: any) => any;
export type MemberType = {
    writable?: boolean;
    reactive?: boolean;
};

export type ReactiveStructDefinition<T> = {
    [key in keyof T]: MemberType | FunctionType<T>;
};

export type ReactiveStructConstructor<T> = new (args?: Partial<T>) => T;

export function reactiveStruct<T>(
    definition: ReactiveStructDefinition<T>
): ReactiveStructConstructor<T> {
    class ReactiveStruct {
        constructor(initialValues?: Partial<T>) {
            if (initialValues) {
                Object.entries(initialValues).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        value = [...value];
                    }
                    const memberDef = definition[key as keyof T];
                    const isMemberType = typeof memberDef === "object";
                    if (isMemberType && memberDef.writable === false) {
                        // in case the member is readonly
                        // we have to define a member on the instance itself
                        // as we cannot set the value on the prototype
                        defineMember(memberDef, this, key, value);
                    } else {
                        (this as any)[key] = value;
                    }
                });
            }
        }
    }
    defineMembers(ReactiveStruct.prototype, definition);
    return ReactiveStruct as ReactiveStructConstructor<T>;
}

function defineMembers<T>(target: any, definition: ReactiveStructDefinition<T>, value?: any) {
    const propertyNames = Object.keys(definition) as (keyof T)[];
    propertyNames.forEach((name) => {
        const field = definition[name];

        if (typeof field === "function") {
            return defineMember(
                {
                    reactive: false
                },
                target,
                name,
                field
            );
        }

        if (typeof field === "object") {
            return defineMember(field, target, name, value);
        }

        throw new Error(`Invalid member definition for ${String(name)}`);
    });
}

function defineMember(member: MemberType, instance: any, name: string | number | symbol, value: any = undefined) {
    const enumerable = true;

    if (member.reactive !== false) {
        const _reactiveValue = reactive(value);

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
        value,
        writable: member.writable ?? true,
        enumerable
    });
}

