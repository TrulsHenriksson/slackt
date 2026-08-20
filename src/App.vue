<script setup lang="ts">
import { ref, watch } from 'vue';
import Header from './Header.vue';
import { Tree, idFromString } from './typesnmethods.ts';

let workingTree = ref(Tree.fromString(localStorage.getItem('openedFile')));
let selectedPersonId = ref<number | null>(
    idFromString(localStorage.getItem('selectedPerson')),
);
let selectedFamilyId = ref<number | null>(
    idFromString(localStorage.getItem('selectedFamily')),
);

watch(
    workingTree,
    (newVal) => {
        localStorage.setItem('openedFile', newVal.stringify());
    },
    { deep: true },
);

watch(selectedPersonId, (newVal) => {
    localStorage.setItem(
        'selectedPerson',
        newVal === null ? '' : newVal.toString(),
    );
});

watch(selectedFamilyId, (newVal) => {
    localStorage.setItem(
        'selectedFamily',
        newVal === null ? '' : newVal.toString(),
    );
});
</script>

<template>
    <Header v-model="workingTree" />
    <RouterView
        v-model:workingTree="workingTree"
        v-model:selectedPersonId="selectedPersonId"
        v-model:selectedFamilyId="selectedFamilyId"
    />
</template>
