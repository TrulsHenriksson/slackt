export class Person {
    constructor(id, nameFirst = '', nameLast = '', nameLastMaiden = '', dateBirth = '', dateDeath = '') {
        this.id = id;
        this.nameFirst = nameFirst;
        this.nameLast = nameLast;
        this.nameLastMaiden = nameLastMaiden;
        this.dateBirth = dateBirth;
        this.dateDeath = dateDeath;
    }
    formatName(type = 'short') {
        if (type === 'short')
            return this.nameFirst;
        let full = `${this.nameFirst} ${this.nameLast}${this.nameLastMaiden ? ` (f. ${this.nameLastMaiden})` : ''}`;
        if (type === 'full')
            return full;
        if (type === 'extra')
            return `#${this.id} ${full}`;
        return '';
    }
    asObject() {
        return Object.assign({}, this);
    }
    static fromObject(obj) {
        return Object.assign(new Person(obj.id), obj);
    }
}
;
export class Family {
    constructor(id, husband = null, wife = null, children = [], nameLastOverride = '', dateStart = '') {
        this.id = id;
        this.husband = husband;
        this.wife = wife;
        this.children = children;
        this.nameLastOverride = nameLastOverride;
        this.dateStart = dateStart;
    }
    /** Format the family string using the given Slackt file. */
    formatFamily(s) {
        let husband = this.husband !== null ? s.findPerson(this.husband) : null;
        let wife = this.wife !== null ? s.findPerson(this.wife) : null;
        let husbandName = husband ? husband.formatName() : null;
        let wifeName = wife ? wife.formatName() : null;
        let childrenNames = this.children.map((c) => s.findPerson(c)?.formatName());
        return `#${this.id} (${this.nameLastOverride || husband?.nameLast || wife?.nameLast || '?'}) ${husbandName ?? '?'} + ${wifeName ?? '?'}${childrenNames.length > 0 ? ' = ' + childrenNames.join(', ') : ''}`;
    }
    asObject() {
        return Object.assign({}, this);
    }
    static fromObject(obj) {
        return Object.assign(new Family(obj.id), obj);
    }
}
;
export class Slackt {
    constructor(people = [], families = []) {
        this.people = people;
        this.families = families;
    }
    addEmptyPerson() {
        let newId = this.people.length;
        this.people.push(new Person(newId));
        return newId;
    }
    addEmptyFamily() {
        let newId = this.families.length;
        this.families.push(new Family(newId));
        return newId;
    }
    /** Return the person with the given id, or undefined. */
    findPerson(id) {
        return this.people.find((p) => p.id === id);
    }
    /** Get a person, and throw an error if it does not exist. */
    getPerson(id) {
        let p = this.findPerson(id);
        if (p === undefined)
            throw new Error(`Person ${id} does not exist`);
        return p;
    }
    /** Return the family with the given id, or undefined. */
    findFamily(id) {
        return this.families.find((f) => f.id === id);
    }
    /** Get a family, and throw an error if it does not exist. */
    getFamily(id) {
        let p = this.findFamily(id);
        if (p === undefined)
            throw new Error(`Family ${id} does not exist`);
        return p;
    }
    addPersonToFamily(familyId, personId, role) {
        let family = this.getFamily(familyId);
        switch (role) {
            case "husband": family.husband = personId;
            case "wife": family.husband = personId;
            case "child": family.children.push(personId);
        }
    }
    asObject() {
        return {
            people: this.people.map((p) => p.asObject()),
            families: this.families.map((f) => f.asObject()),
        };
    }
    static fromObject(obj) {
        return new Slackt(obj.people.map((p) => Person.fromObject(p)), obj.families.map((f) => Family.fromObject(f)));
    }
    stringify() {
        return JSON.stringify(this.asObject());
    }
    static fromString(str) {
        return Slackt.fromObject(JSON.parse(str));
    }
}
export function FindDirectRelatives(s, personId) {
    let families = s.families.filter((f) => f.husband === personId ||
        f.wife === personId ||
        f.children.includes(personId));
    let allFamilyMembers = families.flatMap((f) => [f.husband, f.wife, ...f.children].filter((id) => id !== null));
    return allFamilyMembers.filter((id) => id !== personId);
}
export function download(openedFile) {
    const blob = new Blob([openedFile.stringify()], {
        type: 'application/json',
    });
    const el = document.createElement('a');
    el.setAttribute('href', window.URL.createObjectURL(blob));
    let d = new Date();
    var datestring = d.getFullYear() +
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
export async function open(e, openedFile) {
    if (e.target instanceof HTMLInputElement) {
        const file = e.target.files?.item(0);
        const text = await file?.text();
        if (!file || !text) {
            console.error('äawh');
            return null;
        }
        try {
            openedFile = Slackt.fromString(text);
        }
        catch (error) {
            console.error('Fel på filen', error);
        }
        if (openedFile) {
            localStorage.setItem('openedFile', openedFile.stringify());
            return openedFile;
        }
    }
}
export function clear() {
    let newFile = new Slackt();
    localStorage.setItem('openedFile', newFile.stringify());
    return newFile;
}
//# sourceMappingURL=typesnmethods.js.map