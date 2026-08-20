<script setup lang="ts">
import { Tree, download as downloadFile, open } from './typesnmethods';
import { ref } from 'vue';
import { supabase } from './supabase';

const workingTree = defineModel<Tree>({
    required: true,
});

const fileInput = ref<HTMLInputElement | null>(null);

const commentField = ref('');

async function openFile(e: Event) {
    workingTree.value = await open(e);
}

let timeStampLastClickedClear = 0;
function clear() {
    // Click twice within 2 seconds to clear
    if (Date.now() - timeStampLastClickedClear < 2000) {
        workingTree.value = new Tree();
    } else {
        alert(
            'Vill du verkligen ta bort alla personer och familjer? Klicka igen inom 2 sekunder i så fall.',
        );
    }
    timeStampLastClickedClear = Date.now();
}

async function upload() {
    let data = await supabase
        .from('Trees')
        .insert({
            data: workingTree.value.stringify(),
            comment: commentField.value,
            by_user: (await supabase.auth.getSession()).data.session?.user.id,
        })
        .select();
    commentField.value = '';
    console.log(data);
}
</script>

<template>
    <header>
        <h1>Slackt</h1>
        <h2><RouterLink to="/editor">Redigerare</RouterLink></h2>
        <h2><RouterLink to="/viewer">Utforskare</RouterLink></h2>
        <h2><RouterLink to="/tools">Verktyg</RouterLink></h2>
        <p>Tillbaka till <a href="https://fyrgeit.se">Fyrgeit.se</a></p>
    </header>
    <div id="menuButtons" class="hcont">
        <button class="textButton" @click="fileInput?.click()">Öppna</button>
        <input
            @change="openFile"
            ref="fileInput"
            type="file"
            accept=".json"
            hidden
        />
        <button @click="downloadFile(workingTree)" class="textButton">
            Spara
        </button>
        <button @click="clear" class="textButton">Rensa</button>
        <button @click="upload" class="textButton">Ladda upp</button>
        <input v-model="commentField" type="text" placeholder="Meddelande..." />
    </div>
</template>

<style lang="css">
header {
    padding: 0.5rem;
    display: flex;
    gap: 1rem;
    align-items: baseline;
}

#userInfo {
    font-family: monospace;
}
</style>
