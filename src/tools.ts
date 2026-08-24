import {
    Slackt,
    Person,
    PersonId,
    FindDirectRelatives,
} from './typesnmethods.js';
import {
    download,
    open,
    tryClear,
    assertElementsExist,
    retrieveFileFromLocalStorage,
    retrieveLastSelectedPerson,
    storeFileInLocalStorage,
    storeSelectedPersonInLocalStorage,
} from "./io.js";


function refresh() {
    personSelectEl.innerHTML =
        '<option value="null" disabled selected hidden>Ingen vald</option>';

    openedFile.people.forEach((p) => {
        const o = document.createElement('option');
        o.innerHTML = p.formatName('extra');
        o.value = '' + p.id;
        personSelectEl.append(o);
    });

    personSelectEl.value = '' + selectedPerson;
}

const openButton = document.getElementById('open')!;
const saveButton = document.getElementById('save')!;
const clearButton = document.getElementById('clear')!;
const listNetworkButton = document.getElementById('listNetwork')!;
//const listFamilyButton = document.getElementById('listFamily')!;
const personSelectEl = document.getElementById(
    'selectPerson',
) as HTMLSelectElement;
const mainArea = document.getElementById('viewer')!;

assertElementsExist([
    openButton,
    saveButton,
    clearButton,
    listNetworkButton,
    //listFamilyButton,
    personSelectEl,
    mainArea,
])

openButton.addEventListener('change', async (e) => {
    openedFile = (await open(e, openedFile)) ?? openedFile;
    storeFileInLocalStorage(openedFile)
    refresh();
});
saveButton.onclick = () => download(openedFile);
clearButton.onclick = () => {
    const newFile = tryClear();
    if (newFile === undefined)
        return

    openedFile = newFile;
    storeFileInLocalStorage(openedFile)
    refresh();
};

listNetworkButton.onclick = () => {
    let networksSet: Set<PersonId>[] = [];
    for (let i = 0; i < openedFile.people.length; i++) {
        if (networksSet.some((n) => n.has(openedFile.people[i].id))) continue;

        let p = openedFile.people[i];
        let network = analysePerson(p, new Set<PersonId>());
        networksSet.push(network);
    }

    let networks = networksSet.map((set) =>
        Array.from(set)
            .map((id) => openedFile.getPerson(id))
            .sort((a, b) =>
                (a.nameLast + a.nameFirst).localeCompare(
                    b.nameLast + b.nameFirst,
                    'sv',
                ),
            ),
    );

    networks
        .filter((network) => network.length > 1)
        .sort((a, b) => b.length - a.length)
        .forEach((network, i) => {
            let h = document.createElement('h3');
            h.innerHTML = `Nätverk ${i + 1} (${network.length} personer)`;
            mainArea.append(h);

            let d = document.createElement('div');
            d.classList.add('network');
            mainArea.append(d);

            network.forEach((person) => {
                let p = document.createElement('p');
                p.innerHTML = person.formatName('full') + ',';
                d.append(p);
            });
        });

    let lones = networks
        .filter((network) => network.length === 1)
        .flat()
        .sort((a, b) =>
            (a.nameLast + a.nameFirst).localeCompare(
                b.nameLast + b.nameFirst,
                'sv',
            ),
        );

    if (lones.length > 0) {
        let h = document.createElement('h3');
        h.innerHTML = `Ensamvargar (${lones.length} personer)`;
        mainArea.append(h);

        let d = document.createElement('div');
        d.classList.add('network');
        mainArea.append(d);

        lones.forEach((person) => {
            let p = document.createElement('p');
            p.innerHTML = person.formatName('full') + ',';
            d.append(p);
        });
    }
};

function analysePerson(p: Person, counted: Set<PersonId>): Set<PersonId> {
    counted.add(p.id);
    FindDirectRelatives(openedFile, p.id)
        .filter((p) => !counted.has(p))
        .forEach((r) => {
            counted = analysePerson(openedFile.getPerson(r), counted);
        });

    return counted;
}

personSelectEl.onchange = (e) => {
    let target = e.target as HTMLSelectElement;
    selectedPerson = parseInt(target.value) as PersonId;
    storeSelectedPersonInLocalStorage(selectedPerson)
    refresh();
};

let openedFile: Slackt = retrieveFileFromLocalStorage()
let selectedPerson: PersonId | null = retrieveLastSelectedPerson(openedFile)

refresh();
