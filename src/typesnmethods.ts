// Helper for creating ID types that can't be mixed up with regular strings
// https://stackoverflow.com/a/50521248
type Opaque<T, K> = T & { __opaque__: K }

export type PersonId = Opaque<string, "PersonId">;
export type FamilyId = Opaque<string, "FamilyId">;


interface IPerson {
    id: PersonId;
    nameFirst: string;
    nameLast: string;
    nameLastMaiden: string;
    dateBirth: string;
    dateDeath: string;
}
interface IFamily {
    id: FamilyId;
    husband: PersonId | null;
    wife: PersonId | null;
    children: PersonId[];
    nameLastOverride: string;
    dateStart: string;
}

export class Person {
    readonly id: PersonId;
    nameFirst: string;
    nameLast: string;
    nameLastMaiden: string;
    dateBirth: string;
    dateDeath: string;

    constructor(
        id: PersonId,
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

    /** Return a copy with fields updated from `source`. */
    mergedWith(source: Person){
        let newPerson = this.copy()
        // Take names from other unless they're empty
        if (source.nameFirst !== "")
            newPerson.nameFirst = source.nameFirst
        if (source.nameLast !== "")
            newPerson.nameLast = source.nameLast
        if (source.nameLastMaiden !== "")
            newPerson.nameLastMaiden = source.nameLastMaiden
        // Take whichever date is more specific, assuming YYYY[-MM[-DD]] format
        if (this.dateBirth.length < source.dateBirth.length)
            newPerson.dateBirth = source.dateBirth
        if (this.dateDeath.length < source.dateDeath.length)
            newPerson.dateDeath = source.dateDeath
        return newPerson
    }

    asObject() {
        return Object.assign({}, this);
    }

    static fromObject(obj: IPerson): Person {
        return Object.assign(new Person(obj.id), obj);
    }

    copy(): Person {
        return Object.assign(new Person(this.id), this)
    }

    /** Return how many of its fields are filled in, for sorting purposes. */
    numFilledFields(): number {
        return [
            this.nameFirst !== "",
            this.nameLast !== "",
            this.nameLastMaiden !== "",
            this.dateBirth !== "",
            this.dateDeath !== "",
        ].reduce((partialSum, a) => partialSum + (a ? 1 : 0), 0)
    }
}

export class Family {
    readonly id: FamilyId;
    husband: PersonId | null;
    wife: PersonId | null;
    children: PersonId[];
    nameLastOverride: string;
    dateStart: string;

    constructor(
        id: FamilyId,
        husband: PersonId | null = null,
        wife: PersonId | null = null,
        children: PersonId[] = [],
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

    /** Return a copy with fields updated from `source`. */
    mergedWith(source: Family) {
        let newFamily = this.copy()
        // Take fields from source, unless they're empty
        if (source.husband !== null)
            newFamily.husband = source.husband
        if (source.wife !== null)
            newFamily.wife = source.wife
        // Deduplicate the combined children
        newFamily.children = [...new Set(this.children.concat(source.children))]
        if (source.nameLastOverride !== "")
            newFamily.nameLastOverride = source.nameLastOverride
        // Take whichever date is more specific, assuming YYYY[-MM[-DD]] format
        if (this.dateStart.length < source.dateStart.length)
            newFamily.dateStart = source.dateStart
        return newFamily
    }

    asObject() {
        return Object.assign({}, this);
    }

    static fromObject(obj: IFamily): Family {
        return Object.assign(new Family(obj.id), obj);
    }

    copy(): Family {
        return Object.assign(new Family(this.id), this)
    }
}

export class Tree {
    people: Person[];
    families: Family[];
    /** Map from a person to the families they are a parent of. */
    private familyMap: Map<PersonId, FamilyId[]>
    /** Map from a person to their parents: `[father, mother]`. */
    private parentMap: Map<PersonId, [PersonId | null, PersonId | null]>

    constructor(people: Person[] = [], families: Family[] = []) {
        this.people = people;
        this.families = families;

        // Initialize the family and parent maps
        this.familyMap = new Map()
        this.parentMap = new Map()
        for (const family of this.families) {
            if (family.husband !== null)
                mapAppend(this.familyMap, family.husband, family.id)
            if (family.wife !== null)
                mapAppend(this.familyMap, family.wife, family.id)
            for (const childId of family.children) {
                this.parentMap.set(childId, [family.husband, family.wife])
            }
        }
    }

    addEmptyPerson(): PersonId {
        let newId: PersonId = crypto.randomUUID() as PersonId;
        this.people.push(new Person(newId));
        return newId;
    }

    addEmptyFamily(): FamilyId {
        const newId: FamilyId = crypto.randomUUID() as FamilyId;

        this.families.push(new Family(newId));

        return newId;
    }

