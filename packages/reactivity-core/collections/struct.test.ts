import { it, expect, describe } from "vitest";
import { reactiveStruct } from "./struct";
import { computed } from "../ReactiveImpl";

describe("reactiveStruct", () => {
    it("can be created with a simple string property", () => {
        type HasMessage = {
            msg: string;
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: {}
        });
        const hasMsg = new HasMsgClass({msg: "text"});
        expect(hasMsg.msg).toBe("text");
        hasMsg.msg = "changed_text";
        expect(hasMsg.msg).toBe("changed_text");
    });
    it("produces instances where properties can be found via 'in'", () => {
        type HasMessage = {
            msg: string;
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: {}
        });
        const hasMsg = new HasMsgClass();
        expect("msg" in hasMsg).toBe(true);
    });
    it.skip("produces instance with properties in Object.keys", () => {
        type HasMessage = {
            msg: string;
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: {}
        });
        const hasMsg = new HasMsgClass();
        expect(Object.keys(hasMsg)).toContain("msg");
    });
    it("can have arrays as properties", () => {
        type HasMessages = {
            messages: string[];
        }
        const Class = reactiveStruct<HasMessages>({
            messages: {}
        });
        const messages = ["message1"];
        const instance = new Class({messages});
        expect(instance.messages.length).toBe(1);
        expect(instance.messages === messages).toBe(false);
    });
    it("can have functions as properties", () => {
        type HasMessage = {
            msg: string;
            hello: () => string
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: {},
            hello() {
                return this.msg;
            }
        });
        const hasMsg = new HasMsgClass({msg: "text" });
        expect(hasMsg.hello()).toBe("text");
    });
    it("can be created with a readonly string property initialized in the constructor", () => {
        type HasMessage = {
            msg: string;
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: {
                writable: false
            }
        });
        const hasMsg = new HasMsgClass({msg: "text" });
        expect(() => hasMsg.msg = "not changeable").toThrow(/Cannot set property msg/);
        expect(hasMsg.msg).toBe("text");
    });
    it("can be created with a readonly string property which is not initialized", () => {
        type HasMessage = {
            msg: string;
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: {
                writable: false
            }
        });
        const hasMsg = new HasMsgClass();
        expect(hasMsg.msg).toBe(undefined);
        expect("msg" in hasMsg).toBe(true);
        expect(() => hasMsg.msg = "not changeable").toThrow(/Cannot set property msg/);
    });
    it("has reactive properties", () => {
        type PersonType = {
            firstName: string;
            lastName: string
        }
        const PersonClass = reactiveStruct<PersonType>({
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
        type HasMessage = {
            msg: string;
            flag: boolean;
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: {},
            flag: {}
        });
        const hasMsg = new HasMsgClass({msg: "text"});
        expect(hasMsg.msg).toBe("text");
    });
    it("can be initialized by constructor and properties are still reactive", () => {
        type PersonType = {
            firstName: string;
            lastName: string
        }
        const PersonClass = reactiveStruct<PersonType>({
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
        type PersonType = {
            firstName: string;
            lastName: string
        }
        const PersonClass = reactiveStruct<PersonType>({
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
});
