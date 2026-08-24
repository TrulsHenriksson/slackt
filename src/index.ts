import {
    Slackt,
    Person,
    Family,
    PersonId,
    FamilyId,
} from './typesnmethods.js';
import {
    download,
    open,
    tryClear,
    assertElementsExist,
    retrieveFileFromLocalStorage,
    retrieveLastSelectedFamily,
    retrieveLastSelectedPerson,
    storeFileInLocalStorage,
    storeSelectedFamilyInLocalStorage,
    storeSelectedPersonInLocalStorage,
} from "./io.js";

// Guarantee that none of these are null because we check them below
const openButton = document.getElementById('open')!;
const saveButton = document.getElementById('save')!;
const clearButton = document.getElementById('clear')!;
const searchPeople = document.getElementById('searchPeople')!;
const searchFamilies = document.getElementById('searchFamilies')!;
const clearSearchPeople = document.getElementById('clearSearchPeople')!;
const clearSearchFamilies = document.getElementById('clearSearchFamilies')!;
const peopleSection = document.querySelector('#people .list')!;
const familiesSection = document.querySelector('#families .list')!;
const personInspector = document.getElementById('person')!;
const familyInspector = document.getElementById('family')!;
const addPerson = document.getElementById('addPerson')!;
const addFamily = document.getElementById('addFamily')!;
// Make sure all of them exist
assertElementsExist([
    openButton,
    saveButton,
    clearButton,
    searchPeople,
    searchFamilies,
    clearSearchPeople,
    clearSearchFamilies,
    peopleSection,
    familiesSection,
    personInspector,
    familyInspector,
    addPerson,
    addFamily,
])


openButton.addEventListener('change', async (e) => {
    const newFile = await open(e, openedFile);
    if (newFile === undefined)
        return

    openedFile = newFile
    storeFileInLocalStorage(openedFile)
    selectedPerson = retrieveLastSelectedPerson(openedFile)
    selectedFamily = retrieveLastSelectedFamily(openedFile)

    refreshPersonList();
    refreshFamilyList();
    refreshPersonInspector();
    refreshFamilyInspector();
    
    scrollToSelectedPerson();
    scrollToSelectedFamily();
});

saveButton.onclick = () => {
    download(openedFile);
}

clearButton.onclick = () => {
    const newFile = tryClear();
    if (newFile === undefined)
        return

    openedFile = newFile
    selectedPerson = null;
    selectedFamily = null;
    storeFileInLocalStorage(openedFile)
    storeSelectedPersonInLocalStorage(selectedPerson)
    storeSelectedFamilyInLocalStorage(selectedFamily)

    refreshPersonList();
    refreshFamilyList();
    refreshPersonInspector();
    refreshFamilyInspector();
};

searchPeople.oninput = () => {
    refreshPersonList();
};

searchFamilies.oninput = () => {
    refreshFamilyList();
};

clearSearchPeople.onclick = () => {
    (searchPeople as HTMLInputElement).value = '';
    refreshPersonList();
};

clearSearchFamilies.onclick = () => {
    (searchFamilies as HTMLInputElement).value = '';
    refreshFamilyList();
};

addPerson.onclick = () => {
    selectedPerson = openedFile.addEmptyPerson();
    storeFileInLocalStorage(openedFile)
    storeSelectedPersonInLocalStorage(selectedPerson)

    refreshPersonInspector();
    refreshPersonList();
    scrollToSelectedPerson();
    focusPersonInspector();
};
addFamily.onclick = () => {
    selectedFamily = openedFile.addEmptyFamily();
    storeFileInLocalStorage(openedFile)
    storeSelectedFamilyInLocalStorage(selectedFamily)

    refreshFamilyInspector();
    refreshFamilyList();
    scrollToSelectedFamily();
};

