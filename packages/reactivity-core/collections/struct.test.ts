import { it, expect, describe } from "vitest";
import { reactiveStruct } from "./struct";
import { computed } from "../ReactiveImpl";

describe("reactiveStruct", () => {
    it("can be created with a simple string property", () => {
        type HasMessage = {
            msg: string;
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: "text"
        });
        const hasMsg = new HasMsgClass();
        expect(hasMsg.msg).toBe("text");
        hasMsg.msg = "changed_text";
        expect(hasMsg.msg).toBe("changed_text");
        expect(Object.keys(hasMsg)).toContain("msg");
    });
    it("has enumerable properties", () => {
        type HasMessage = {
            msg: string;
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: {}
        });
        const hasMsg = new HasMsgClass();
        expect(Object.keys(hasMsg)).toContain("msg");
        expect("msg" in hasMsg).toBe(true);
        expect(hasMsg.msg).toBe(undefined);
    });
    it("can be created with string using a definition", () => {
        type HasMessage = {
            msg: string;
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: {
                classValue: "text"
            }
        });
        const hasMsg = new HasMsgClass();
        expect(hasMsg.msg).toBe("text");
        hasMsg.msg = "changed_text";
        expect(hasMsg.msg).toBe("changed_text");
    });
    it("can have array properties", () => {
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
            msg: "text",
            hello() {
                return this.msg;
            }
        });
        const hasMsg = new HasMsgClass();
        expect(hasMsg.hello()).toBe("text");
    });
    it("can be created with a readonly string property", () => {
        type HasMessage = {
            msg: string;
        }
        const HasMsgClass = reactiveStruct<HasMessage>({
            msg: {
                writable: false,
                classValue: "text"
            }
        });
        const hasMsg = new HasMsgClass();
        expect(() => hasMsg.msg = "not changeable").toThrow(/Cannot set property msg/);
        expect(hasMsg.msg).toBe("text");
    });
    it("has reactive properties", () => {
        type PersonType = {
            firstName: string;
            lastName: string
        }
        const PersonClass = reactiveStruct<PersonType>({
            firstName: "John",
            lastName: "Doe"
        });
        const person = new PersonClass();
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
            firstName: "John",
            lastName: {
                classValue: "Doe",
                reactive: false
            }
        });
        const person = new PersonClass();
        const fullName = computed(() => `${person.firstName} ${person.lastName}`);
        expect(fullName.value).toBe("John Doe");

        person.firstName = "Jane";
        expect(fullName.value).toBe("Jane Doe");

        person.lastName = "Miller";
        expect(fullName.value).toBe("Jane Doe");
    });
});
