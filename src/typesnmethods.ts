// Helper for creating ID types that can't be mixed up with regular numbers
// https://stackoverflow.com/a/50521248
type Opaque<T, K> = T & { __opaque__: K }

export type PersonId = Opaque<number, "PersonId">
export type FamilyId = Opaque<number, "FamilyId">

interface IPerson {
    id: PersonId;
    /** The first name of the person. Must not be empty. */
    nameFirst: string;
    /** The last name the person currently has, or had last. Empty signifies unknown. */
    nameLast: string;
    /** The last name the person received at birth. Empty signifies unknown or no surname change. */
    nameLastMaiden: string;
    /** The date of birth, as a YYYY[-MM[-DD]] string. Empty signifies unknown. */
    dateBirth: string;
    /** The date the person died, as a YYYY[-MM[-DD]] string. Empty signifies unknown or still alive. */
    dateDeath: string;
}
interface IFamily {
    id: FamilyId;
    husband: PersonId | null;
    wife: PersonId | null;
    children: PersonId[];
    nameLastOverride: string;
    /** The date the parent's relation (marriage or similar) started, as a YYYY[-MM[-DD]] string. */
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
        dateDeath: string = ''
    ) {
        this.id = id
        this.nameFirst = nameFirst
        this.nameLast = nameLast
        this.nameLastMaiden = nameLastMaiden
        this.dateBirth = dateBirth
        this.dateDeath = dateDeath
    }

    formatName(type: 'short' | 'full' | 'extra' = 'short') {
        if (type === 'short')
            return this.nameFirst;

        let full = `${this.nameFirst}`
        if (this.nameLast !== "")
            full += " " + this.nameLast
        if (this.nameLastMaiden !== "")
            full += ` (f. ${this.nameLastMaiden})`

        if (type === 'full')
            return full;

        if (type === 'extra')
            return `#${this.id} ${full}`;

        return '';
    }

    updateFrom(other: Person){
        // Take names from other unless they're empty
        if (other.nameFirst !== "")
            this.nameFirst = other.nameFirst
        if (other.nameLast !== "") 
            this.nameLast = other.nameLast
        if (other.nameLastMaiden !== "")
            this.nameLastMaiden = other.nameLastMaiden
        // Take whichever date is more specific, assuming YYYY[-MM[-DD]] format
        if (this.dateBirth.length < other.dateBirth.length)
            this.dateBirth = other.dateBirth
        if (this.dateDeath.length < other.dateDeath.length)
            this.dateDeath = other.dateDeath
    }

    asObject(): IPerson {
        return Object.assign({}, this);
    }

    static fromObject(obj: IPerson): Person {
        return Object.assign(new Person(obj.id), obj)
    }

    copy(): Person {
        return Object.assign(new Person(this.id), this)
    }
};

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
        this.id = id
        this.husband = husband
        this.wife = wife
        this.children = children
        this.nameLastOverride = nameLastOverride
        this.dateStart = dateStart
    }

    /** Format the family string using the given Slackt file. */
    formatFamily(s: Slackt) {
        let husband = this.husband !== null ? s.findPerson(this.husband) : null;
        let wife = this.wife !== null ? s.findPerson(this.wife) : null;
        let husbandName = husband ? husband.formatName() : null;
        let wifeName = wife ? wife.formatName() : null;
        let childrenNames = this.children.map((c) => s.findPerson(c)?.formatName());

        return `#${this.id} (${this.nameLastOverride || husband?.nameLast || wife?.nameLast || '?'}) ${husbandName ?? '?'} + ${wifeName ?? '?'}${childrenNames.length > 0 ? ' = ' + childrenNames.join(', ') : ''}`;
    }

    updateFrom(other: Family) {
        // Take fields from other, unless they're empty
        if (other.husband !== null)
            this.husband = other.husband
        if (other.wife !== null)
            this.wife = other.wife
        // Deduplicate the combined children
        this.children = [...new Set(this.children.concat(other.children))]
        if (other.nameLastOverride !== "")
            this.nameLastOverride = other.nameLastOverride
        // Take whichever date is more specific, assuming YYYY[-MM[-DD]] format
        if (this.dateStart.length < other.dateStart.length)
            this.dateStart = other.dateStart
    }

    asObject(): IFamily {
        return Object.assign({}, this);
    }

    static fromObject(obj: IFamily): Family {
        return Object.assign(new Family(obj.id), obj)
    }

    copy(): Family {
        return Object.assign(new Family(this.id), this)
    }
};


