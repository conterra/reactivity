// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, getValue, isReactive, reactive } from "../signals";

/**
 * A property of a reactive struct.
 *
 * @group Struct
 */
export interface PropertyMemberType {
    /**
     * Type to indicate that this member is a property.
     */
    type?: "property";
    /**
     * If `true` the property is writable and it can be changed.
     * If `false` the property is read-only.
     * Default is `true`.
     */
    writable?: boolean;

    /**
     * If `true` the property is reactive.
     * If `false` the property is not reactive.
     * Default is `true`.
     */
    reactive?: boolean;
}

/**
 * A method of a reactive struct.
 *
 * @group Struct
 */
export interface MethodMemberType<T, Params extends any[], Ret> {
    /**
     * Type to indicate that this member is a method.
     */
    type?: "method";
    /**
     * The method of the struct.
     */
    method: (this: T, ...args: Params) => Ret;
}

/**
 * A computed property of a reactive struct.
 *
 * @group Struct
 */
export interface ComputedMemberType<T, V> {
    /**
     * Type to indicate that this member is a computed property.
     */
    type?: "computed";
    /**
     * The function to compute the value of the property.
     */
    compute: (this: T) => V;
}

/**
 * Definition of a reactive struct.
 * All properties of T must be part of the definition.
 *
 * @param T The type of the struct.
 * @group Struct
 */
export type ReactiveStructDefinition<T> = {
    [key in keyof T]-?: GetMemberSchemaForProp<T, T[key]>;
};

/**
 * Any function.
 */
type AnyFunc = (...args: any[]) => any;

/**
 * Computes which kind of property configuration are allowed for a given member,
 * based on the original TypeScript interface.
 *
 * If a member is a function, then the parameter types and the return type must match.
 * Computed properties must also return the required value type.
 *
 * @param T The type of the struct.
 * @param V The value of the property.
 */
type GetMemberSchemaForProp<T, V> = [V] extends [AnyFunc]
    ? // V is wrapped in an array to prevent distributive conditional types
      // see https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
      | PropertyMemberType
          | MethodMemberType<T, Parameters<V>, ReturnType<V>>
          | ComputedMemberType<T, V>
    : PropertyMemberType | ComputedMemberType<T, V>;

/**
 * Constructor for reactive struct instances {@link reactiveStruct}.
 *
 * @param T The type of the struct.
 * @param Def The definition of the struct.
 * @group Struct
 */
export interface ReactiveStructConstructor<T, Def> {
    /**
     * Creates a new reactive struct instance.
     */
    new (...args: ReactiveStructConstructorParams<T, Def>): T;
}

/**
 * Computes the constructor parameters type.
 *
 * If the type has a required property (i.e. a property that needs an initial value), then the parameter object is also required.
 * If all properties can be optional, then the parameter object is also optional.
 */
type ReactiveStructConstructorParams<T, Def> = ConstructorArgs<
    ConstructorProps<PropertyMembers<T, Def>>
>;

/**
 * Makes the properties object optional if all properties are optional (i.e. if `{}` would be a valid value).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type ConstructorArgs<Props> = {} extends Props ? [initialValues?: Props] : [initialValues: Props];

/**
 * Inspects `T` and `Def` and only picks those properties of T that are defined to be properties.
 */
type PropertyMembers<T, Def> = {
    [Key in keyof Def as Def[Key] extends PropertyMemberType ? Key : never]: Key extends keyof T
        ? T[Key]
        : never;
};

/**
 * This helper type inspects `Members` and makes all properties optional that may be undefined.
 * All other properties are made required.
 */
type ConstructorProps<Members> = Partial<PickOptionalProps<Members>> &
    Required<Omit<Members, keyof PickOptionalProps<Members>>>;

/**
 * Returns a type where only those properties of T remain that may be undefined.
 */
type PickOptionalProps<T> = {
    [Key in keyof T as undefined extends T[Key] ? Key : never]: T[Key];
};

/**
 * Used to build reactive structs using a struct definition.
 *
 * @group Struct
 */
export interface ReactiveStructBuilder<T> {
    /**
     * Create a new reactive struct class based on the provided definition.
     */
    define<const Def extends ReactiveStructDefinition<T>>(
        def: Def
    ): ReactiveStructConstructor<T, Def>;
}

