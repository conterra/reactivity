import { computed, reactiveMap } from "@conterra/reactivity-core";
import { ReadonlyReactiveMap } from "@conterra/reactivity-core";

export interface Todo {
    id: string;
    title: string;
}

let nextId = 1;

export class TodosModel {
    #todos = reactiveMap<string, Todo>();
    #todosCount = computed(() => this.#todos.size);

    addTodo(title: string): string {
        const id = String(nextId++);
        this.#todos.set(id, {
            id,
            title
        });
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
