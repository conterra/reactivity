<script setup lang="ts">
import { computed, reactive } from "vue";
import { Todo } from "./TodosModel";

const props = defineProps<{
    todo: Todo;
}>();

defineEmits<{
    remove: [];
}>();

interface EditDialogState {
    open: boolean;
    title: string;
}

// Temp storage for editable properties (not applied directly to the model).
const editState = reactive<EditDialogState>({
    open: false,
    title: ""
});

function startEdit() {
    console.debug("start edit", props.todo.id);

    const todo = props.todo;
    editState.title = todo.title;
    editState.open = true;
}

function stopEdit(saveChanges = false) {
    console.debug("stop edit", props.todo.id);
    if (!editState.open) {
        return;
    }

    if (saveChanges) {
        const todo = props.todo;
        todo.title = editState.title;
    }

    // Also hides the dialog
    editState.open = false;
    editState.title = "";
}

// The dialog's v-model is derived from the edit state.
const dialogModel = computed({
    get: () => editState.open,
    set: (open) => {
        if (!open) {
            stopEdit();
        }
    }
});
</script>

<template>
    <v-list-item>
        <v-list-item-title>{{ todo.title }}</v-list-item-title>

        <template #append>
            <v-dialog v-model="dialogModel" max-width="500">
                <template #activator="{ props: activatorProps }">
                    <v-btn
                        v-bind="activatorProps"
                        icon="mdi-pencil"
                        aria-label="Edit todo"
                        variant="text"
                        @click.stop.prevent="startEdit"
                    />
                </template>

                <template #default="{ isActive }">
                    <v-card title="Dialog">
                        <v-card-text>
                            <v-form @submit.prevent="stopEdit(true)">
                                <v-text-field v-model="editState.title" label="Todo Title" />
                            </v-form>
                        </v-card-text>

                        <v-card-actions>
                            <v-spacer />
                            <v-btn text="Save Changes" @click="stopEdit(true)" />
                            <v-btn text="Close Dialog" @click="isActive.value = false" />
                        </v-card-actions>
                    </v-card>
                </template>
            </v-dialog>

            <v-btn
                icon="mdi-trash-can"
                aria-label="Remove todo"
                variant="text"
                @click.stop.prevent="$emit('remove')"
            />
        </template>
    </v-list-item>
</template>
