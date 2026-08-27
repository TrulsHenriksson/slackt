export type UUID = string;

interface IPerson {
    id: UUID;
    nameFirst: string;
    nameLast: string;
    nameLastMaiden: string;
    dateBirth: string;
    dateDeath: string;
}
interface IFamily {
    id: UUID;
    husband: UUID | null;
    wife: UUID | null;
    children: UUID[];
    nameLastOverride: string;
    dateStart: string;
}

export class Person {
    id: UUID;
    nameFirst: string;
    nameLast: string;
    nameLastMaiden: string;
    dateBirth: string;
    dateDeath: string;

    constructor(
        id: UUID,
        nameFirst: string = '',
        nameLast: string = '',
        nameLastMaiden: string = '',
        dateBirth: string = '',
        dateDeath: string = '',
    ) {
        this.id = id;
        this.nameFirst = nameFirst;
        this.nameLast = nameLast;
        this.nameLastMaiden = nameLastMaiden;
        this.dateBirth = dateBirth;
        this.dateDeath = dateDeath;
    }

    formatName(type: 'short' | 'full' | 'extra' = 'short') {
        if (type === 'short') return this.nameFirst;

        let full = `${this.nameFirst} ${this.nameLast}${
            this.nameLastMaiden ? ` (f. ${this.nameLastMaiden})` : ''
        }`;

        if (type === 'full') return full;

        if (type === 'extra') return `#${this.id} ${full}`;

        return '';
    }

    asObject() {
        return Object.assign({}, this);
    }

    static fromObject(obj: IPerson): Person {
        return Object.assign(new Person(obj.id), obj);
    }
}

export class Family {
    id: UUID;
    husband: UUID | null;
    wife: UUID | null;
    children: UUID[];
    nameLastOverride: string;
    dateStart: string;

    constructor(
        id: UUID,
        husband: UUID | null = null,
        wife: UUID | null = null,
        children: UUID[] = [],
        nameLastOverride: string = '',
        dateStart: string = '',
    ) {
        this.id = id;
        this.husband = husband;
        this.wife = wife;
        this.children = children;
        this.nameLastOverride = nameLastOverride;
        this.dateStart = dateStart;
    }

    /** Format the family string using the given Tree. */
    formatFamily(s: Tree) {
        let husband = this.husband !== null ? s.findPerson(this.husband) : null;
        let wife = this.wife !== null ? s.findPerson(this.wife) : null;
        let husbandName = husband ? husband.formatName() : null;
        let wifeName = wife ? wife.formatName() : null;
        let childrenNames = this.children.map((c) =>
            s.findPerson(c)?.formatName(),
        );

        return `(${this.nameLastOverride || husband?.nameLast || wife?.nameLast || '?'}) ${husbandName ?? '?'} + ${wifeName ?? '?'}${childrenNames.length > 0 ? ' = ' + childrenNames.join(', ') : ''}`;
    }

    asObject() {
        return Object.assign({}, this);
    }

    static fromObject(obj: IFamily): Family {
        return Object.assign(new Family(obj.id), obj);
    }
}

export class Tree {
    people: Person[];
    families: Family[];

    constructor(people: Person[] = [], families: Family[] = []) {
        this.people = people;
        this.families = families;
    }

    addEmptyPerson(): UUID {
        let newId: UUID = crypto.randomUUID();
        this.people.push(new Person(newId));
        return newId;
    }

    addEmptyFamily(): UUID {
        const newId: UUID = crypto.randomUUID();

        this.families.push(new Family(newId));

        return newId;
    }

    /** Return the person with the given id, or undefined. */
    findPerson(id: UUID | null): Person | undefined {
        return this.people.find((p) => p.id === id);
    }

    /** Get a person, and throw an error if it does not exist. */
    getPerson(id: UUID): Person {
        let p = this.findPerson(id);
        if (p === undefined) throw new Error(`Person ${id} does not exist`);
        return p;
    }

    /** Return the family with the given id, or undefined. */
    findFamily(id: UUID | null): Family | undefined {
        return this.families.find((f) => f.id === id);
    }

    /** Get a family, and throw an error if it does not exist. */
    getFamily(id: UUID): Family {
        let p = this.findFamily(id);
        if (p === undefined) throw new Error(`Family ${id} does not exist`);
        return p;
    }

    addPersonToFamily(
        familyId: UUID,
        personId: UUID | null,
        role: 'husband' | 'wife' | 'child',
    ) {
        let family = this.getFamily(familyId);

        switch (role) {
            case 'husband':
                family.husband = personId;
            case 'wife':
                family.husband = personId;
            case 'child':
                if (personId !== null) family.children.push(personId);
        }
    }

    asObject(): Object {
        return {
            people: this.people.map((p) => p.asObject()),
            families: this.families.map((f) => f.asObject()),
        };
    }

    static fromObject(obj: { people: IPerson[]; families: IFamily[] }) {
        return new Tree(
            obj.people.map((p) => Person.fromObject(p)),
            obj.families.map((f) => Family.fromObject(f)),
        );
    }

    stringify(): string {
        return JSON.stringify(this.asObject());
    }

    static fromString(str: string | null): Tree {
        if (str === null) return new Tree();

        return Tree.fromObject(JSON.parse(str));
    }
}

export function FindDirectRelatives(s: Tree, personId: UUID) {
    let families = s.families.filter(
        (f) =>
            f.husband === personId ||
            f.wife === personId ||
            f.children.includes(personId),
    );
    let allFamilyMembers = families.flatMap((f) =>
        [f.husband, f.wife, ...f.children].filter((id) => id !== null),
    );
    return allFamilyMembers.filter((id) => id !== personId);
}

export function download(openedFile: Tree) {
    const blob = new Blob([openedFile.stringify()], {
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

export async function open(e: Event) {
    if (e.target instanceof HTMLInputElement) {
        const file = e.target.files?.item(0);
        const text = await file?.text();
        if (!file || !text) {
            throw new Error('äawh');
        }
        let openedFile: Tree | null = null;
        try {
            openedFile = Tree.fromString(text);
        } catch (error) {
            throw new Error('Fel på filen: ' + error);
        }

        if (openedFile) {
            return openedFile;
        }
    }
    throw new Error('fel');
}

export function uuidFromString(str: UUID | null) {
    if (str === null || str === '' || str === 'null') return null;

    return str;
}
