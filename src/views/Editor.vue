<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { Slackt } from '../typesnmethods.ts';

const openedFile = defineModel<Slackt>('openedFile', {
    required: true,
});

const selectedPersonId = defineModel<number | null>('selectedPerson', {
    required: true,
});

const selectedFamilyId = defineModel<number | null>('selectedFamily', {
    required: true,
});

watch(
    openedFile,
    () => {
        localStorage.setItem('openedFile', openedFile.value.stringify());
    },
    { deep: true },
);

const peopleFilter = ref('');
const filteredPeople = computed(() => {
    if (!openedFile.value) return [];
    if (!peopleFilter.value) return openedFile.value.people;
    return openedFile.value.people.filter((p) =>
        p
            .formatName('full')
            .toLowerCase()
            .includes(peopleFilter.value.toLowerCase()),
    );
});
const selectedPerson = computed(() => {
    if (selectedPersonId.value === null) return null;
    return openedFile.value.findPerson(selectedPersonId.value) || null;
});
watch(selectedPersonId, (newVal) => {
    localStorage.setItem(
        'selectedPerson',
        newVal === null ? '' : newVal.toString(),
    );
});

const familiesFilter = ref('');
const filteredFamilies = computed(() => {
    if (!openedFile.value) return [];
    if (!familiesFilter.value) return openedFile.value.families;
    return openedFile.value.families.filter((f) =>
        f
            .formatFamily(openedFile.value)
            .toLowerCase()
            .includes(familiesFilter.value.toLowerCase()),
    );
});
const selectedFamily = computed(() => {
    if (selectedFamilyId.value === null) return null;
    return openedFile.value.findFamily(selectedFamilyId.value) || null;
});
const selectedFamilyMembers = computed(() => {
    return {
        husband: openedFile.value.findPerson(
            selectedFamily.value?.husband ?? null,
        ),
        wife: openedFile.value.findPerson(selectedFamily.value?.wife ?? null),
        children: (selectedFamily.value?.children ?? [])
            .map((c) => openedFile.value.findPerson(c))
            .filter((c) => c !== undefined),
    };
});
watch(selectedFamilyId, (newVal) => {
    localStorage.setItem(
        'selectedFamily',
        newVal === null ? '' : newVal.toString(),
    );
});

async function scrollToPerson(id: number | null) {
    if (id === null) return;

    await nextTick();

    document.querySelector(`#people [data-id="${id}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
    });
}

async function scrollToFamily(id: number | null) {
    if (id === null) return;

    await nextTick();

    const el = document.querySelector(`#families [data-id="${id}"]`);

    el?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
    });
}

async function addPerson() {
    const newId = openedFile.value.addEmptyPerson();

    selectedPersonId.value = newId;

    scrollToPerson(newId);
}

async function addFamily() {
    const newId = openedFile.value.addEmptyFamily();

    selectedFamilyId.value = newId;

    scrollToFamily(newId);
}

function deletePerson(personId: number) {
    const i = openedFile.value.people.findIndex((f) => f.id === personId);

    openedFile.value.people.splice(i, 1);

    selectedPersonId.value = openedFile.value.people[i - 1]?.id ?? null;

    // Purge references
    openedFile.value.families.forEach((f) => {
        if (f.husband === personId) f.husband = null;
        if (f.wife === personId) f.wife = null;
        if (f.children.includes(personId))
            f.children = f.children.filter((c) => c !== personId);
    });
}

function deleteFamily(familyId: number) {
    const i = openedFile.value.families.findIndex((f) => f.id === familyId);

    openedFile.value.families.splice(i, 1);

    selectedFamilyId.value = openedFile.value.families[i - 1]?.id ?? null;
}

function moveChild(id: number, step: number) {
    if (selectedFamily.value === null) return;

    let children = selectedFamily.value.children;
    let i = children.findIndex((c) => c === id);
    if (i === -1) return; // No child with id `id`

    // Clamp j to be between 0 and length-1
    let j = Math.min(children.length - 1, Math.max(0, i + step));
    if (j === i) return; // Move nowhere

    // Swap indices i and j
    let temp = children[i];
    children[i] = children[j];
    children[j] = temp;
}

/* function analysePerson(p: Person, counted: Set<number>) {
    counted.add(p.id);
    FindDirectRelatives(openedFile, p.id)
        .filter((p) => !counted.has(p))
        .forEach((r) => {
            counted = analysePerson(openedFile.getPerson(r), counted);
        });

    return counted;
}
*/
</script>

