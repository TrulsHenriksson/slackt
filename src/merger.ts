import {
    Slackt,
    FormatName,
    FindPerson,
    FindPeople,
    Person,
    FormatFamily,
    FindDirectRelatives,
    AddPerson,
    FindFamily,
    Family,
    AddFamily,
    download,
    open,
    clear,
    GetPerson,
    GetFamilyFromChild,
} from './typesnmethods.js';


/** Append value to a key's array if the key exists, otherwise insert [value]. */
function map_append<K, V>(m: Map<K, V[]>, key: K, value: V) {
    if (m.has(key)) {
        m.get(key)!.push(value)
    } else {
        m.set(key, [value])
    }
}

/** Make a map from first names to the people with that name */
function groupFirstNames(s: Slackt): Map<string, number[]> {
    let ids: Map<string, number[]> = new Map()
    for (const person of s.people) {
        map_append(ids, person.nameFirst, person.id)
    }
    return ids
}


type ParentMap = Map<number, [number | null, number | null]>

/** Make a map from ids to the parents of those ids */
function getParentMap(s: Slackt): ParentMap {
    let parents: ParentMap = new Map()
    for (const person of s.people) {
        let family = GetFamilyFromChild(s, person.id)
        if (family === undefined)
            continue
        parents.set(person.id, [family.husband, family.wife])
    }
    return parents
}

/** For two people with the same first name, return whether they could be the same person. */
function possibly_same_person(
    target: Slackt,
    source: Slackt,
    target_parents: ParentMap,
    source_parents: ParentMap,
    target_person: Person,
    source_person: Person,
    check_parents: boolean = true,
): boolean {
    // Check that these fields match (if they are not empty)
    if (
        target_person.dateBirth !== ""
        && source_person.dateBirth !== ""
        && target_person.dateBirth !== source_person.dateBirth
    ) return false
    if (
        target_person.dateDeath !== ""
        && source_person.dateDeath !== ""
        && target_person.dateDeath !== source_person.dateDeath
    ) return false
    if (
        target_person.nameLastMaiden !== ""
        && source_person.nameLastMaiden !== ""
        && target_person.nameLastMaiden !== source_person.nameLastMaiden
    ) return false

    if (!check_parents)
        // Don't check any more recursively
        return true

    // Father, then mother
    for (let i of [0, 1]) {
        let target_parent_id = (target_parents.get(target_person.id) ?? [null, null])[i]
        let source_parent_id = (source_parents.get(source_person.id) ?? [null, null])[i]
        if (target_parent_id === null || source_parent_id === null) 
            continue

        let target_parent = GetPerson(target, target_parent_id)
        let source_parent = GetPerson(source, source_parent_id)
        if (target_parent === undefined || source_parent === undefined) 
            continue

        // If any of the parents don't match, return false (and don't recurse more than once)
        if (!possibly_same_person(target, source, target_parents, source_parents, target_parent, source_parent, check_parents=false)) {
            return false
        }
    }

    // No checks failed, these two could be the same
    return true
}

/**
  * Find people in the source and target files with the same first
  * names, and try to pair them up.
  */
export function identify_people(target: Slackt, source: Slackt): [Map<number, number>, Map<number, number[]>] {
    let pairs: Map<number, number> = new Map()
    let unsure_pairs: Map<number, number[]> = new Map()

    let possible_source_ids = groupFirstNames(source)
    let target_parents = getParentMap(target)
    let source_parents = getParentMap(source)

    for (let target_person of target.people) {
        let possible_sources = (
            possible_source_ids
            .get(target_person.nameFirst)
            ?.map((id) => GetPerson(target, id))
            .filter((x) => x !== undefined)
            ?? []
        ).filter((possible_source) => possibly_same_person(target, source, target_parents, source_parents, target_person, possible_source))

        if (possible_sources.length === 0) {
            continue
        } else if (possible_sources.length === 1) {
            // Map person to the only possible target
            pairs.set(target_person.id, possible_sources[0].id)
        } else if (possible_sources.length > 1) {
            // Signify that person _may_ map to any of these targets
            unsure_pairs.set(target_person.id, possible_sources.map((p) => p.id))
        }
    }

    console.log(pairs)
    console.log(unsure_pairs)
    return [pairs, unsure_pairs]
}
