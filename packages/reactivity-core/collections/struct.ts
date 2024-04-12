/* eslint-disable @typescript-eslint/no-explicit-any */

import { computed, reactive } from "../ReactiveImpl";

export interface SimpleMemberType {
    type?: "property"; // optional as 'property' is the default
    writable?: boolean;
    reactive?: boolean;
}
export interface FunctionTypeMemberType<T> {
    type: "function";
    function: (this: T, ...args: any) => any;
}
export interface ComputedMemberType<T> {
    type: "computed";
    compute: (self: T) => any;
}

export type ReactiveStructDefinition<T> = {
    [key in keyof T]: SimpleMemberType | FunctionTypeMemberType<T> | ComputedMemberType<T>;
};

export type ReactiveStructConstructor<T> = new (args?: Partial<T>) => T;

/**
 * Creates a reactive struct according to the given definition.
 * @param definition
 * @returns
 */
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
                    if (isSimpleMemberType(memberDef) && memberDef.writable === false) {
                        // in case the member is readonly
                        // we have to define a property on the instance itself
                        // as we cannot set the initial value on the prototype
                        const options = {
                            propertyKey: key,
                            reactive: memberDef.reactive,
                            writable: memberDef.writable,
                            value: value
                        };
                        defineProperty(this, options);
                    } else {
                        (this as any)[key] = value;
                    }
                });
            }
        }
    }
    defineProperties(ReactiveStruct.prototype, definition);
    return ReactiveStruct as ReactiveStructConstructor<T>;
}

function defineProperties<T>(target: any, definition: ReactiveStructDefinition<T>) {
    const propertyNames = Object.keys(definition) as (keyof T)[];
    propertyNames.forEach((propertyKey) => {
        const memberDef = definition[propertyKey];

        let opts: DefinePropertyOptions | undefined;
        if (isSimpleMemberType(memberDef)) {
            opts = {
                propertyKey,
                reactive: memberDef.reactive,
                writable: memberDef.writable,
                value: undefined
            };
        }

        if (memberDef.type === "function") {    
            opts = {
                propertyKey,
                reactive: false,
                writable: true,
                value: memberDef.function
            };
        }

        if (memberDef.type === "computed") {
            const c = computed(() => memberDef.compute(target));
            opts = {
                propertyKey,
                reactive: false,
                value: c.value
            };
        }

        if (opts == null) {
            throw new Error(`Invalid member definition for ${String(propertyKey)}`);
        }

        return defineProperty(target, opts);
    });
}

type DefinePropertyOptions = {
    propertyKey: PropertyKey;
    reactive?: boolean;
    writable?: boolean;
    value: any;
};
function defineProperty(target: any, options: DefinePropertyOptions) {
    const enumerable = true;

    if (options.reactive !== false) {
        const _reactiveValue = reactive(options.value);

        const attributes: any = {
            get: function () {
                return _reactiveValue.value;
            },
            enumerable
        };
        if (options.writable !== false) {
            attributes.set = function (newValue: any) {
                _reactiveValue.value = newValue;
            };
        }
        Object.defineProperty(target, options.propertyKey, attributes);
        return;
    }

    // not reactive
    Object.defineProperty(target, options.propertyKey, {
        value: options.value,
        writable: options.writable ?? true,
        enumerable
    });
}

function isSimpleMemberType<T>(member: any): member is SimpleMemberType {
    return member.type == null || member.type === "property";
}
