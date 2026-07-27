import { open, download, clear, FormatFamily, FindPerson, } from './typesnmethods.js';
function refresh() {
    familySelectEl.innerHTML =
        '<option value="null" disabled selected hidden>Ingen vald</option>';
    openedFile.families.forEach((f) => {
        const o = document.createElement('option');
        o.innerHTML = FormatFamily(openedFile, f);
        o.value = '' + f.id;
        familySelectEl.append(o);
    });
    familySelectEl.value = '' + selectedFamily;
    mainArea.innerHTML = '';
    let family = openedFile.families.find((f) => f.id === selectedFamily);
    if (family) {
        const firstRow = document.createElement('div');
        firstRow.classList.add('hcont');
        if (family.husband !== null) {
            firstRow.append(infoBox(FindPerson(openedFile, family.husband), 'husband'));
        }
        else {
            firstRow.append(infoBox('none', 'husband'));
        }
        if (family.wife !== null) {
            firstRow.append(infoBox(FindPerson(openedFile, family.wife), 'wife'));
        }
        else {
            firstRow.append(infoBox('none', 'wife'));
        }
        mainArea.append(firstRow);
        mainArea.append((() => {
            const p = document.createElement('p');
            p.classList.add('small');
            p.innerHTML = 'Barn';
            return p;
        })());
        const secondRow = document.createElement('div');
        secondRow.classList.add('hcont');
        family.children.forEach((c) => {
            secondRow.append(infoBox(FindPerson(openedFile, c), 'child'));
        });
        secondRow.append(infoBox('none', 'child'));
        mainArea.append(secondRow);
    }
}
function infoBox(person, role) {
    const roleName = {
        husband: 'Make',
        wife: 'Maka',
        child: 'Barn',
    }[role];
    const wrapper = document.createElement('div');
    wrapper.classList.add('vcont');
    if (role !== 'child')
        wrapper.innerHTML = '<p class="small">' + roleName + '</p>';
    const box = document.createElement('div');
    box.classList.add('infoBox');
    if (person === 'none') {
        const button = document.createElement('button');
        button.innerHTML = '➕';
        wrapper.append(button);
        return wrapper;
    }
    box.innerHTML = `<p>${person.nameFirst}</p>`;
    const iconRow = document.createElement('div');
    iconRow.classList.add('hcont');
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '➖';
    iconRow.append(deleteButton);
    const editButton = document.createElement('button');
    editButton.innerHTML = '✏️';
    iconRow.append(editButton);
    let otherFamilies = openedFile.families.filter((f) => {
        if (!f.children.includes(person.id) &&
            f.husband !== person.id &&
            f.wife !== person.id)
            return false;
        if (f.id === selectedFamily)
            return false;
        return true;
    });
    const familyButton = document.createElement('button');
    familyButton.innerHTML = '👨‍👩‍👦' + otherFamilies.length;
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerHTML = '<p>Se andra familjer</p><p>Lägg till familj</p>';
    iconRow.append(popup);
    familyButton.onclick = () => popup.classList.toggle('show');
    iconRow.append(familyButton);
    box.append(iconRow);
    wrapper.append(box);
    return wrapper;
}
const openButton = document.getElementById('open');
const saveButton = document.getElementById('save');
const clearButton = document.getElementById('clear');
openButton.addEventListener('change', async (e) => {
    openedFile = (await open(e, openedFile)) || openedFile;
    refresh();
});
saveButton.onclick = () => download(openedFile);
clearButton.onclick = () => {
    openedFile = clear();
    refresh();
};
const familySelectEl = document.getElementById('selectFamily');
familySelectEl.onchange = (e) => {
    let target = e.target;
    selectedFamily = parseInt(target.value);
    localStorage.setItem('selectedFamily', target.value);
    refresh();
};
const mainArea = document.getElementById('viewer');
let openedFile = { people: [], families: [] };
let fromLS = localStorage.getItem('openedFile');
if (fromLS) {
    openedFile = JSON.parse(fromLS) || { people: [], families: [] };
}
let selectedFamily = null;
let sf = localStorage.getItem('selectedFamily');
if (sf !== null && sf !== 'null')
    selectedFamily = parseInt(sf);
refresh();
//# sourceMappingURL=viewer.js.map