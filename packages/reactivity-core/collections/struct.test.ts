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
    it("can be created with a simple string property", () => {
        const HasMsgClass = reactiveStruct<HasMessage>().define({
            msg: {}
        });
        const hasMsg = new HasMsgClass({ msg: "text" });
        expect(hasMsg.msg).toBe("text");
        hasMsg.msg = "changed_text";
        expect(hasMsg.msg).toBe("changed_text");
    });
    it("can be created with a simple string property providing type 'property'", () => {
        const HasMsgClass = reactiveStruct<HasMessage>().define({
            msg: { type: "property" }
        });
        const hasMsg = new HasMsgClass({ msg: "text" });
        expect(hasMsg.msg).toBe("text");
        hasMsg.msg = "changed_text";
        expect(hasMsg.msg).toBe("changed_text");
    });
    it("produces instances where properties can be found via 'in'", () => {
        const HasMsgClass = reactiveStruct<HasMessage>().define({
            msg: {}
        });
        const hasMsg = new HasMsgClass({ msg: "foo" });
        expect("msg" in hasMsg).toBe(true);
    });
    it("produces instances which can be used in Object.keys", () => {
        const HasMsgClass = reactiveStruct<HasMessage>().define({
            msg: {}
        });
        const hasMsg = new HasMsgClass({
            msg: "hi"
        });
        expect(Object.keys(hasMsg)).toEqual(["msg"]);
    });
    it("can have arrays as properties", () => {
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
    it("can have functions as members", () => {
        type WithFunction = HasMessage & {
            hello: () => string;
        };
        const Hello = reactiveStruct<WithFunction>().define({
            msg: {},
            hello: {
                type: "method",
                method() {
                    return this.msg;
                }
            }
        });
        const helloInstance = new Hello({ msg: "text" });
        expect(helloInstance.hello()).toBe("text");
    });
    it("can be created with a readonly string property initialized in the constructor", () => {
        const HasMsgClass = reactiveStruct<HasMessage>().define({
            msg: {
                writable: false
            }
        });
        const hasMsg = new HasMsgClass({ msg: "text" });
        expect(() => (hasMsg.msg = "not changeable")).toThrow(/Cannot set property msg/);
        expect(hasMsg.msg).toBe("text");
    });
    it("can be created with a readonly string property which is not initialized", () => {
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
    it("creates a constructor which can be used to initialize properties", () => {
        const HasMsgClass = reactiveStruct<HasMessage>().define({
            msg: {}
        });
        const hasMsg = new HasMsgClass({ msg: "text" });
        expect(hasMsg.msg).toBe("text");
    });
    it("can be initialized by constructor and properties are still reactive", () => {
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
    it("can have non reactive properties", () => {
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
    it("can be used with computed properties", () => {
        type ExtendedPersonType = PersonType & {
            fullName: string;
        };
        const PersonClass = reactiveStruct<ExtendedPersonType>().define({
            firstName: {},
            lastName: {},
            fullName: {
                type: "computed",
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
});
