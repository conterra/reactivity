<script setup lang="ts">
// SPDX-FileCopyrightText: 2024-2025 con terra GmbH (https://www.conterra.de)
// SPDX-License-Identifier: Apache-2.0
import { ref } from "vue";
import { TodosModel } from "./TodosModel";
import { useReactiveSnapshot } from "./integration";
import TodoItem from "./TodoItem.vue";

const model = new TodosModel();
const snapshot = useReactiveSnapshot(() => {
    console.debug("todos reevaluated");
    return {
        todos: Array.from(model.todos.values()).reverse(),
        todosCount: model.todosCount
    };
});

const todoTitle = ref("");
function createTodo() {
    const title = todoTitle.value.trim();
    if (!title) {
        return;
    }

    const id = model.addTodo(title);
    console.debug("created a todo with id", id);
    todoTitle.value = "";
}
</script>
<template>
    <v-app>
        <v-container>
            <h1>Playground</h1>

            <h2 class="mt-4">Create Todo</h2>
            <p class="mt-2 mb-2">Use the form below to add new todo items to the list:</p>
            <v-card class="pa-2">
                <v-form @submit.prevent="createTodo">
                    <v-text-field v-model="todoTitle" label="Todo Title" />

                    <v-btn text="Create Todo" type="submit" block color="primary" size="x-large" />
                </v-form>
            </v-card>

            <h2 class="mt-4">All Todos</h2>

            There are {{ snapshot.todosCount }} todos.

            <v-card class="mt-2">
                <v-list v-if="snapshot.todos.length">
                    <template v-for="(todo, index) in snapshot.todos" :key="todo.id">
                        <v-divider v-if="index !== 0" />
                        <todo-item :todo="todo" @remove="model.removeTodo(todo.id)" />
                    </template>
                </v-list>
            </v-card>
        </v-container>
    </v-app>
</template>
