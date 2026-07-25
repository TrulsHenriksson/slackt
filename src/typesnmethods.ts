export type Person = {
    /** The unique, nonnegative id of the person. */
    id: number;
    /** The first name of the person. */
    nameFirst: string;
    /** The last name the person currently has, or had last. Empty signifies unknown. */
    nameLast: string;
    /** The last name the person received at birth. Empty signifies unknown or no surname change. */
    nameLastMaiden: string;
    /** The date of birth, as a YYYY[-MM[-DD]] string. Empty signifies unknown. */
    dateBirth: string;
    /** The date the person died, as a YYYY[-MM[-DD]] string. Empty signifies unknown or still alive. */
    dateDeath: string;
};

export type Family = {
    /** The unique, nonnegative id of the family. */
    id: number;
    /** The husband's id. Null signifies unknown. */
    husband: number | null;
    /** The wife's id. Null signifies unknown. */
    wife: number | null;
    /** The ids of the children. Unknown children should not be included. */
    children: number[];
    /** The last name inherited by the children. Empty signifies to primarily take the husband's last name, secondly the wife's. */
    nameLastOverride: string;
    /** The date the parent's relation (marriage or similar) started, as a YYYY[-MM[-DD]] string. */
    dateStart: string;
};

export type Slackt = {
    people: Person[];
    families: Family[];
};

export function AddPerson(s: Slackt) {
    let newId = s.people.length;

    s.people.push({
        id: newId,
        nameFirst: '',
        nameLast: '',
        nameLastMaiden: '',
        dateBirth: '',
        dateDeath: '',
    });

    return newId;
}

export function FindPerson(s: Slackt, personId: number) {
    let person = s.people.find((p) => p.id === personId);
    if (person === undefined)
        throw new Error(`Person ${personId} does not exist`);
    return person;
}

export function FindPeople(s: Slackt, personIds: number[]) {
    return personIds.map((p) => FindPerson(s, p));
}

export function GetPerson(s: Slackt, personId: number) {
    return s.people.find((p) => p.id === personId);
}

export function GetFamilyFromChild(s: Slackt, personId: number) {
    return s.families.find((f) => f.children.includes(personId))
}

export function FormatName(
    p: Person,
    type: 'short' | 'full' | 'extra' = 'short',
) {
    if (type === 'short') return p.nameFirst;

    let full = `${p.nameFirst} ${p.nameLast}${
        p.nameLastMaiden ? ` (f. ${p.nameLastMaiden})` : ''
    }`;

    if (type === 'full') return full;

    if (type === 'extra') return `#${p.id} ${full}`;

    return '';
}

export function FindFamily(s: Slackt, familyId: number) {
    let family = s.families.find((p) => p.id === familyId);
    if (family === undefined)
        throw new Error(`Family ${familyId} does not exist`);
    return family;
}

export function FindDirectRelatives(s: Slackt, personId: number) {
    let families = s.families.filter(
        (f) =>
            f.husband === personId ||
            f.wife === personId ||
            f.children.includes(personId),
    );
    let allFamilyMembers = families.flatMap((f) =>
        [f.husband, f.wife, ...f.children].filter(
            (id): id is number => id !== null,
        ),
    );
    return allFamilyMembers.filter((id) => id !== personId);
}

export function FormatFamily(s: Slackt, f: Family) {
    let husband = f.husband !== null ? FindPerson(s, f.husband) : null;
    let husbandName = husband !== null ? FormatName(husband) : null;
    let wife = f.wife !== null ? FindPerson(s, f.wife) : null;
    let wifeName = wife !== null ? FormatName(wife) : null;
    let children = f.children.map((c) => FormatName(FindPerson(s, c)));

    return `#${f.id} (${f.nameLastOverride || husband?.nameLast || wife?.nameLast || '?'}) ${husbandName ?? '?'} + ${wifeName ?? '?'}${children.length > 0 ? ' = ' + children.join(', ') : ''}`;
}

export function AddFamily(s: Slackt) {
    let newId = s.families.length;

    s.families.push({
        id: newId,
        husband: null,
        wife: null,
        children: [],
        nameLastOverride: '',
        dateStart: '',
    });

    return newId;
}

export function AddPersonToFamily(
    s: Slackt,
    familyId: number,
    personId: number,
    role: 'husband' | 'wife' | 'child',
) {
    let family = s.families.find((f) => f.id === familyId);

    if (!family) throw new Error(`Family ${familyId} does not exist`);

    if (role === 'husband') family.husband = personId;
    if (role === 'wife') family.husband = personId;
    if (role === 'child') family.children.push(personId);

    return family;
}

export function download(openedFile: Slackt) {
    const blob = new Blob([JSON.stringify(openedFile)], {
        type: 'application/json',
    });
    const el = document.createElement('a');
    el.setAttribute('href', window.URL.createObjectURL(blob));

    let d = new Date();
    var datestring =
        d.getFullYear() +
        '-' +
        (d.getMonth() + 1).toString().padStart(2, '0') +
        '-' +
        d.getDate().toString().padStart(2, '0') +
        ' ' +
        d.getHours().toString().padStart(2, '0') +
        ':' +
        d.getMinutes().toString().padStart(2, '0');
    const fileName = 'slackt ' + datestring + '.json';

    el.setAttribute('download', fileName);
    el.click();
}

export async function open(e: Event, openedFile: Slackt) {
    if (e.target instanceof HTMLInputElement) {
        const file = e.target.files?.item(0);
        const text = await file?.text();
        if (!file || !text) {
            console.error('äawh');
            return null;
        }
        try {
            openedFile = JSON.parse(text);
        } catch (error) {
            console.error('Fel på filen', error);
        }

        if (openedFile) {
            localStorage.setItem('openedFile', JSON.stringify(openedFile));
            return openedFile;
        }
    }
}

export function clear() {
    localStorage.setItem('openedFile', '{ "people": [], "families": [] }');
    return { people: [], families: [] };
}
