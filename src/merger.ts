import { isNewExpression } from 'typescript/unstable/ast';
import {
    Slackt,
    Person,
    Family,
    PersonId,
    FamilyId,
    FindDirectRelatives,
    map_append,
    download,
    open,
    clear,
} from './typesnmethods.js';



/** Make a map from first names to the people with that name */
function groupFirstNames(s: Slackt): Map<string, number[]> {
    let ids: Map<string, number[]> = new Map()
    for (const person of s.people) {
        map_append(ids, person.nameFirst, person.id)
    }
    return ids
}


/** For two people with the same first name, return whether they could be the same person. */
function possibly_same_person(
    target: Slackt,
    source: Slackt,
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
    // Because of name changes, we can only use the first surname the people had
    // Example: Anna Svensson could be the same as Anna Jönsson (f. Svensson).
    let targetOriginalLastName = target_person.nameLastMaiden === "" ? target_person.nameLast : target_person.nameLastMaiden
    let sourceOriginalLastName = source_person.nameLastMaiden === "" ? source_person.nameLast : source_person.nameLastMaiden
    if (
        targetOriginalLastName !== ""
        && sourceOriginalLastName !== ""
        && targetOriginalLastName !== sourceOriginalLastName
    ) return false

    if (!check_parents)
        // Don't check any more recursively
        return true

    // Father, then mother
    let target_parents = target.getParentsFromChild(target_person.id)
    let source_parents = source.getParentsFromChild(source_person.id)
    for (let i of [0, 1]) {
        // If any of the parents don't match, return false (and don't recurse more than once)
        if (
            target_parents[i] !== undefined
            && source_parents[i] !== undefined
            && !possibly_same_person(target, source, target_parents[i], source_parents[i], check_parents=false)
        ) {
            return false
        }
    }

    // No checks failed, these two could be the same
    return true
}

/**
  * Find people in the source and target files with the same first
  * names, and try to pair them up.
  * 
  * @param target The (currently open) file to use as a base for the merge.
  * @param source The (newly opened) file to merge from.
  * @returns A map `targetIds` of source person => target person pairs, and a map `candidateIds` of
  * target person => [source person, ...] pairs representing the targets with multiple compatible source people.
  */
function identify_people(target: Slackt, source: Slackt): [Map<PersonId, PersonId>, Map<PersonId, PersonId[]>] {
    /** Map from a source person's id to the identified target person's id */
    let targetIds: Map<PersonId, PersonId> = new Map()
    /** Map from a target person's id to the ids of the candidate source people */
    let candidateIds: Map<PersonId, PersonId[]> = new Map()

    let firstNameIds = groupFirstNames(source)

    for (let targetPerson of target.people) {
        let candidates = (
            firstNameIds
            .get(targetPerson.nameFirst)
            ?.map((id) => source.getPerson(id))
            ?? []
        ).filter((candidate) => possibly_same_person(target, source, targetPerson, candidate))

        if (candidates.length === 0) {
            continue
        } else if (candidates.length === 1) {
            // Map the only possible source person to the target
            targetIds.set(candidates[0].id, targetPerson.id)
        } else if (candidates.length > 1) {
            // Signify that any of these sources may map to the target
            candidateIds.set(targetPerson.id, candidates.map((p) => p.id))
        }
    }

    return [targetIds, candidateIds]
}



function groupFamilies(s: Slackt) {
    let childMap: Map<PersonId, FamilyId> = new Map()
    let husbandMap: Map<PersonId, FamilyId[]> = new Map()
    let wifeMap: Map<PersonId, FamilyId[]> = new Map()
    for (const family of s.families) {
        for (const childId of family.children) {
            childMap.set(childId, family.id)
        }
        if (family.husband !== null) {
            map_append(husbandMap, family.husband, family.id)
        }
        if (family.wife !== null) {
            map_append(wifeMap, family.wife, family.id)
        }
    }

    return [childMap, husbandMap, wifeMap]
}

/** Return false for families that are definitely different, and true otherwise.
 *
 *  Assumes that the source PersonIds have already been aligned with the target ones.
 */
function possibly_same_family(target_family: Family, source_family: Family): boolean {
    if (
        target_family.husband !== null
        && source_family.husband !== null
        && target_family.husband !== source_family.husband
    )
        return false
    if (
        target_family.wife !== null
        && source_family.wife !== null
        && target_family.wife !== source_family.wife
    )
        return false
    if (
        target_family.nameLastOverride !== ""
        && source_family.nameLastOverride !== ""
        && target_family.nameLastOverride !== source_family.nameLastOverride
    )
        return false
    if (
        target_family.dateStart !== ""
        && source_family.dateStart !== ""
        && target_family.dateStart !== source_family.dateStart
    )
        return false

    // Didn't fail any tests, they could be the same
    return true
}

function identify_families(
    targetFamilies: Family[], sourceFamilies: Family[]
): [Map<FamilyId, FamilyId>, Map<FamilyId, FamilyId[]>]
{
    let targetIds: Map<FamilyId, FamilyId> = new Map()
    let candidateIds: Map<FamilyId, FamilyId[]> = new Map()

    for (const targetFamily of targetFamilies) {
        // TODO: Improve this filtering, currently O(n*m). Use the maps from groupFamilies.
        let candidates = sourceFamilies.filter((candidate) => possibly_same_family(targetFamily, candidate))

        if (candidates.length === 0) {
            continue
        } else if (candidates.length === 1) {
            targetIds.set(candidates[0].id, targetFamily.id)
        } else {
            candidateIds.set(targetFamily.id, candidates.map((f) => f.id))
        }
    }

    return [targetIds, candidateIds]
}


