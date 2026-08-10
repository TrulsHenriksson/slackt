import {
    Slackt,
    FormatName,
    FindPerson,
    FindPeople,
    Person,
    FormatFamily,
    FindDirectRelatives,
    AddPerson,
    FindFamily,
    Family,
    AddFamily,
    download,
    open,
    clear,
} from './typesnmethods.js';
import {identify_people} from './merger.js'

// Guarantee that none of these are null because we check them below
const openButton = document.getElementById('open')!;
const openMergeButton = document.getElementById('openMerge')!;
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
[
    openButton,
    saveButton,
    clearButton,
    openMergeButton,
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
].forEach(element => {
    if (!element) throw new Error();
});

openButton.addEventListener('change', async (e) => {
    openedFile = (await open(e, openedFile)) || openedFile;
    refreshPersonList();
    refreshFamilyList();
});
openMergeButton.addEventListener('change', async (e) => {
    // openedFile = (await open(e, openedFile)) || openedFile?
    if (e.target instanceof HTMLInputElement) {
        const file = e.target.files?.item(0)
        const text = await file?.text()
        if (!file || !text) {
            return
        }
        let newFile: Slackt = {people: [], families: []}
        try {
            newFile = JSON.parse(text)
        } catch (error) {
            return
        }
        identify_people(openedFile, newFile)
    }
})
saveButton.onclick = () => download(openedFile);

let timeStampLastClickedClear = 0
clearButton.onclick = () => {
    // Click twice within 2 seconds to clear
    if (Date.now() - timeStampLastClickedClear < 2000) {
    openedFile = clear();
    selectedPerson = null;
    selectedFamily = null;
    refreshPersonList();
    refreshFamilyList();
    refreshPersonInspector();
    refreshFamilyInspector();
    } else {
        alert("Vill du verkligen ta bort alla personer och familjer? Klicka igen inom 2 sekunder i så fall.")
    }
    timeStampLastClickedClear = Date.now()
};

function analysePerson(p: Person, counted: Set<number>) {
    counted.add(p.id);
    FindDirectRelatives(openedFile, p.id)
        .filter((p) => !counted.has(p))
        .forEach((r) => {
            counted = analysePerson(FindPerson(openedFile, r), counted);
        });

    return counted;
}

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
    selectedPerson = AddPerson(openedFile);
    refreshPersonInspector();
    refreshPersonList();
    let p = peopleSection.querySelector(
        `[data-id="${selectedPerson}"]`,
    ) as HTMLElement;
    p?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
addFamily.onclick = () => {
    selectedFamily = AddFamily(openedFile);
    refreshFamilyInspector();
    refreshFamilyList();
    let f = familiesSection.querySelector(
        `[data-id="${selectedFamily}"]`,
    ) as HTMLElement;
    f?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

function refreshPersonList() {
    peopleSection.innerHTML = '';

    localStorage.setItem('openedFile', JSON.stringify(openedFile));

    if (!openedFile) return;

    let filter = (searchPeople as HTMLInputElement).value;
    let people = openedFile.people;
    if (filter) {
        people = people.filter((p) =>
            FormatName(p, 'full').toLowerCase().includes(filter.toLowerCase()),
        );
    }

    people.forEach((p) => {
        let el = document.createElement('p');
        el.innerHTML = FormatName(p, 'extra') ?? '?';
        if (p.id === selectedPerson) el.classList.add('embolden');
        el.setAttribute('data-id', '' + p.id);
        el.setAttribute('data-type', 'person');
        el.onclick = select;
        peopleSection.append(el);
    });

    let p = peopleSection.querySelector(`[data-id="${selectedPerson}"]`);
    p?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function refreshFamilyList() {
    familiesSection.innerHTML = '';

    localStorage.setItem('openedFile', JSON.stringify(openedFile));

    if (!openedFile) return;

    let filter = (searchFamilies as HTMLInputElement).value;
    let families = openedFile.families;
    if (filter) {
        families = families.filter((f) =>
            FormatFamily(openedFile, f)
                .toLowerCase()
                .includes(filter.toLowerCase()),
        );
    }

    families.forEach((f) => {
        let el = document.createElement('p');
        el.innerHTML = FormatFamily(openedFile!, f);
        if (f.id === selectedFamily) el.classList.add('embolden');
        el.setAttribute('data-id', '' + f.id);
        el.setAttribute('data-type', 'family');
        el.onclick = select;
        familiesSection.append(el);
    });

    let p = familiesSection.querySelector(`[data-id="${selectedFamily}"]`);
    p?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const refreshPersonInspector = () => {
    localStorage.setItem(
        'selectedPerson',
        selectedPerson !== null ? '' + selectedPerson : 'null',
    );
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

    let person = FindPerson(openedFile, selectedPerson);

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

    let inpEl = document.getElementById('nameFirst');
    inpEl?.focus();
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

    let family = FindFamily(openedFile, selectedFamily);

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
    husbandEl.innerHTML = family.husband !== null
        ? FormatName(FindPerson(openedFile, family.husband), 'full')
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
    wifeEl.innerHTML = family.wife !== null
        ? FormatName(FindPerson(openedFile, family.wife), 'full')
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

        let child = FindPerson(openedFile, c);
        let childEl = document.createElement('p');
        childEl.innerHTML = FormatName(child, 'full');
        childEl.classList.add('grow');
        childContainer.append(childEl);

        let arrowsEl = document.createElement('div');
        arrowsEl.classList.add('arrows');
        let up = document.createElement('button');
        up.innerHTML = '🔼';
        let down = document.createElement('button');
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
};

function select(e: MouseEvent) {
    let target = e.target as Element;
    let id = target.attributes.getNamedItem('data-id')?.value;
    let type = target.attributes.getNamedItem('data-type')?.value;

    if (type === 'person') {
        if (id === undefined) {
            selectedPerson = null;
            refreshPersonInspector();
            return;
        }

        selectedPerson = parseInt(id);
        refreshPersonInspector();
    } else if (type === 'family') {
        if (id === undefined) {
            selectedFamily = null;
            refreshFamilyInspector();
            return;
        }

        selectedFamily = parseInt(id);
        refreshFamilyInspector();
    }

    refreshPersonList();
    refreshFamilyList();
}

let openedFile: Slackt = { people: [], families: [] };

let selectedPerson: number | null = null;
let sp = localStorage.getItem('selectedPerson');
if (sp !== null && sp !== 'null') selectedPerson = parseInt(sp);

let selectedFamily: number | null = null;
let sf = localStorage.getItem('selectedFamily');
if (sf !== null && sf !== 'null') selectedFamily = parseInt(sf);

let fromLS = localStorage.getItem('openedFile');
if (fromLS) {
    openedFile = JSON.parse(fromLS) || { people: [], families: [] };
}

refreshPersonList();
refreshFamilyList();
refreshPersonInspector();
refreshFamilyInspector();
