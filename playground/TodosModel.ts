// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { computed, reactiveMap, reactiveStruct } from "@conterra/reactivity-core";
import { ReadonlyReactiveMap } from "@conterra/reactivity-core";

export interface Todo {
    readonly id: string;
    title: string;
}

const Todo = reactiveStruct<Todo>().define({
    id: {
        writable: false
    },
    title: {}
});

let nextId = 1;

export class TodosModel {
    #todos = reactiveMap<string, Todo>();
    #todosCount = computed(() => this.#todos.size);

    addTodo(title: string): string {
        const id = String(nextId++);
        this.#todos.set(id, new Todo({ id, title }));
        return id;
    }

    removeTodo(id: string) {
        const removed = this.#todos.delete(id);
        if (!removed) {
            throw new Error(`Todo with id ${id} was not found.`);
        }
    }

    get todos(): ReadonlyReactiveMap<string, Readonly<Todo>> {
        return this.#todos;
    }

    get todosCount(): number {
        return this.#todosCount.value;
    }
}