/** Create a new Slackt file by copying or adding data from `source` into `target`.
 * 
 * Leaves both `target` and `source` unchanged, and shows an alert if the merging fails.
 * 
 * @param target The (currently open) file to use as a base for the merge.
 * @param source The (newly opened) file to merge from.
 * @returns 
 */
export function merged(target: Slackt, source: Slackt): Slackt | undefined {
    let [targetIds, possibleSourceIds] = identify_people(target, source)
    // targetIds must be a bijection, identify in reverse as well
    let [_p, possibleTargetIds] = identify_people(source, target)

    // TODO: Maybe let the user handle unsure pairs somehow?
    if (possibleSourceIds.size > 0 || possibleTargetIds.size > 0) {
        // If there are uncertainties, display a table in the console, create an alert, and return.
        let reverse = possibleTargetIds.size > possibleSourceIds.size
        let [to, from] = reverse ? [source, target] : [target, source]
        let [toName, fromName] = reverse ? ["nya", "öppna"] : ["öppna", "nya"]
        let mapping = reverse ? possibleTargetIds : possibleSourceIds
        logPersonUncertaintyTable(mapping, to, from, toName, fromName)

        alert(
            `Kunde inte slå ihop: Minst en person i den ${toName} filen har flera personer i den `
            + `${fromName} filen som den passar ihop med. Se konsolen (Ctrl+Skift+i) för mer exakt beskrivning.`
        )
        return
    }

    let newFile = new Slackt(target.people, target.families)

    // Add people
    for (const sourcePerson of source.people) {
        if (targetIds.has(sourcePerson.id)) {
            // Existing person, update in-place
            newFile.getPerson(targetIds.get(sourcePerson.id)!).updateFrom(sourcePerson)
        } else {
            // New person, add it to the new slackt
            let newPerson = newFile.addEmptyPerson()
            newPerson.updateFrom(sourcePerson)
            // Register the new person
            targetIds.set(sourcePerson.id, newPerson.id)
        }
    }

    // At this point, targetIds maps every id in source onto an id in target (injectively)

    // Change all PersonIds in source.families to match with the new ids
    let newSourceFamilies = source.families.map((f) => f.copy())  // copy to not change source in-place
    for (const family of newSourceFamilies) {
        if (family.husband !== null)
            family.husband = targetIds.get(family.husband)!
        if (family.wife !== null)
            family.wife = targetIds.get(family.wife)!
        family.children = family.children.map((childId) => targetIds.get(childId)!)
    }

    let [targetFamilyIds, possibleSourceFamilyIds] = identify_families(target.families, newSourceFamilies)
    // targetFamilyIds must be a bijection, identify in reverse as well
    let [_f, possibleTargetFamilyIds] = identify_families(newSourceFamilies, target.families)

    // TODO: Maybe let the user handle unsure pairs somehow?
    if (possibleSourceFamilyIds.size > 0 || possibleTargetFamilyIds.size > 0) {
        let reverse = possibleTargetFamilyIds.size > possibleSourceFamilyIds.size
        let [to, from] = reverse ? [source, target] : [target, source]
        let [toName, fromName] = reverse ? ["nya", "öppna"] : ["öppna", "nya"]
        let mapping = reverse ? possibleTargetFamilyIds : possibleSourceFamilyIds
        logFamilyUncertaintyTable(mapping, to, from, toName, fromName)
        
        alert(
            `Kunde inte slå ihop: Minst en familj i den ${toName} filen har flera familjer i den `
            + `${fromName} filen som den passar ihop med. Se konsolen (Ctrl+Skift+i) för mer exakt beskrivning.`
        )
        return
    }

    // Add families
    for (const sourceFamily of newSourceFamilies) {
        if (targetFamilyIds.has(sourceFamily.id)) {
            // Existing family, update in-place
            newFile.getFamily(targetFamilyIds.get(sourceFamily.id)!).updateFrom(sourceFamily)
        } else {
            // New family, add it
            let newFamily = newFile.addEmptyFamily()
            newFamily.updateFrom(sourceFamily)
        }
    }

    return newFile
}


function logPersonUncertaintyTable(mapping: Map<PersonId, PersonId[]>, to: Slackt, from: Slackt, toName: String, fromName: String) {
    let column1label = `Person i den ${toName} filen`
    let column2label = `Möjliga personer i den ${fromName} filen`

    let tableData = []
    for (const [id, candidateIds] of mapping) {
        tableData.push({
            // Have to put it in [], otherwise it becomes {"column1label": ...}, thanks js
            [column1label]: `${to.getPerson(id).formatName("extra")}`,
            [column2label]: (
                candidateIds
                    .map((id) => `${from.getPerson(id).formatName("extra")}`)
                    .join(", ")
            )
        })
    }
    console.table(tableData)
}

function logFamilyUncertaintyTable(mapping: Map<FamilyId, FamilyId[]>, to: Slackt, from: Slackt, toName: String, fromName: String) {
    let column1label = `Familj i den ${toName} filen`
    let column2label = `Möjliga familjer i den ${fromName} filen`

    let tableData = []
    for (const [id, candidateIds] of mapping) {
        tableData.push({
            [column1label]: `${to.getFamily(id).formatFamily(to)}`,
            [column2label]: (
                candidateIds
                    .map((id) => `${from.getFamily(id).formatFamily(from)}`)
                    .join(", ")
            )
        })
    }
    console.table(tableData)
}