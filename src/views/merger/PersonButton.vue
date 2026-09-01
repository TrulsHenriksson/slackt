<script setup lang="ts">

defineProps(["name", "cell"])

</script>

<template>
    <div class="candidateContainer">
        <button
            class="candidateButton"
            @click="$emit('toggle-select', cell)"
        >
            {{ name }}
        </button>
        <button
            class="infoButton"
            @click="$emit('show-info', cell)"
            popovertarget="candidateInfoBox"
        >
            ⓘ
        </button>
    </div>
</template>

<style lang="css">
div.candidateContainer {
    display: inline-flex;
    margin-right: 4px;
    border-radius: 0.5rem;
    background-color: hsl(120, 20%, 45%);
}

div.candidateContainer.selected {
    background-color: #0c0;
}

div.candidateContainer > button {
    transform: none;
    background-color: inherit;
}

div.candidateContainer > button:hover {
    background-color: #8f8;
}

button.candidateButton {
    padding: 2px;
    border-radius: 0.4rem 0 0 0.4rem;
}

button.infoButton {
    border-radius: 0 0.4rem 0.4rem 0;
}
</style>