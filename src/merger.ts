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
function group_first_names(s: Slackt): Map<string, number[]> {
    let ids: Map<string, number[]> = new Map()
    for (const person of s.people) {
        map_append(ids, person.nameFirst, person.id)
    }
    return ids
}

/** For two people with the same first name, return whether they could be the same person. */
function possibly_same_person(target: Slackt, source: Slackt, target_person: Person, source_person: Person): boolean {
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

    // let target_family = GetFamilyFromChild(target, target_person.id)
    // let source_family = GetFamilyFromChild(source, source_person.id)
    // if (target_family !== undefined && source_family !== undefined) {
    //     if (
    //         target_family.husband !== null
    //         && source_family.husband !== null
    //     )
    // }

    return true
}

/** 
  * Find people in the source and target files with the same first 
  * names, and try to pair them up.
  */
function identify_people(target: Slackt, source: Slackt): [Map<number, number>, Map<number, number[]>] {
    let pairs: Map<number, number> = new Map()
    let unsure_pairs: Map<number, number[]> = new Map()

    let possible_target_ids = group_first_names(target)

    for (const source_person of source.people) {
        let possible_targets = possible_target_ids
            .get(source_person.nameFirst)
            ?.map((id) => GetPerson(target, id))
            .filter((x) => x !== undefined) 
            ?? []
            .filter((possible_target) => possibly_same_person(target, source, source_person, possible_target))
        if (possible_targets.length === 1) {
            // Map person to the only possible target
            pairs.set(source_person.id, possible_targets[0].id)
        } else if (possible_targets.length > 1) {
            // Signify that person _may_ map to any of these targets
            unsure_pairs.set(source_person.id, possible_targets.map((p) => p.id))
        }
    }

    return [pairs, unsure_pairs]
}
