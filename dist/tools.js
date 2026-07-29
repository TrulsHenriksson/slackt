import { Slackt, open, download, clear, FindDirectRelatives, } from './typesnmethods.js';
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
const openButton = document.getElementById('open');
if (!openButton)
    throw new Error();
const saveButton = document.getElementById('save');
if (!saveButton)
    throw new Error();
const clearButton = document.getElementById('clear');
if (!clearButton)
    throw new Error();
const listNetworkButton = document.getElementById('listNetwork');
if (!listNetworkButton)
    throw new Error();
const listFamilyButton = document.getElementById('listFamily');
if (!listFamilyButton)
    throw new Error();
openButton.addEventListener('change', async (e) => {
    openedFile = (await open(e, openedFile)) || openedFile;
    refresh();
});
saveButton.onclick = () => download(openedFile);
clearButton.onclick = () => {
    openedFile = clear();
    refresh();
};
listNetworkButton.onclick = () => {
    let networks = [];
    for (let i = 0; i < openedFile.people.length; i++) {
        if (networks.some((n) => n.has(openedFile.people[i].id)))
            continue;
        let p = openedFile.people[i];
        let network = analysePerson(p, new Set());
        networks.push(network);
    }
    networks
        .map((set) => Array.from(set)
        .map((id) => openedFile.getPerson(id))
        .map((p) => p.formatName('full')))
        .forEach((network, i) => {
        let h = document.createElement('h3');
        h.innerHTML = `Nätverk ${i + 1} (${network.length} personer)`;
        mainArea.append(h);
        let d = document.createElement('div');
        d.classList.add('network');
        mainArea.append(d);
        network.forEach((name) => {
            let p = document.createElement('p');
            p.innerHTML = name + ',';
            d.append(p);
        });
    });
};
function analysePerson(p, counted) {
    counted.add(p.id);
    FindDirectRelatives(openedFile, p.id)
        .filter((p) => !counted.has(p))
        .forEach((r) => {
        counted = analysePerson(openedFile.getPerson(r), counted);
    });
    return counted;
}
const personSelectEl = document.getElementById('selectPerson');
personSelectEl.onchange = (e) => {
    let target = e.target;
    selectedPerson = parseInt(target.value);
    localStorage.setItem('selectedPerson', target.value);
    refresh();
};
const mainArea = document.getElementById('viewer');
let openedFile = new Slackt();
let fromLS = localStorage.getItem('openedFile');
if (fromLS) {
    openedFile = Slackt.fromString(fromLS);
}
let selectedPerson = null;
let sf = localStorage.getItem('selectedPerson');
if (sf !== null && sf !== 'null')
    selectedPerson = parseInt(sf);
refresh();
//# sourceMappingURL=tools.js.map