function scrollToSelectedPerson() {
    let p = peopleSection.querySelector(`[data-id="${selectedPerson}"]`);
    p?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function scrollToSelectedFamily() {
    let f = familiesSection.querySelector(`[data-id="${selectedFamily}"]`);
    f?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function refreshPersonList() {
    peopleSection.innerHTML = '';

    let filter = (searchPeople as HTMLInputElement).value;
    let people = openedFile.people;
    if (filter) {
        people = people.filter((p) =>
            p.formatName('full').toLowerCase().includes(filter.toLowerCase()),
        );
    }

    people.forEach((p) => {
        let el = document.createElement('p');
        el.innerHTML = p.formatName('extra') ?? '?';
        if (p.id === selectedPerson) el.classList.add('embolden');
        el.setAttribute('data-id', '' + p.id);
        el.setAttribute('data-type', 'person');
        el.onclick = select;
        peopleSection.append(el);
    });
}

function refreshFamilyList() {
    familiesSection.innerHTML = '';

    let filter = (searchFamilies as HTMLInputElement).value;
    let families = openedFile.families;
    if (filter) {
        families = families.filter((f) =>
            f
                .formatFamily(openedFile)
                .toLowerCase()
                .includes(filter.toLowerCase()),
        );
    }

    families.forEach((f) => {
        let el = document.createElement('p');
        el.innerHTML = f.formatFamily(openedFile);
        if (f.id === selectedFamily) el.classList.add('embolden');
        el.setAttribute('data-id', '' + f.id);
        el.setAttribute('data-type', 'family');
        el.onclick = select;
        familiesSection.append(el);
    });
}

function refreshPersonInspector() {
    personInspector.innerHTML = '';

    if (selectedPerson === null) {
        personInspector.innerHTML = 'Välj person';
        return;
    }

    let keys: (keyof Person)[] = [
        'nameFirst',
        'nameLast',
        'nameLastMaiden',
        'dateBirth',
        'dateDeath',
    ];

    let person = openedFile.getPerson(selectedPerson);

    let formEl = document.createElement('form');
    formEl.classList.add('person');
    formEl.onchange = (e) => {
        let target = e.target as HTMLInputElement;
        if (!target) return;
        let key = target.id;
        //@ts-ignore
        if (!key || !keys.includes(key)) return;
        let k = key as
            | 'nameFirst'
            | 'nameLast'
            | 'nameLastMaiden'
            | 'dateBirth'
            | 'dateDeath';
        person[k] = target.value;
        refreshPersonList();
    };

    let titleEl = document.createElement('p');
    titleEl.innerHTML = '#' + person.id;
    titleEl.style.gridColumnEnd = 'span 2';
    formEl.append(titleEl);

    keys.forEach((key) => {
        let labelEl = document.createElement('label');
        labelEl.innerHTML = key;
        labelEl.setAttribute('for', key);

        let inputEl = document.createElement('input');
        inputEl.setAttribute('type', 'text');
        inputEl.id = key;
        inputEl.value = '' + person[key];

        formEl.append(labelEl);
        formEl.append(inputEl);
    });

    personInspector.append(formEl);
}

function focusPersonInspector() {
    let inpEl = document.getElementById('nameFirst');
    inpEl?.focus();
}

function refreshFamilyInspector() {
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
        up.onclick = () => moveChild(c, -1)
        up.innerHTML = '🔼';
        let down = document.createElement('button');
        down.onclick = () => moveChild(c, 1)
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

/** Move a child up or down in the family inspector according to step */
function moveChild(id: number, step: number) {
    if (selectedFamily === null)
        return

    let children = openedFile.getFamily(selectedFamily).children
    let i = children.findIndex((c) => c === id)
    if (i === -1)
        return  // No child with id `id`

    // Clamp j to be between 0 and length-1
    let j = Math.min(children.length - 1, Math.max(0, i + step))
    if (j === i)
        return  // Move nowhere

    // Swap indices i and j
    let temp = children[i]
    children[i] = children[j]
    children[j] = temp
    refreshFamilyList()
    refreshFamilyInspector()
}

function select(e: MouseEvent) {
    let target = e.target as Element;
    let id = target.attributes.getNamedItem('data-id')?.value;
    let type = target.attributes.getNamedItem('data-type')?.value;

    if (type === 'person') {
        let newSelectedPerson = id === undefined ? null : parseInt(id) as PersonId
        // Toggle selection if the same person was clicked
        selectedPerson = newSelectedPerson === selectedPerson ? null : newSelectedPerson
        storeSelectedPersonInLocalStorage(selectedPerson)

        refreshPersonInspector();
        refreshPersonList();
        focusPersonInspector()
    } else if (type === 'family') {
        let newSelectedFamily = id === undefined ? null : parseInt(id) as FamilyId
        // Toggle selection if the same family was clicked
        selectedFamily = newSelectedFamily === selectedFamily ? null : newSelectedFamily
        storeSelectedFamilyInLocalStorage(selectedFamily)

        refreshFamilyInspector();
        refreshFamilyList();
    }
}


let openedFile: Slackt = retrieveFileFromLocalStorage()
let selectedPerson: PersonId | null = retrieveLastSelectedPerson(openedFile)
let selectedFamily: FamilyId | null = retrieveLastSelectedFamily(openedFile)

refreshPersonList();
refreshFamilyList();
refreshPersonInspector();
refreshFamilyInspector();

scrollToSelectedPerson()
scrollToSelectedFamily()