/**
 * Creates a reactive structs with the help of the returned builder.
 *
 * A reactive struct is a class like object that can contain properties, computed properties and methods.
 * By default all properties are reactive and writable.
 *
 * #### Create a reactive struct
 *
 * To create a reactive struct proceed as follows:
 *
 * 1. Define the type of the struct.
 *     ```ts
 *     type PersonType = {
 *         firstName: string;
 *         lastName: string;
 *     }
 *     ```
 *
 * 2. Create a definition for the struct according to the type.
 *     ```ts
 *     const personDefinition: ReactiveStructDefinition<PersonType> = {
 *         firstName: {}, // default options (reactive and writable)
 *         lastName: {}   // default options (reactive and writable)
 *     };
 *     ```
 *
 * 3. Create a new reactive struct class based on the provided definition.
 *     ```ts
 *     const PersonClass = reactiveStruct<PersonType>().define(personDefinition);
 *     ```
 *
 * 4. Create a new instance of the struct.
 *     ```ts
 *     const person = new PersonClass({
 *         firstName: "John",
 *         lastName: "Doe"
 *     });
 *     ```
 * 5. Use the created instance.
 *
 *    Now, you can use the person instance for example to compute the person's full name.
 *
 *    ```ts
 *    const fullName = computed(() => `${person.firstName} ${person.lastName}`);
 *    console.log(fullName.value); // John Doe
 *    person.firstName = "Jane";
 *    console.log(fullName.value); // Jane Doe
 *    ```
 *
 * #### Options for simple properties
 *
 * The following options can be set for properties in the struct definition:
 * - `writable`: if `true` the property is writable and it can be changed (the default). If `false` the property is read-only.
 * - `reactive`: if `true` the property is reactive (the default). If `false` the property is not reactive.
 *
 * To define a read-only property set `writable` to `false`:
 * ```ts
 * type PersonType = {
 *     readonly lastName: string;
 * }
 * const personDefinition: ReactiveStructDefinition<PersonType> = {
 *     lastName: { writable: false }
 * };
 * const PersonClass = reactiveStruct<PersonType>().define(personDefinition);
 * const person = new PersonClass({
 *     lastName: "Doe"
 * });
 * person.lastName = "Smith"; // type error, throws error at runtime
 * ```
 *
 * To define a non reactive property set `reactive` to `false`:
 * ```ts
 * const personDefinition: ReactiveStructDefinition<PersonType> = {
 *     firstName: {},
 *     lastName: { reactive: false }
 * };
 * const PersonClass = reactiveStruct<PersonType>().define(personDefinition);
 * const person = new PersonClass({
 *     firstName: "John",
 *     lastName: "Doe"
 * });
 * const fullName = computed(() => `${person.firstName} ${person.lastName}`);
 * person.lastName = "Miller";
 * console.log(fullName.value); // John Miller
 * ```
 *
 * #### Computed properties
 *
 * Computed properties are properties that are computed based on other properties.
 * They can be defined in the struct definition as follows:
 *
 * ```ts
 * type PersonType = {
 *     firstName: string;
 *     lastName: string;
 *     fullName: string;
 * };
 * const personDefinition: ReactiveStructDefinition<PersonType> = {
 *     firstName: {},
 *     lastName: {},
 *     fullName: {
 *         compute() {
 *             return `${this.firstName} ${this.lastName}`;
 *         }
 *     }
 * };
 * const PersonClass = reactiveStruct<PersonType>().define(personDefinition);
 * const person = new PersonClass({
 *     firstName: "John",
 *     lastName: "Doe"
 * });
 * console.log(person.fullName); // John Doe
 * person.firstName = "Jane";
 * console.log(person.fullName); // Jane Doe
 * ```
 *
 * #### Methods
 *
 * You can also define methods in the struct definition:
 *
 * ```ts
 * type PersonType = {
 *     firstName: string;
 *     lastName: string;
 *     printName: () => void;
 * };
 * const personDefinition: ReactiveStructDefinition<PersonType> = {
 *     firstName: {},
 *     lastName: {},
 *     printName: {
 *         method() {
 *             return console.log(`${this.firstName} ${this.lastName}`);
 *         }
 *     }
 * };
 * const PersonClass = reactiveStruct<PersonType>().define(personDefinition);
 * const person = new PersonClass({
 *     firstName: "John",
 *     lastName: "Doe"
 * });
 * person.printName(); // prints "John Doe"
 * ```
 *
 * > NOTE:
 * > All strings or symbols are allowed as property names, _except_ for strings starting with '$'.
 * > Strings starting with '$' are reserved for future extensions.
 *
 * @group Struct
 */
export function reactiveStruct<T>(): ReactiveStructBuilder<T> {
    return {
        define(definition) {
            class ReactiveStruct {
                constructor(initialValues?: Partial<T>) {
                    prepareResult.prepareInstance(this, initialValues);
                }
            }
            const prepareResult = preparePrototype(ReactiveStruct.prototype, definition);
            return ReactiveStruct as any;
        }
    };
}