    /** Return the person with the given id, or undefined. */
    findPerson(id: PersonId | null): Person | undefined {
        return this.people.find((p) => p.id === id);
    }

    /** Get a person, and throw an error if it does not exist. */
    getPerson(id: PersonId): Person {
        let p = this.findPerson(id);
        if (p === undefined) throw new Error(`Person ${id} does not exist`);
        return p;
    }

    /** Return the family with the given id, or undefined. */
    findFamily(id: FamilyId | null): Family | undefined {
        return this.families.find((f) => f.id === id);
    }

    /** Get a family, and throw an error if it does not exist. */
    getFamily(id: FamilyId): Family {
        let p = this.findFamily(id);
        if (p === undefined) throw new Error(`Family ${id} does not exist`);
        return p;
    }

    addPersonToFamily(
        familyId: FamilyId,
        personId: PersonId | null,
        role: 'husband' | 'wife' | 'child',
    ) {
        let family = this.getFamily(familyId);

        if (role === "child") {
            if (personId !== null) {
                family.children.push(personId)
                this.parentMap.set(personId, [family.husband, family.wife])
            }
            return
        }

        if (role === "husband") {
            if (family.husband !== null) {
                // De-register the current husband
                mapRemove(this.familyMap, family.husband, familyId)
                for (const childId of family.children) {
                    const mother = this.parentMap.get(childId)![1];
                    this.parentMap.set(childId, [null, mother])
                }
            }
            family.husband = personId
        } else {
            if (family.wife !== null) {
                // De-register the current wife
                mapRemove(this.familyMap, family.wife, familyId)
                for (const childId of family.children) {
                    const father = this.parentMap.get(childId)![0];
                    this.parentMap.set(childId, [father, null])
                }
            }
            family.wife = personId
        }

        // Link this family to the given person
        if (personId !== null)
            mapAppend(this.familyMap, personId, familyId)

        // Update the children's parents
        for (const childId of family.children) {
            this.parentMap.set(childId, [family.husband, family.wife])
        }
    }

    getFamiliesFromParent(personId: PersonId): Family[] {
        return (this.familyMap.get(personId) ?? []).map((id) => this.getFamily(id))
    }

    getSpousesFromParent(personId: PersonId): Person[] {
        return (
            this.getFamiliesFromParent(personId)
                .map((f) => f.husband === personId ? f.wife : f.husband)
                .filter((id) => id !== null)
                .map((id) => this.getPerson(id))
        )
    }

    getChildrenFromParent(personId: PersonId): Person[] {
        return this.getFamiliesFromParent(personId).flatMap((f) => f.children.map(this.getPerson))
    }

    getParentsFromChild(personId: PersonId): [Person | undefined, Person | undefined] {
        if (!this.parentMap.has(personId)) {
            return [undefined, undefined]
        }
        let [fatherId, motherId] = this.parentMap.get(personId)!
        return [
            fatherId === null ? undefined : this.getPerson(fatherId),
            motherId === null ? undefined : this.getPerson(motherId),
        ]
    }

    /** Return siblings and half-siblings as two lists. */
    getSiblings(personId: PersonId): [Person[], Person[]] {
        let siblings: Set<PersonId> = new Set()
        let halfSiblings: Set<PersonId> = new Set()
        for (const parent of this.getParentsFromChild(personId)) {
            if (parent === undefined)
                continue
            const families = this.getFamiliesFromParent(parent.id)
            for (const family of families) {
                let siblingSet = family.children.includes(personId) ? siblings : halfSiblings
                for (const childId of family.children) {
                    if (childId !== personId)
                        siblingSet.add(childId)
                }
            }
        }
        return [
            [...siblings].map(id => this.getPerson(id)),
            [...halfSiblings].map(id => this.getPerson(id)),
        ]
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

export function FindDirectRelatives(s: Tree, personId: PersonId) {
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

export function personIdFromString(str: string | null): PersonId | null {
    if (str === null || str === '' || str === 'null') 
        return null;
    return str as PersonId;
}

export function familyIdFromString(str: string | null): FamilyId | null {
    if (str === null || str === '' || str === 'null') 
        return null;
    return str as FamilyId;
}

/** Append `value` to the list in `map.get(key)`. */
export function mapAppend<K, V>(map: Map<K, V[]>, key: K, value: V) {
    if (map.has(key)) {
        map.get(key)!.push(value)
    } else {
        map.set(key, [value])
    }
}

/** Remove `value` from the list in `map.get(key)`. */
export function mapRemove<K, V>(map: Map<K, V[]>, key: K, value: V) {
    let values = map.get(key) ?? []
    let i = values.findIndex(v => v === value)
    if (i !== -1) {
        values.splice(i, 1)
        map.set(key, values)
    }
}