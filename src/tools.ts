import {
    PersonId,
    Tree,
    open,
    download,
    FindDirectRelatives,
    Person,
} from './typesnmethods.js';
import { supabase } from './supabase.js';

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
const databaseButton = document.getElementById('database')!;
const commentField = document.getElementById('comment') as HTMLInputElement;
const personSelectEl = document.getElementById(
    'selectPerson',
) as HTMLSelectElement;
const mainArea = document.getElementById('viewer')!;

[
    openButton,
    saveButton,
    clearButton,
    listNetworkButton,
    //listFamilyButton,
    databaseButton,
    commentField,
    personSelectEl,
    mainArea,
].forEach((element) => {
    if (!element) throw new Error();
});

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

function analysePerson(p: Person, counted: Set<PersonId>) {
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
    selectedPerson = parseInt(target.value);
    localStorage.setItem('selectedPerson', target.value);
    refresh();
};

databaseButton.onclick = async () => {
    let data = await supabase
        .from('trees')
        .insert({
            data: openedFile.stringify(),
            comment: commentField.value,
            by_user: (await supabase.auth.getSession()).data.session?.user.id,
        })
        .select();
    console.log(data);
};

let openedFile = new Tree();
let fromLS = localStorage.getItem('openedFile');
if (fromLS) {
    openedFile = Tree.fromString(fromLS);
}

let selectedPerson: number | null = null;
let sf = localStorage.getItem('selectedPerson');
if (sf !== null && sf !== 'null') selectedPerson = parseInt(sf);

refresh();
