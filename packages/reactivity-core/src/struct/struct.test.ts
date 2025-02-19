import { it, expect, describe } from "vitest";
import { reactiveStruct } from "./struct";
import { computed } from "../signals";

type HasMessage = {
    msg: string;
};

type PersonType = {
    firstName: string;
    lastName: string;
};

describe("reactiveStruct", () => {
    it("produces reactive properties", () => {
        const PersonClass = reactiveStruct<PersonType>().define({
            firstName: {},
            lastName: {}
        });
        const person = new PersonClass({
            firstName: "John",
            lastName: "Doe"
        });
        const fullName = computed(() => `${person.firstName} ${person.lastName}`);
        expect(fullName.value).toBe("John Doe");

        person.firstName = "Jane";
        expect(fullName.value).toBe("Jane Doe");
    });
    it("produces enumerable properties", () => {
        const PersonClass = reactiveStruct<PersonType>().define({
            firstName: {},
            lastName: {}
        });
        const person = new PersonClass({
            firstName: "John",
            lastName: "Doe"
        });
        expect("firstName" in person).toBe(true);
        expect(Object.keys(person)).toEqual(["firstName", "lastName"]);
    });
    it("supports array properties", () => {
        type HasMessages = {
            messages: string[];
        };
        const Class = reactiveStruct<HasMessages>().define({
            messages: {}
        });
        const messages = ["message1"];
        const instance = new Class({ messages });
        expect(instance.messages).toEqual(["message1"]);
    });
    it("supports method properties", () => {
        type WithFunction = HasMessage & {
            hello: () => string;
        };
        const Hello = reactiveStruct<WithFunction>().define({
            msg: {},
            hello: {
                method() {
                    return this.msg;
                }
            }
        });
        const helloInstance = new Hello({ msg: "text" });
        expect(helloInstance.hello()).toBe("text");
    });
    it("supports readonly properties", () => {
        const HasMsgClass = reactiveStruct<HasMessage>().define({
            msg: {
                writable: false
            }
        });
        const hasMsg = new HasMsgClass({ msg: "text" });
        expect(() => (hasMsg.msg = "not changeable")).toThrow(/Cannot set property msg/);
        expect(hasMsg.msg).toBe("text");
    });
    it("supports readonly properties initialized to 'undefined'", () => {
        const HasMsgClass = reactiveStruct<Partial<HasMessage>>().define({
            msg: {
                writable: false
            }
        });
        const hasMsg = new HasMsgClass();
        expect(hasMsg.msg).toBe(undefined);
        expect("msg" in hasMsg).toBe(true);
        expect(() => (hasMsg.msg = "not changeable")).toThrow(/Cannot set property msg/);
    });
    it("supports non reactive properties", () => {
        const PersonClass = reactiveStruct<PersonType>().define({
            firstName: {},
            lastName: {
                reactive: false
            }
        });
        const person = new PersonClass({
            firstName: "John",
            lastName: "Doe"
        });
        const fullName = computed(() => `${person.firstName} ${person.lastName}`);
        expect(fullName.value).toBe("John Doe");

        person.firstName = "Jane";
        expect(fullName.value).toBe("Jane Doe");

        person.lastName = "Miller";
        expect(fullName.value).toBe("Jane Doe");
    });
    it("supports computed properties", () => {
        type ExtendedPersonType = PersonType & {
            fullName: string;
        };
        const PersonClass = reactiveStruct<ExtendedPersonType>().define({
            firstName: {},
            lastName: {},
            fullName: {
                compute() {
                    return `${this.firstName} ${this.lastName}`;
                }
            }
        });
        const person = new PersonClass({
            firstName: "John",
            lastName: "Doe"
        });
        expect(person.fullName).toBe("John Doe");

        person.firstName = "Jane";
        expect(person.fullName).toBe("Jane Doe");
    });
    it("supports a property called 'method'", () => {
        interface Obj {
            method: number;
        }

        const ObjClass = reactiveStruct<Obj>().define({
            method: {}
        });

        const obj = new ObjClass({
            method: 123
        });
        expect(obj.method).toBe(123);

        obj.method = 456;
        expect(obj.method).toBe(456);
    });
    it("supports defining member types explicitly", () => {
        type ExtendedPersonType = PersonType & {
            fullName: string;
            printName: () => string;
        };
        const PersonClass = reactiveStruct<ExtendedPersonType>().define({
            firstName: {
                type: "property"
            },
            lastName: {
                type: "property"
            },
            fullName: {
                type: "computed",
                compute() {
                    return `${this.firstName} ${this.lastName}`;
                }
            },
            printName: {
                type: "method",
                method() {
                    return this.fullName;
                }
            }
        });
        const person = new PersonClass({
            firstName: "John",
            lastName: "Doe"
        });
        expect(person.printName()).toBe("John Doe");

        person.firstName = "Jane";
        expect(person.printName()).toBe("Jane Doe");
    });
    it("supports all types as property types", () => {
        const mySymbol = Symbol("abc");

        type ComplexType = {
            str: string;
            num: number;
            bool: boolean;
            sym: symbol;
            nul: null;
            undef: undefined;
            obj: object;
        };
        const MyClass = reactiveStruct<ComplexType>().define({
            str: {},
            num: {},
            bool: {},
            sym: {},
            nul: {},
            undef: {},
            obj: {}
        });
        const myInstance = new MyClass({
            str: "string",
            num: 123,
            bool: true,
            sym: mySymbol,
            nul: null,
            undef: undefined,
            obj: {}
        });
        expect(myInstance.str).toBe("string");
        expect(myInstance.num).toBe(123);
        expect(myInstance.bool).toBe(true);
        expect(myInstance.sym).toBe(mySymbol);
        expect(myInstance.nul).toBe(null);
        expect(myInstance.undef).toBe(undefined);
        expect(myInstance.obj).toEqual({});
    });
    it("supports symbols as property keys", () => {
        const mySymbol = Symbol("abc");
        type ComplexType = {
            [mySymbol]: string;
        };
        const MyClass = reactiveStruct<ComplexType>().define({
            [mySymbol]: {}
        });
        const myInstance = new MyClass({
            [mySymbol]: "text"
        });
        const symbolVal = computed(() => myInstance[mySymbol]);
        expect(symbolVal.value).toBe("text");
        myInstance[mySymbol] = "new text";
        expect(symbolVal.value).toBe("new text");
    });
    it("supports computed properties using private symbols", () => {
        const mySymbol = Symbol("abc");
        type ComplexType = {
            [mySymbol]: string;
            getSymbolValue: string;
        };
        const MyClass = reactiveStruct<ComplexType>().define({
            [mySymbol]: {},
            getSymbolValue: {
                compute() {
                    return `Symbol value is '${String(this[mySymbol])}'`;
                }
            }
        });
        const myInstance = new MyClass({
            [mySymbol]: "123"
        });
        const symbolVal = myInstance.getSymbolValue;
        expect(symbolVal).toBe("Symbol value is '123'");
    });
    it("creates independent instances", () => {
        type ExtendedPersonType = PersonType & {
            fullName: string;
            printName: () => string;
        };
        const PersonClass = reactiveStruct<ExtendedPersonType>().define({
            firstName: {},
            lastName: {},
            fullName: {
                compute() {
                    return `${this.firstName} ${this.lastName}`;
                }
            },
            printName: {
                method() {
                    return this.fullName;
                }
            }
        });
        const person1 = new PersonClass({
            firstName: "John",
            lastName: "Doe"
        });
        const person2 = new PersonClass({
            firstName: "Jane",
            lastName: "Doe"
        });
        expect(person1.printName()).toBe("John Doe");
        expect(person2.printName()).toBe("Jane Doe");

        const familyMembers = computed(() => `${person1.firstName} ${person2.firstName}`);
        expect(familyMembers.value).toBe("John Jane");

        person1.firstName = "James";
        expect(familyMembers.value).toBe("James Jane");
        person2.firstName = "Samantha";
        expect(familyMembers.value).toBe("James Samantha");
    });
    it("uses current values of reactive properties for initialization", () => {
        const PersonClass = reactiveStruct<PersonType>().define({
            firstName: {},
            lastName: {}
        });
        const person1 = new PersonClass({
            firstName: "John",
            lastName: "Doe"
        });
        const person2 = new PersonClass({
            firstName: "Jimmy",
            lastName: person1.lastName // current value is used to create Person 2
        });
        person1.lastName = "Cooper";
        expect(person2.lastName).toBe("Doe");
    });
    it("supports nested reactive structs", () => {
        type Address = {
            street: string;
            city: string;
        };
        type PersonType = {
            name: string;
            address: Address;
            printAddress: () => string;
        };
        const AddressClass = reactiveStruct<Address>().define({
            street: {},
            city: {}
        });
        const PersonClass = reactiveStruct<PersonType>().define({
            name: {},
            address: {},
            printAddress: {
                method() {
                    return `${this.name} lives at ${this.address.street}, ${this.address.city}`;
                }
            }
        });
        const address = new AddressClass({
            street: "123 Main St",
            city: "Springfield"
        });
        const person = new PersonClass({
            name: "John",
            address
        });
        expect(person.address.city).toBe("Springfield");
        expect(person.printAddress()).toBe("John lives at 123 Main St, Springfield");
        address.city = "New York";
        expect(person.printAddress()).toBe("John lives at 123 Main St, New York");
    });
    it("supports nested reactive structs with computed properties", () => {
        type Address = {
            street: string;
            city: string;
        };
        type PersonType = {
            name: string;
            address: Address;
            fullAddress: string;
        };
        const AddressClass = reactiveStruct<Address>().define({
            street: {},
            city: {}
        });
        const PersonClass = reactiveStruct<PersonType>().define({
            name: {},
            address: {},
            fullAddress: {
                compute() {
                    return `${this.name} lives at ${this.address.street}, ${this.address.city}`;
                }
            }
        });
        const address = new AddressClass({
            street: "123 Main St",
            city: "Springfield"
        });
        const person = new PersonClass({
            name: "John",
            address
        });
        expect(person.address.city).toBe("Springfield");
        expect(person.fullAddress).toBe("John lives at 123 Main St, Springfield");
        address.city = "New York";
        expect(person.fullAddress).toBe("John lives at 123 Main St, New York");
    });
    it("creates constructors where optional properties do not have to be initialized", () => {
        interface ComplexType {
            a: string | undefined;
            b: undefined;
            c?: string;
            d: string;

            computedProperty: string;
            method(): number;
        }

        const ComplexClass = reactiveStruct<ComplexType>().define({
            a: {},
            b: {},
            c: {},
            d: {},

            computedProperty: {
                type: "computed",
                compute() {
                    return "foo";
                }
            },
            method: {
                type: "method",
                method() {
                    return 3;
                }
            }
        });

        const person = new ComplexClass({ d: "bar" }); // a, b, c are not initialized
        expect(person.a).toBe(undefined);
        expect(person.b).toBe(undefined);
        expect(person.c).toBe(undefined);
        expect(person.d).toBe("bar");
    });
    it("creates a no args constructor if all properties are optional", () => {
        interface ComplexType {
            a?: string;
            computedProperty: string;
            method(): number;
        }

        const ComplexClass = reactiveStruct<ComplexType>().define({
            a: {},
            computedProperty: {
                type: "computed",
                compute() {
                    return "foo";
                }
            },
            method: {
                type: "method",
                method() {
                    return 3;
                }
            }
        });

        const person = new ComplexClass(); // no args provided
        expect(person.a).toBe(undefined);
    });

    it("supports instanceof", () => {
        const PersonClass = reactiveStruct<PersonType>().define({
            firstName: {},
            lastName: {}
        });
        const person = new PersonClass({
            firstName: "John",
            lastName: "Doe"
        });
        expect(person instanceof PersonClass).toBe(true);
    });
    it("supports prototype", () => {
        const PersonClass = reactiveStruct<PersonType>().define({
            firstName: {},
            lastName: {}
        });
        expect(PersonClass.prototype).toBeInstanceOf(Object);

        const person = new PersonClass({
            firstName: "a",
            lastName: "b"
        });
        expect(person).toBeInstanceOf(PersonClass);
    });
    it("throws when properties starting with '$' are used (these are reserved)", () => {
        expect(() => {
            reactiveStruct<{ $: number }>().define({
                $: {}
            });
        }).toThrowErrorMatchingInlineSnapshot(
            `[Error: Properties starting with '$' are reserved.]`
        );
    });
    it("supports boolean values as computed properties", () => {
        // For this test to pass, we had to prevent the return type of
        // the computed property being calculated to true | false.
        type MyType = {
            boolA: boolean;
            boolB: boolean;
        };
        const MyClass = reactiveStruct<MyType>().define({
            boolA: {},
            boolB: {
                compute() {
                    return this.boolA;
                }
            }
        });
        const myInstance = new MyClass({
            boolA: true
        });
        expect(myInstance.boolB).toBe(true);
    });
});