/** Append value to a key's array if the key exists, otherwise insert [value]. */
export function map_append<K, V>(m: Map<K, V[]>, key: K, value: V) {
    if (m.has(key)) {
        m.get(key)!.push(value)
    } else {
        m.set(key, [value])
    }
}


export class Slackt {
    readonly people: Person[]
    readonly families: Family[]
    /** Map from a person to the families they are a parent of. */
    private familyMap: Map<PersonId, FamilyId[]>
    /** Map from a person to their parents, [husband, wife]. */
    private parentMap: Map<PersonId, [PersonId | null, PersonId | null]>

    constructor(people: Person[] = [], families: Family[] = []) {
        this.people = people
        this.families = families

        // Initialize the family and parent maps
        this.familyMap = new Map()
        this.parentMap = new Map()
        for (const family of this.families) {
            if (family.husband !== null)
                map_append(this.familyMap, family.husband, family.id)
            if (family.wife !== null)
                map_append(this.familyMap, family.wife, family.id)
            for (const childId of family.children) {
                this.parentMap.set(childId, [family.husband, family.wife])
            }
        }
    }

    addEmptyPerson(): Person {
        let newPerson = new Person(this.people.length as PersonId);
        this.people.push(newPerson)
        return newPerson
    }

    addEmptyFamily(): Family {
        let newFamily = new Family(this.families.length as FamilyId);
        this.families.push(newFamily)
        return newFamily
    }

    /** Return the person with the given id, or undefined. */
    findPerson(id: PersonId): Person | undefined {
        return this.people.find((p) => p.id === id)
    }

    /** Get a person, and throw an error if it does not exist. */
    getPerson(id: PersonId): Person {
        let p = this.findPerson(id)
        if (p === undefined)
            throw new Error(`Person ${id} does not exist`)
        return p
    }

    /** Return the family with the given id, or undefined. */
    findFamily(id: FamilyId): Family | undefined {
        return this.families.find((f) => f.id === id)
    }

    /** Get a family, and throw an error if it does not exist. */
    getFamily(id: FamilyId): Family {
        let p = this.findFamily(id)
        if (p === undefined)
            throw new Error(`Family ${id} does not exist`)
        return p
    }

    addPersonToFamily(familyId: FamilyId, personId: PersonId, role: 'husband' | 'wife' | 'child') {
        let family = this.getFamily(familyId)

        if (role === "child") {
            family.children.push(personId)
            this.parentMap.set(personId, [family.husband, family.wife])
            return
        }

        if (role === "husband") {
            if (family.husband !== null)
                throw new Error(`Family ${familyId} already had a husband.`)
            family.husband = personId
            map_append(this.familyMap, family.husband, familyId)
        } else {   
            if (family.wife !== null)
                throw new Error(`Family ${familyId} already had a wife.`)
            family.wife = personId
            map_append(this.familyMap, family.wife, familyId)
        }

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

    asObject(): Object {
        return {
            people: this.people.map((p) => p.asObject()),
            families: this.families.map((f) => f.asObject()),
        }
    }

    static fromObject(obj: {people: IPerson[], families: IFamily[]}) {
        return new Slackt(
            obj.people.map((p) => Person.fromObject(p)),
            obj.families.map((f) => Family.fromObject(f))
        )
    }

    stringify(): string {
        return JSON.stringify(this.asObject())
    }

    static fromString(str: string): Slackt {
        return Slackt.fromObject(JSON.parse(str))
    }

    copy(): Slackt {
        return new Slackt(
            this.people.map((p) => p.copy()),
            this.families.map((f) => f.copy()),
        )
    }
}


export function FindDirectRelatives(s: Slackt, personId: PersonId) {
    let families = s.families.filter(
        (f) =>
            f.husband === personId ||
            f.wife === personId ||
            f.children.includes(personId),
    );
    let allFamilyMembers = families.flatMap((f) =>
        [f.husband, f.wife, ...f.children].filter(
            (id) => id !== null,
        ),
    );
    return allFamilyMembers.filter((id) => id !== personId);
}

