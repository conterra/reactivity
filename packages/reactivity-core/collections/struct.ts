/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, getValue, isWritableReactive, reactive } from "../ReactiveImpl";

export interface PropertyMemberType {
    type?: "property"; // optional as 'property' is the default
    writable?: boolean;
    reactive?: boolean;
}

export interface MethodMemberType<T, Params extends any[], Ret> {
    type?: "method";
    method: (this: T, ...args: Params) => Ret;
}

export interface ComputedMemberType<T, V> {
    type?: "computed";
    compute: (this: T) => V;
}

export type ReactiveStructDefinition<T> = {
    [key in keyof T]-?: GetMemberSchemaForProp<T, T[key]>;
};

type AnyFunc = (...args: any[]) => any;

/**
 * Computes which kind of property configuration are allowed for a given member,
 * based on the original TypeScript interface.
 *
 * If a member is a function, then the parameter types and the return type must match.
 * Computed properties must also return the required value type.
 */
type GetMemberSchemaForProp<T, V> = V extends AnyFunc
    ?
          | PropertyMemberType
          | MethodMemberType<T, Parameters<V>, ReturnType<V>>
          | ComputedMemberType<T, V>
    : PropertyMemberType | ComputedMemberType<T, V>;

/**
 * The class returned by TODO.
 */
export type ReactiveStructConstructor<T, Def> = new (
    ...args: ReactiveStructConstructorParams<T, Def>
) => T;

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

export interface ReactiveStructBuilder<T> {
    define<const Def extends ReactiveStructDefinition<T>>(
        def: Def
    ): ReactiveStructConstructor<T, Def>;
}

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

    // Initialization steps for certain properties.
    // These are run from the class instance's constructor to prepare an instance.
    type InitStep = (instance: any, storage: PrivateStorage, initialArgs?: Partial<T>) => void;
    const initSteps: InitStep[] = [];

    for (const propertyKey of propertyKeys) {
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
    const isReactive = options.reactive;

    const getter = function (this: any) {
        const storage = getPrivateStorage(this);
        return getValue(storage[key]);
    };

    let setter;
    if (options.writable) {
        setter = function (this: any, value: any) {
            const storage = getPrivateStorage(this);
            if (isReactive) {
                const signal = storage[key];
                if (!isWritableReactive(signal)) {
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
