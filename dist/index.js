import { FormatName, FindPerson, FormatFamily, AddPerson, FindFamily, AddFamily, download, open, clear, } from './typesnmethods.js';
const openButton = document.getElementById('open');
if (!openButton)
    throw new Error();
const saveButton = document.getElementById('save');
if (!saveButton)
    throw new Error();
const clearButton = document.getElementById('clear');
if (!clearButton)
    throw new Error();
const searchPeople = document.getElementById('searchPeople');
if (!searchPeople)
    throw new Error();
const searchFamilies = document.getElementById('searchFamilies');
if (!searchFamilies)
    throw new Error();
const clearSearchPeople = document.getElementById('clearSearchPeople');
if (!clearSearchPeople)
    throw new Error();
const clearSearchFamilies = document.getElementById('clearSearchFamilies');
if (!clearSearchFamilies)
    throw new Error();
const peopleSection = document.querySelector('#people .list');
if (!peopleSection)
    throw new Error();
const familiesSection = document.querySelector('#families .list');
if (!familiesSection)
    throw new Error();
const personInspector = document.getElementById('person');
if (!personInspector)
    throw new Error();
const familyInspector = document.getElementById('family');
if (!familyInspector)
    throw new Error();
const addPerson = document.getElementById('addPerson');
if (!addPerson)
    throw new Error();
const addFamily = document.getElementById('addFamily');
if (!addFamily)
    throw new Error();
openButton.addEventListener('change', async (e) => {
    openedFile = (await open(e, openedFile)) || openedFile;
    refreshPersonList();
    refreshFamilyList();
});
saveButton.onclick = () => download(openedFile);
clearButton.onclick = () => {
    openedFile = clear();
    selectedPerson = null;
    selectedFamily = null;
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
    searchPeople.value = '';
    refreshPersonList();
};
clearSearchFamilies.onclick = () => {
    searchFamilies.value = '';
    refreshFamilyList();
};
addPerson.onclick = () => {
    selectedPerson = AddPerson(openedFile);
    refreshPersonInspector();
    refreshPersonList();
    let p = peopleSection.querySelector(`[data-id="${selectedPerson}"]`);
    p?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
addFamily.onclick = () => {
    selectedFamily = AddFamily(openedFile);
    refreshFamilyInspector();
    refreshFamilyList();
    let f = familiesSection.querySelector(`[data-id="${selectedFamily}"]`);
    f?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
const refreshPersonList = () => {
    peopleSection.innerHTML = '';
    localStorage.setItem('openedFile', JSON.stringify(openedFile));
    if (!openedFile)
        return;
    let filter = searchPeople.value;
    let people = openedFile.people;
    if (filter) {
        people = people.filter((p) => FormatName(p, 'full').toLowerCase().includes(filter.toLowerCase()));
    }
    people.forEach((p) => {
        let el = document.createElement('p');
        el.innerHTML = FormatName(p, 'extra') ?? '?';
        if (p.id === selectedPerson)
            el.classList.add('embolden');
        el.setAttribute('data-id', '' + p.id);
        el.setAttribute('data-type', 'person');
        el.onclick = select;
        peopleSection.append(el);
    });
    let p = peopleSection.querySelector(`[data-id="${selectedPerson}"]`);
    p?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
const refreshFamilyList = () => {
    familiesSection.innerHTML = '';
    localStorage.setItem('openedFile', JSON.stringify(openedFile));
    if (!openedFile)
        return;
    let filter = searchFamilies.value;
    let families = openedFile.families;
    if (filter) {
        families = families.filter((f) => FormatFamily(openedFile, f)
            .toLowerCase()
            .includes(filter.toLowerCase()));
    }
    families.forEach((f) => {
        let el = document.createElement('p');
        el.innerHTML = FormatFamily(openedFile, f);
        if (f.id === selectedFamily)
            el.classList.add('embolden');
        el.setAttribute('data-id', '' + f.id);
        el.setAttribute('data-type', 'family');
        el.onclick = select;
        familiesSection.append(el);
    });
    let p = familiesSection.querySelector(`[data-id="${selectedFamily}"]`);
    p?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
const refreshPersonInspector = () => {
    localStorage.setItem('selectedPerson', selectedPerson !== null ? '' + selectedPerson : 'null');
    personInspector.innerHTML = '';
    if (selectedPerson === null) {
        personInspector.innerHTML = 'Välj person';
        return;
    }
    let keys = [
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
        let target = e.target;
        if (!target)
            return;
        let key = target.id;
        //@ts-ignore
        if (!key || !keys.includes(key))
            return;
        let k = key;
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
const refreshFamilyInspector = () => {
    localStorage.setItem('selectedFamily', selectedFamily !== null ? '' + selectedFamily : 'null');
    familyInspector.innerHTML = '';
    if (selectedFamily === null) {
        familyInspector.innerHTML = 'Välj familj';
        return;
    }
    let keys = ['nameLastOverride', 'dateStart'];
    let family = FindFamily(openedFile, selectedFamily);
    let formEl = document.createElement('form');
    formEl.addEventListener('submit', (e) => {
        e.preventDefault();
    });
    formEl.classList.add('family');
    formEl.onchange = (e) => {
        let target = e.target;
        if (!target)
            return;
        let key = target.id;
        //@ts-ignore
        if (!key || !keys.includes(key))
            return;
        let k = key;
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
    }
    else {
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
    }
    else {
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
function select(e) {
    let target = e.target;
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
    }
    else if (type === 'family') {
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
let openedFile = { people: [], families: [] };
let selectedPerson = null;
let sp = localStorage.getItem('selectedPerson');
if (sp !== null && sp !== 'null')
    selectedPerson = parseInt(sp);
let selectedFamily = null;
let sf = localStorage.getItem('selectedFamily');
if (sf !== null && sf !== 'null')
    selectedFamily = parseInt(sf);
let fromLS = localStorage.getItem('openedFile');
if (fromLS) {
    openedFile = JSON.parse(fromLS) || { people: [], families: [] };
}
refreshPersonList();
refreshFamilyList();
refreshPersonInspector();
refreshFamilyInspector();
//# sourceMappingURL=index.js.map