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
watch(selectedFamilyId, (newVal) => {
    localStorage.setItem(
        'selectedFamily',
        newVal === null ? '' : newVal.toString(),
    );
});

async function scrollToPerson(id: number | null) {
    await nextTick();

    document.querySelector(`#people [data-id="${id}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
    });
}

async function scrollToFamily(id: number | null) {
    await nextTick();

    document.querySelector(`#families [data-id="${id}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
    });
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

addPerson.onclick = () => {
    selectedPerson = openedFile.addEmptyPerson();
    refreshPersonInspector();
    refreshPersonList();
    let p = peopleSection.querySelector(
        `[data-id="${selectedPerson}"]`,
    ) as HTMLElement;
    p?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
addFamily.onclick = () => {
    selectedFamily = openedFile.addEmptyFamily();
    refreshFamilyInspector();
    refreshFamilyList();
    let f = familiesSection.querySelector(
        `[data-id="${selectedFamily}"]`,
    ) as HTMLElement;
    f?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

function refreshFamilyInspector() {
    localStorage.setItem(
        'selectedFamily',
        selectedFamily !== null ? '' + selectedFamily : 'null',
    );
    familyInspector.innerHTML = '';

    if (selectedFamily === null) {
        familyInspector.innerHTML = 'Välj familj';
        return;
    }

    let keys: (keyof Family)[] = ['nameLastOverride', 'dateStart'];

    let family = openedFile.getFamily(selectedFamily);

    let formEl = document.createElement('form');
    formEl.addEventListener('submit', (e) => {
        e.preventDefault();
    });
    formEl.classList.add('family');
    formEl.onchange = (e) => {
        let target = e.target as HTMLInputElement;
        if (!target) return;
        let key = target.id;
        //@ts-ignore
        if (!key || !keys.includes(key)) return;
        let k = key as 'nameLastOverride' | 'dateStart';
        family[k] = target.value;
        refreshFamilyList();
    };

    let titleEl = document.createElement('p');
    titleEl.innerHTML = '#' + family.id;
    titleEl.style.gridColumnEnd = 'span 2';
    formEl.append(titleEl);

    let husbandLabel = document.createElement('label');
    husbandLabel.innerHTML = 'Make';
    formEl.append(husbandLabel);

    let husbandContainer = document.createElement('div');
    husbandContainer.classList.add('hcont');

    let husbandEl = document.createElement('p');
    husbandEl.classList.add('grow');
    husbandEl.innerHTML = family.husband
        ? openedFile.getPerson(family.husband).formatName('full')
        : '?';
    husbandContainer.append(husbandEl);

    if (family.husband === null) {
        let addHusband = document.createElement('button');
        addHusband.innerHTML = '➕';
        addHusband.setAttribute('type', 'button');
        addHusband.onclick = () => {
            family.husband = selectedPerson;
            refreshFamilyList();
            refreshFamilyInspector();
        };
        husbandContainer.append(addHusband);
    } else {
        let removeHusband = document.createElement('button');
        removeHusband.innerHTML = '➖';
        removeHusband.setAttribute('type', 'button');
        removeHusband.onclick = () => {
            family.husband = null;
            refreshFamilyList();
            refreshFamilyInspector();
        };
        husbandContainer.append(removeHusband);
    }

    formEl.append(husbandContainer);

    let wifeLabel = document.createElement('label');
    wifeLabel.innerHTML = 'Maka';
    formEl.append(wifeLabel);

    let wifeContainer = document.createElement('div');
    wifeContainer.classList.add('hcont');

    let wifeEl = document.createElement('p');
    wifeEl.classList.add('grow');
    wifeEl.innerHTML = family.wife
        ? openedFile.getPerson(family.wife).formatName('full')
        : '?';
    wifeContainer.append(wifeEl);

    if (family.wife === null) {
        let addWife = document.createElement('button');
        addWife.innerHTML = '➕';
        addWife.setAttribute('type', 'button');
        addWife.onclick = () => {
            family.wife = selectedPerson;
            refreshFamilyList();
            refreshFamilyInspector();
        };
        wifeContainer.append(addWife);
    } else {
        let removeWife = document.createElement('button');
        removeWife.innerHTML = '➖';
        removeWife.setAttribute('type', 'button');
        removeWife.onclick = () => {
            family.wife = null;
            refreshFamilyList();
            refreshFamilyInspector();
        };
        wifeContainer.append(removeWife);
    }

    formEl.append(wifeContainer);

    let childrenLabel = document.createElement('label');
    childrenLabel.innerHTML = 'Barn';
    formEl.append(childrenLabel);

    let childrenContainer = document.createElement('div');
    childrenContainer.classList.add('children');

    family.children.forEach((c) => {
        let childContainer = document.createElement('div');
        childContainer.classList.add('hcont');

        let child = openedFile.getPerson(c);
        let childEl = document.createElement('p');
        childEl.innerHTML = child.formatName('full');
        childEl.classList.add('grow');
        childContainer.append(childEl);

        let arrowsEl = document.createElement('div');
        arrowsEl.classList.add('arrows');
        let up = document.createElement('button');
        up.onclick = () => moveChild(c, -1);
        up.innerHTML = '🔼';
        let down = document.createElement('button');
        down.onclick = () => moveChild(c, 1);
        down.innerHTML = '🔽';
        arrowsEl.append(up);
        arrowsEl.append(down);
        childContainer.append(arrowsEl);

        let removeChild = document.createElement('button');
        removeChild.innerHTML = '➖';
        removeChild.setAttribute('type', 'button');
        removeChild.onclick = () => {
            family.children = family.children.filter((fc) => fc !== c);
            refreshFamilyList();
            refreshFamilyInspector();
        };
        childContainer.append(removeChild);

        childrenContainer.append(childContainer);
    });

    let addChild = document.createElement('button');
    addChild.innerHTML = '➕';
    addChild.setAttribute('type', 'button');
    addChild.onclick = () => {
        if (selectedPerson == null || family.children.includes(selectedPerson))
            return;

        family.children.push(selectedPerson);
        refreshFamilyList();
        refreshFamilyInspector();
    };
    childrenContainer.append(addChild);
    formEl.append(childrenContainer);

    keys.forEach((key) => {
        let labelEl = document.createElement('label');
        labelEl.innerHTML = key;
        labelEl.setAttribute('for', key);

        let inputEl = document.createElement('input');
        inputEl.setAttribute('type', 'text');
        inputEl.id = key;
        inputEl.value = '' + family[key];

        formEl.append(labelEl);
        formEl.append(inputEl);
    });

    familyInspector.append(formEl);
}

function moveChild(id: number, step: number) {
    if (selectedFamily === null) return;

    let children = openedFile.getFamily(selectedFamily).children;
    let i = children.findIndex((c) => c === id);
    if (i === -1) return; // No child with id `id`

    // Clamp j to be between 0 and length-1
    let j = Math.min(children.length - 1, Math.max(0, i + step));
    if (j === i) return; // Move nowhere

    // Swap indices i and j
    let temp = children[i];
    children[i] = children[j];
    children[j] = temp;
    refreshFamilyList();
    refreshFamilyInspector();
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
                        selectedPersonId = p.id;
                        scrollToPerson(p.id);
                    "
                >
                    {{ p.formatName('extra') }}
                </p>
            </div>
            <button class="textButton" id="addPerson">Lägg till person</button>
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
                        selectedFamilyId = f.id;
                        scrollToFamily(f.id);
                    "
                >
                    {{ f.formatFamily(openedFile) }}
                </p>
            </div>
            <button class="textButton" id="addFamily">Lägg till familj</button>
        </div>
        <div id="inspector">
            <div>
                <h2>Person</h2>
                <div id="person">
                    <div v-if="selectedPerson === null">no selected</div>
                    <form v-else>
                        <p style="grid-column-end: span 2">
                            #{{ selectedPerson.id }}
                        </p>
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
                <div id="family"></div>
            </div>
        </div>
    </main>
</template>
