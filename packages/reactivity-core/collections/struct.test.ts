import { it, expect, describe } from "vitest";
import { reactiveStruct } from "./struct";
import { computed } from "../ReactiveImpl";

type HasMessage = {
    msg: string;
};

type PersonType = {
    firstName: string;
    lastName: string;
};

describe("reactiveStruct", () => {
    it("has reactive properties", () => {
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
    it("has enumerable properties", () => {
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
    it("supports providing member types explicitly", () => {
        type ExtendedPersonType = PersonType & {
            fullName: string,
            printName: () => string
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
});