const PRIVATE_STORAGE = Symbol("private_storage");

interface ReactiveStructImpl {
    /**
     * Private storage associated with every struct.
     * key: property name, value: raw value or signal
     *
     * Property getters and setters use this record to read/write instance values.
     */
    [PRIVATE_STORAGE]: PrivateStorage;
}

type PrivateStorage = Record<string | symbol, any>;

interface PrepareResult<T> {
    /**
     * Function that must be called on every new instance to initialize
     * the private storage.
     *
     * @param instance the new instance, not yet fully initialized
     * @param initialValues the constructor parameter (if any)
     */
    prepareInstance: (instance: any, initialValues?: Partial<T>) => void;
}

/**
 * Prepares the given prototype using the provided struct definition.
 * The return result can be used to initialize class instances.
 */
function preparePrototype<T>(
    prototype: any,
    definition: ReactiveStructDefinition<T>
): PrepareResult<T> {
    const propertyKeys = Object.keys(definition) as (keyof T & (string | symbol))[];
    const propertySymbols = Object.getOwnPropertySymbols(definition) as (keyof T & symbol)[];
    const allKeys = [...propertyKeys, ...propertySymbols];

    // Initialization steps for certain properties.
    // These are run from the class instance's constructor to prepare an instance.
    type InitStep = (instance: any, storage: PrivateStorage, initialArgs?: Partial<T>) => void;
    const initSteps: InitStep[] = [];

    for (const propertyKey of allKeys) {
        if (typeof propertyKey === "string" && propertyKey.startsWith("$")) {
            throw new Error("Properties starting with '$' are reserved.");
        }

        const memberDef = definition[propertyKey];
        if ("method" in memberDef) {
            Object.defineProperty(prototype, propertyKey, {
                enumerable: true,
                writable: true,
                value: memberDef.method
            });
        } else if ("compute" in memberDef) {
            const desc = prepareInstanceProperty({
                propertyKey,
                reactive: true,
                writable: false
            });

            initSteps.push((instance, storage) => {
                storage[propertyKey] = computed(() => {
                    return (memberDef.compute as any).call(instance);
                });
                Object.defineProperty(instance, propertyKey, desc);
            });
        } else {
            const isReactive = memberDef.reactive ?? true;
            const isWritable = memberDef.writable ?? true;
            const desc = prepareInstanceProperty({
                propertyKey,
                reactive: isReactive,
                writable: isWritable
            });

            initSteps.push((instance, storage, initialArgs) => {
                const initValue = getValue<any>(initialArgs?.[propertyKey]);
                if (!isReactive) {
                    storage[propertyKey] = initValue;
                } else {
                    storage[propertyKey] = reactive(initValue);
                }
                Object.defineProperty(instance, propertyKey, desc);
            });
        }
    }

    return {
        prepareInstance(instance, initialValues) {
            const storage = ((instance as ReactiveStructImpl)[PRIVATE_STORAGE] = {});
            for (const step of initSteps) {
                step(instance, storage, initialValues);
            }
        }
    };
}

/**
 * Configuration for a simple property (neither method nor computed).
 */
interface PropertyConfig {
    propertyKey: PropertyKey;
    reactive: boolean;
    writable: boolean;
}

/**
 * Prepares an instance property based on the original struct definition.
 *
 * Instance properties are defined on the object _instance_, not the prototype, to make them
 * compatible with normal javascript classes.
 *
 * The descriptor returned here is stored and will be used from the instance constructor.
 */
function prepareInstanceProperty(options: PropertyConfig): PropertyDescriptor {
    const key = options.propertyKey;
    const reactiveProperty = options.reactive;

    const getter = function (this: any) {
        const storage = getPrivateStorage(this);
        const data = storage[key];
        if (reactiveProperty) {
            return getValue(data);
        }
        return data;
    };

    let setter;
    if (options.writable) {
        setter = function (this: any, value: any) {
            const storage = getPrivateStorage(this);
            if (reactiveProperty) {
                const signal = storage[key];
                if (!isReactive(signal)) {
                    throw new Error("internal error: property must be a writable signal");
                }
                signal.value = value;
            } else {
                storage[key] = value;
            }
        };
    }

    const desc: PropertyDescriptor = {
        enumerable: true,
        get: getter
    };
    if (setter) {
        desc.set = setter;
    }
    return desc;
}

/**
 * Returns the private storage object that contains the actual property values (or signals)
 * of the reactive struct.
 */
function getPrivateStorage(instance: any): PrivateStorage {
    if (!instance || !instance[PRIVATE_STORAGE]) {
        throw new Error("internal error: object is not a reactive struct");
    }
    return instance[PRIVATE_STORAGE];
}
