import {
    Slackt,
    Person,
    FamilyId,
} from './typesnmethods.js';
import { 
    download,
    open,
    tryClear,
    assertElementsExist,
    retrieveFileFromLocalStorage,
    retrieveLastSelectedFamily,
    storeFileInLocalStorage,
    storeSelectedFamilyInLocalStorage,
} from "./io.js";


function refresh() {
    familySelectEl.innerHTML =
        '<option value="null" disabled selected hidden>Ingen vald</option>';

    openedFile.families.forEach((f) => {
        const o = document.createElement('option');
        o.innerHTML = f.formatFamily(openedFile);
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
            firstRow.append(
                infoBox(openedFile.findPerson(family.husband), 'husband'),
            );
        } else {
            firstRow.append(infoBox(undefined, 'husband'));
        }

        if (family.wife !== null) {
            firstRow.append(
                infoBox(openedFile.findPerson(family.wife), 'wife'),
            );
        } else {
            firstRow.append(infoBox(undefined, 'wife'));
        }

        mainArea.append(firstRow);
        mainArea.append(
            (() => {
                const p = document.createElement('p');
                p.classList.add('small');
                p.innerHTML = 'Barn';
                return p;
            })(),
        );

        const secondRow = document.createElement('div');
        secondRow.classList.add('hcont');

        family.children.forEach((c) => {
            secondRow.append(infoBox(openedFile.findPerson(c), 'child'));
        });
        secondRow.append(infoBox(undefined, 'child'));

        mainArea.append(secondRow);
    }
}

function infoBox(person: Person | undefined, role: 'husband' | 'wife' | 'child') {
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
    if (!person) {
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
        if (
            !f.children.includes(person.id) &&
            f.husband !== person.id &&
            f.wife !== person.id
        )
            return false;
        if (f.id === selectedFamily) return false;
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

const openButton = document.getElementById('open')!;
const saveButton = document.getElementById('save')!;
const clearButton = document.getElementById('clear')!;
const familySelectEl = document.getElementById(
    'selectFamily',
) as HTMLSelectElement;
const mainArea = document.getElementById('viewer')!;

assertElementsExist([
    openButton,
    saveButton,
    clearButton,
    familySelectEl,
    mainArea
])

openButton.addEventListener('change', async (e) => {
    openedFile = (await open(e, openedFile)) ?? openedFile;
    storeFileInLocalStorage(openedFile)
    refresh();
});
saveButton.onclick = () => {
    download(openedFile);
}
clearButton.onclick = () => {
    const newFile = tryClear();
    if (newFile === undefined)
        return

    openedFile = newFile;
    storeFileInLocalStorage(openedFile)
    refresh();
};

familySelectEl.onchange = (e) => {
    let target = e.target as HTMLSelectElement;
    selectedFamily = parseInt(target.value) as FamilyId;
    storeSelectedFamilyInLocalStorage(selectedFamily)
    refresh();
};


let openedFile: Slackt = retrieveFileFromLocalStorage()
let selectedFamily: FamilyId | null = retrieveLastSelectedFamily(openedFile)

refresh();
