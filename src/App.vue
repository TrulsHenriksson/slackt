<script setup lang="ts">
import { ref, watch } from 'vue';
import Header from './Header.vue';
import { Tree, idFromString } from './typesnmethods.ts';
import { supabase } from './supabase.ts';
import { Session } from '@supabase/supabase-js';

const workingTree = ref(Tree.fromString(localStorage.getItem('openedFile')));
const selectedPersonId = ref<number | null>(
    idFromString(localStorage.getItem('selectedPerson')),
);
const selectedFamilyId = ref<number | null>(
    idFromString(localStorage.getItem('selectedFamily')),
);
const session = ref<Session | null>(null);

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

supabase.auth.onAuthStateChange(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        session.value = null;
        return;
    }

    session.value = data.session;
});
</script>

<template>
    <Header v-model:workingTree="workingTree" v-model:session="session" />
    <RouterView
        v-model:workingTree="workingTree"
        v-model:selectedPersonId="selectedPersonId"
        v-model:selectedFamilyId="selectedFamilyId"
        v-model:session="session"
    />
</template>
