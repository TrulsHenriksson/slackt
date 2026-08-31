<script setup lang="ts">
import { ref, watch } from 'vue';
import Header from './Header.vue';
import { Tree, familyIdFromString, personIdFromString } from './typesnmethods.ts';
import { supabase } from './supabase.ts';
import { Session } from '@supabase/supabase-js';
import type { FamilyId, PersonId } from './typesnmethods.ts';

const workingTree = ref<Tree>(Tree.fromString(localStorage.getItem('openedFile')));
const selectedPersonId = ref<PersonId | null>(
    personIdFromString(localStorage.getItem('selectedPerson')),
);
const selectedFamilyId = ref<FamilyId | null>(
    familyIdFromString(localStorage.getItem('selectedFamily')),
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
    localStorage.setItem('selectedPerson', newVal ?? '');
});

watch(selectedFamilyId, (newVal) => {
    localStorage.setItem('selectedFamily', newVal ?? '');
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
    <Header v-model:workingTree="workingTree as Tree" v-model:session="session" />
    <RouterView
        v-model:workingTree="workingTree"
        v-model:selectedPersonId="selectedPersonId"
        v-model:selectedFamilyId="selectedFamilyId"
        v-model:session="session"
    />
</template>