<template>
    <main id="editor">
        <div id="people">
            <h1>Personer</h1>
            <div class="hcont">
                <label for="searchPeople">Sök:</label>
                <input
                    type="text"
                    v-model="peopleFilter"
                    @input="scrollToPerson(selectedPersonId)"
                />
                <button
                    class="textbutton"
                    @click="
                        peopleFilter = '';
                        scrollToPerson(selectedPersonId);
                    "
                >
                    ❌
                </button>
            </div>
            <div class="list">
                <p
                    v-for="p in filteredPeople"
                    :class="{ selected: selectedPersonId === p.id }"
                    :data-id="p.id"
                    @click="
                        if (selectedPersonId === p.id) {
                            selectedPersonId = null;
                        } else {
                            selectedPersonId = p.id;
                            scrollToPerson(p.id);
                        }
                    "
                >
                    {{ p.formatName('extra') }}
                </p>
            </div>
            <button class="textButton" @click="addPerson">
                Lägg till person
            </button>
        </div>
        <div id="families">
            <h1>Familjer</h1>
            <div class="hcont">
                <label for="searchFamilies">Sök:</label>
                <input
                    type="text"
                    v-model="familiesFilter"
                    @input="scrollToFamily(selectedFamilyId)"
                />
                <button
                    class="textbutton"
                    @click="
                        familiesFilter = '';
                        scrollToFamily(selectedFamilyId);
                    "
                >
                    ❌
                </button>
            </div>
            <div class="list">
                <p
                    v-for="f in filteredFamilies"
                    :class="{ selected: selectedFamilyId === f.id }"
                    :data-id="f.id"
                    @click="
                        if (selectedFamilyId === f.id) {
                            selectedFamilyId = null;
                        } else {
                            selectedFamilyId = f.id;
                            scrollToFamily(f.id);
                        }
                    "
                >
                    {{ f.formatFamily(openedFile) }}
                </p>
            </div>
            <button class="textButton" @click="addFamily">
                Lägg till familj
            </button>
        </div>
        <div id="inspector">
            <div>
                <h2>Person</h2>
                <div id="person">
                    <div v-if="selectedPerson === null">Ingen vald</div>
                    <form v-else>
                        <div class="hcont span">
                            <p class="grow">#{{ selectedPerson.id }}</p>
                            <button @click="deletePerson(selectedPerson.id)">
                                🗑️
                            </button>
                        </div>
                        <label for="nameFirst">Förnamn</label>
                        <input
                            type="text"
                            id="nameFirst"
                            v-model="selectedPerson.nameFirst"
                        />
                        <label for="nameLast">Efternamn</label>
                        <input
                            type="text"
                            id="nameLast"
                            v-model="selectedPerson.nameLast"
                        />
                        <label for="nameLastMaiden">Född</label>
                        <input
                            type="text"
                            id="nameLastMaiden"
                            v-model="selectedPerson.nameLastMaiden"
                        />
                        <label for="dateBirth">Födelsedatum</label>
                        <input
                            type="text"
                            id="dateBirth"
                            v-model="selectedPerson.dateBirth"
                        />
                        <label for="dateDeath">Dödsdatum</label>
                        <input
                            type="text"
                            id="dateDeath"
                            v-model="selectedPerson.dateDeath"
                        />
                    </form>
                </div>
            </div>
            <div>
                <h2>Familj</h2>
                <div id="family">
                    <div v-if="selectedFamily === null">Ingen vald</div>
                    <form v-else>
                        <div class="hcont span">
                            <p class="grow">#{{ selectedFamily.id }}</p>
                            <button @click="deleteFamily(selectedFamily.id)">
                                🗑️
                            </button>
                        </div>
                        <label>Make</label>
                        <div class="hcont">
                            <p class="grow">
                                {{
                                    selectedFamilyMembers.husband?.formatName(
                                        'full',
                                    ) ?? ''
                                }}
                            </p>
                            <button
                                v-if="
                                    selectedFamilyMembers.husband === undefined
                                "
                                @click="
                                    selectedFamily.husband = selectedPersonId
                                "
                            >
                                ➕
                            </button>
                            <button
                                v-else
                                @click="selectedFamily.husband = null"
                            >
                                ➖
                            </button>
                        </div>
                        <label>Maka</label>
                        <div class="hcont">
                            <p class="grow">
                                {{
                                    selectedFamilyMembers.wife?.formatName(
                                        'full',
                                    ) ?? ''
                                }}
                            </p>
                            <button
                                v-if="selectedFamilyMembers.wife === undefined"
                                @click="selectedFamily.wife = selectedPersonId"
                            >
                                ➕
                            </button>
                            <button v-else @click="selectedFamily.wife = null">
                                ➖
                            </button>
                        </div>
                        <label>Barn</label>
                        <div>
                            <div
                                v-for="(c, i) in selectedFamilyMembers.children"
                                class="hcont"
                            >
                                <p class="grow">{{ c.formatName('full') }}</p>
                                <div class="arrows">
                                    <button
                                        v-if="i > 0"
                                        @click="moveChild(c.id, -1)"
                                    >
                                        🔼
                                    </button>
                                    <button
                                        v-if="
                                            i <
                                            selectedFamilyMembers.children
                                                .length -
                                                1
                                        "
                                        @click="moveChild(c.id, 1)"
                                    >
                                        🔽
                                    </button>
                                </div>
                                <button
                                    @click="
                                        selectedFamily.children.splice(i, 1)
                                    "
                                >
                                    ➖
                                </button>
                            </div>
                            <button
                                @click="
                                    if (selectedPerson)
                                        selectedFamily.children.push(
                                            selectedPerson.id,
                                        );
                                "
                            >
                                ➕
                            </button>
                        </div>
                        <label for="nameLastOverride">Efternamn</label>
                        <input
                            type="text"
                            id="nameLastOverride"
                            v-model="selectedFamily.nameLastOverride"
                        />
                        <label for="dateStart">Startdatum</label>
                        <input
                            type="text"
                            id="dateStart"
                            v-model="selectedFamily.dateStart"
                        />
                    </form>
                </div>
            </div>
        </div>
    </main>
</template>
