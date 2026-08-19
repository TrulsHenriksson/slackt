<script setup lang="ts">
import { Slackt, download } from './typesnmethods';

const openedFile = defineModel<Slackt>({
    default: () => new Slackt(),
});

/* openButton.addEventListener('change', async (e) => {
    openedFile = (await open(e, openedFile)) || openedFile;
    refreshPersonList();
    refreshFamilyList();
});
*/

let timeStampLastClickedClear = 0;
function clear() {
    // Click twice within 2 seconds to clear
    if (Date.now() - timeStampLastClickedClear < 2000) {
        openedFile.value = new Slackt();
        localStorage.setItem('openedFile', openedFile.value.stringify());

        //selectedPerson = null;
        //selectedFamily = null;
    } else {
        alert(
            'Vill du verkligen ta bort alla personer och familjer? Klicka igen inom 2 sekunder i så fall.',
        );
    }
    timeStampLastClickedClear = Date.now();
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
    <div id="menuButtons">
        <button
            class="textButton"
            onclick="document.getElementById('open').click()"
        >
            Öppna
        </button>
        <input type="file" id="open" accept=".json" style="display: none" />
        <button @click="download(openedFile)" class="textButton">Spara</button>
        <button @clock="clear" class="textButton">Rensa</button>
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
