<script setup lang="ts">
import { ref } from 'vue';
import Header from './Header.vue';
import { Slackt } from './typesnmethods.ts';

let openedFile = ref(new Slackt());

let selectedPerson = ref<number | null>(null);
let sp = localStorage.getItem('selectedPerson');
if (sp !== null && sp !== 'null') selectedPerson.value = parseInt(sp);

let selectedFamily = ref<number | null>(null);
let sf = localStorage.getItem('selectedFamily');
if (sf !== null && sf !== 'null') selectedFamily.value = parseInt(sf);

let fromLS = localStorage.getItem('openedFile');
if (fromLS) {
    openedFile.value = Slackt.fromString(fromLS);
}
</script>

<template>
    <Header v-model="openedFile" />
    <RouterView
        v-model:openedFile="openedFile"
        v-model:selectedPerson="selectedPerson"
        v-model:selectedFamily="selectedFamily"
    />
</template>
