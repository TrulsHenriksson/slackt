import {
    open,
    assertElementsExist,
    retrieveFileFromLocalStorage,
    storeFileInLocalStorage,
    download,
    tryClear
} from './io.js';
import {
    Slackt,
    Person,
    Family,
    PersonId,
    FamilyId,
    map_append,
} from './typesnmethods.js';


const openButton = document.getElementById('open')!
const saveButton = document.getElementById('save')!
const clearButton = document.getElementById('clear')!
const mergeFromButton = document.getElementById('importFrom')!;
const mergeTable = document.getElementById('mergerTable')! as HTMLTableElement
const mergeTableBody = document.getElementById('mergerTableBody')! as HTMLTableSectionElement
// Make sure all of them exist
assertElementsExist([
    openButton,
    saveButton,
    clearButton,
    mergeFromButton,
    mergeTable,
    mergeTableBody,
])


openButton.addEventListener('change', async (e) => {
    const newFile = await open(e);
    if (newFile === undefined)
        return

    openedFile = newFile
    storeFileInLocalStorage(openedFile)

    updateMergeMapping()
    refresh()
});
saveButton.onclick = () => {
    download(openedFile);
}
clearButton.onclick = () => {
    const newFile = tryClear();
    if (newFile === undefined)
        return

    openedFile = newFile
    storeFileInLocalStorage(openedFile)

    mergeSourceFile = null

    updateMergeMapping()
    refresh()
};
mergeFromButton.addEventListener("change", async (e) => {
    const newFile = await open(e)
    if (newFile === undefined)
        return

    mergeSourceFile = newFile

    updateMergeMapping()
    refresh()
})



function updateMergeMapping() {
    if (mergeSourceFile === null) {
        // Map each source person to no target people
        mergeMapping = new Map()
    } else {
        mergeMapping = identifyCandidates(openedFile, mergeSourceFile)
    }
}

/** Use the mergeMapping to display each person with candidates in the table. */
function refresh() {
    mergeTableBody.innerHTML = ""

    if (mergeSourceFile === null) {
        const missingMessage = mergeTableBody.insertRow().insertCell()
        missingMessage.classList.add("divider")
        missingMessage.colSpan = 2
        missingMessage.innerText = "Inga personer att importera. Tryck på \"Importera från\" för att börja."
        return
    }

    let sortedPeople = mergeSourceFile.people
        .slice()
        .sort(
            (p1, p2) => p1.formatName("full").localeCompare(p2.formatName("full"))
        )
    let zeroCandidates = sortedPeople.filter((p) => mergeMapping.get(p.id)![0].length === 0)
    let oneCandidate = sortedPeople.filter((p) => mergeMapping.get(p.id)![0].length === 1)
    let manyCandidates = sortedPeople.filter((p) => mergeMapping.get(p.id)![0].length > 1)

    const sections: [Person[], string][] = [
        [manyCandidates, `Personer med flera möjliga målpersoner (${manyCandidates.length})`],
        [zeroCandidates, `Personer utan möjliga målpersoner (${zeroCandidates.length})`],
        [oneCandidate, `Personer med bara en möjlig målperson (${oneCandidate.length})`]
    ]
    for (const [sourcePersonList, caption] of sections) {
        const sectionDivider = mergeTableBody.insertRow().insertCell()
        sectionDivider.classList.add("divider")
        sectionDivider.colSpan = 2
        sectionDivider.innerText = caption

        for (const sourcePerson of sourcePersonList) {
            const newRow = mergeTableBody.insertRow()

            const sourceCell = newRow.insertCell()
            sourceCell.appendChild(
                getPersonSelectElement(
                    sourcePerson, 
                    true, 
                    (e) => updateCandidateInfo(e, mergeSourceFile!)
                )
            )
            // sourceCell.innerText = sourcePerson.formatName("full")

            const targetCell = newRow.insertCell()
            const [candidateIds, preSelectedIndex] = mergeMapping.get(sourcePerson.id)!;
            for (let i = 0; i < candidateIds.length; i++) {
                const candidate = openedFile.getPerson(candidateIds[i])

                targetCell.appendChild(
                    getPersonSelectElement(
                        candidate,
                        i === preSelectedIndex, 
                        (e) => updateCandidateInfo(e, openedFile)
                    )
                )
            }
        }
    }
}

function getPersonSelectElement(candidate: Person, preselected: boolean, infoOnClick: (e: PointerEvent) => void) {
    const candidateContainer = document.createElement("div")
    candidateContainer.classList.add("candidateContainer")
    candidateContainer.setAttribute("data-personId", candidate.id.toFixed())
    if (preselected)
        candidateContainer.classList.add("selected")

    const candidateButton = document.createElement("button")
    candidateButton.innerText = candidate.formatName("extra")
    candidateButton.onclick = toggleSelected
    candidateButton.classList.add("candidateButton")

    const candidateInfoButton = document.createElement("button")
    candidateInfoButton.innerText = "ⓘ"
    candidateInfoButton.onclick = infoOnClick
    candidateInfoButton.setAttribute("popovertarget", "candidateInfoBox")
    candidateInfoButton.classList.add("infoButton")

    candidateContainer.appendChild(candidateButton)
    candidateContainer.appendChild(candidateInfoButton)
    return candidateContainer
}

function toggleSelected(e: PointerEvent) {
    if (!(e.target instanceof HTMLButtonElement))
        return

    const candidateContainer = e.target.parentElement! as HTMLDivElement
    const sourceCell = candidateContainer.parentElement as HTMLTableCellElement
    const wasSelected = candidateContainer.classList.contains("selected")
    for (const child of sourceCell.children) {
        (child as HTMLDivElement).classList.remove("selected")
    }
    if (!wasSelected)
        candidateContainer.classList.add("selected")
}

function updateCandidateInfo(e: PointerEvent, file: Slackt) {
    if (!(e.target instanceof HTMLButtonElement))
        return

    const candidateContainer = e.target.parentElement! as HTMLDivElement
    const personId = Number(candidateContainer.getAttribute("data-personId")) as PersonId
    const person = file.getPerson(personId)
    const parents = file.getParentsFromChild(personId)
    const families = file.getFamiliesFromParent(personId)
    // Update the <p> elements in the popover div (#candidateInfoBox)
    document.getElementById("firstNameInfo")!.innerText = (
        `Förnamn: ${person.nameFirst}`
    )
    document.getElementById("lastNamesInfo")!.innerText = (
        `Efternamn: ${person.nameLast}` + (person.nameLastMaiden !== "" ? ` (f. ${person.nameLastMaiden})` : "")
    )
    const dateInfo = document.getElementById("dateInfo")!;
    dateInfo.parentElement!.setAttribute("display", person.dateBirth !== "" || person.dateDeath !== "" ? "inline" : "none")
    dateInfo.innerText = (
        "Född: " + (person.dateBirth === "" ? "?" : ` ${person.dateBirth}`) 
        + (person.dateDeath === "" ? "" : ` Död: ${person.dateDeath}`)
    )
    document.getElementById("parentsInfo")!.innerText = (
        "Föräldrar: " + parents.map(p => p === undefined ? "?" : p.formatName("full")).join(", ")
    )
    document.getElementById("familyInfo")!.innerText = (
        "Egen familj: " + families.map(f => f.formatFamily(file, "short")).join("; ")
    )
}


/** Make a map from first names to the people with that name */
function groupFirstNames(people: Person[]): Map<string, PersonId[]> {
    let ids: Map<string, PersonId[]> = new Map()
    for (const person of people) {
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
    check_immediate_family: boolean = true,
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
    )
        return false

    if (!check_immediate_family)
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
            && !possibly_same_person(target, source, target_parents[i], source_parents[i], check_immediate_family=false)
        )
            return false
    }

    let target_spouses = target.getSpousesFromParent(target_person.id)
    let source_spouses = source.getSpousesFromParent(source_person.id)
    if (
        target_spouses.length === 1
        && source_spouses.length === 1
        && !possibly_same_person(target, source, target_spouses[0], source_spouses[0], check_immediate_family=false)
    )
        return false

    // No checks failed, these two could be the same
    return true
}

function exactly_same_person(targetPerson: Person, sourcePerson: Person): boolean {
    return (
        targetPerson.id === sourcePerson.id
        && targetPerson.nameFirst === sourcePerson.nameFirst
        && targetPerson.nameLast === sourcePerson.nameLast
        && targetPerson.nameLastMaiden === sourcePerson.nameLastMaiden
        && targetPerson.dateBirth === sourcePerson.dateBirth
        && targetPerson.dateDeath === sourcePerson.dateDeath
    )
}


/** Get a map from a source person's id to the ids of target people that could be the same person. */
function identifyCandidates(target: Slackt, source: Slackt): Map<PersonId, [PersonId[], number | null]> {
    let nameToTargetPeople = groupFirstNames(target.people)
    let candidateMap: Map<PersonId, [PersonId[], number | null]> = new Map()
    for (const sourcePerson of source.people) {
        let candidates = (
            nameToTargetPeople.get(sourcePerson.nameFirst) ?? []
        )
            .filter((id) => possibly_same_person(target, source, target.getPerson(id), sourcePerson))
            .map((id) => target.getPerson(id))

        // Index of the candidate to preselect, if any.
        let preSelectedIndex: number | null = null
        // If there is a perfect candidate, map only to that one.
        let perfectCandidateIndex = candidates.findIndex((candidate) => exactly_same_person(sourcePerson, candidate))
        if (perfectCandidateIndex !== -1) {
            // Put the perfect candidate first
            let [perfectCandidate] = candidates.splice(perfectCandidateIndex);
            candidates = [perfectCandidate].concat(candidates)
            preSelectedIndex = 0
        } else if (candidates.length === 1) {
            preSelectedIndex = 0
        } else {
            // Sort by how specific the candidates are (descending)
            candidates.sort((p1, p2) => p2.specificity() - p1.specificity())
        }

        candidateMap.set(sourcePerson.id, [candidates.map(p => p.id), preSelectedIndex])
    }
    return candidateMap
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
    let sourceToTarget: Map<PersonId, PersonId> = new Map()
    let ignoredTargets: Set<PersonId> = new Set()
    /** Map from a target person's id to the ids of the candidate source people */
    let targetToCandidateSources: Map<PersonId, PersonId[]> = new Map()

    // First check people that are the exact same (even in position)
    let length = Math.min(target.people.length, source.people.length)
    for (let i = 0; i < length; i++) {
        let targetPerson = target.people[i], sourcePerson = source.people[i]
        if (exactly_same_person(targetPerson, sourcePerson)) {
            sourceToTarget.set(sourcePerson.id, targetPerson.id)
            ignoredTargets.add(targetPerson.id)
        }
    }

    let stillAvailableTargets = target.people.filter((p) => !ignoredTargets.has(p.id))
    let stillAvailableSources = source.people.filter((p) => !sourceToTarget.has(p.id))

    let firstNameIds = groupFirstNames(stillAvailableSources)
    for (let targetPerson of stillAvailableTargets) {
        let candidates = (
            firstNameIds.get(targetPerson.nameFirst)
                ?.map((id) => source.getPerson(id))
            ?? []
        ).filter((candidate) => possibly_same_person(target, source, targetPerson, candidate))

        if (candidates.length === 0) {
            continue
        } else if (candidates.length === 1) {
            // Map the only possible source person to the target
            sourceToTarget.set(candidates[0].id, targetPerson.id)
        } else if (candidates.length > 1) {
            // Signify that any of these sources may map to the target
            targetToCandidateSources.set(targetPerson.id, candidates.map((p) => p.id))
        }
    }

    return [sourceToTarget, targetToCandidateSources]
}



function groupFamilies(families: Family[]): [Map<PersonId, FamilyId>, Map<PersonId, FamilyId[]>, Map<PersonId, FamilyId[]>] {
    let childMap: Map<PersonId, FamilyId> = new Map()
    let husbandMap: Map<PersonId, FamilyId[]> = new Map()
    let wifeMap: Map<PersonId, FamilyId[]> = new Map()
    for (const family of families) {
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
    /** Map from source families to the single compatible target family. */
    let sourceToTarget: Map<FamilyId, FamilyId> = new Map()
    /** Map from target families to compatible source families (when multiple exist). */
    let targetToCandidateSources: Map<FamilyId, FamilyId[]> = new Map()

    // Create maps from each type of person in a family to the famil(y/ies) they are in
    let [childToFamily, husbandToFamilies, wifeToFamilies] = groupFamilies(sourceFamilies)
    for (const targetFamily of targetFamilies) {
        // Get all source families that the target children, husband, and wife are in
        let candidateIds: FamilyId[] = (
            targetFamily.children
                .map((childId) => childToFamily.get(childId))
                .filter((x) => x !== undefined)
        )
        if (targetFamily.husband !== null)
            candidateIds = candidateIds.concat(husbandToFamilies.get(targetFamily.husband) ?? [])
        if (targetFamily.wife !== null)
            candidateIds = candidateIds.concat(wifeToFamilies.get(targetFamily.wife) ?? [])

        // Deduplicate and filter
        let candidateFamilies = (
            [...new Set(candidateIds)]
                .map((id) => sourceFamilies.find((f) => f.id === id)!)
                .filter((candidate) => possibly_same_family(targetFamily, candidate))
        )

        if (candidateFamilies.length === 0) {
            continue
        } else if (candidateFamilies.length === 1) {
            sourceToTarget.set(candidateFamilies[0].id, targetFamily.id)
        } else {
            targetToCandidateSources.set(targetFamily.id, candidateFamilies.map((f) => f.id))
        }
    }

    return [sourceToTarget, targetToCandidateSources]
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
    // ===== Start merging people =====

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

        alert(
            `Kunde inte importera: Minst en person i den ${toName} filen har flera personer i den `
            + `${fromName} filen som den passar ihop med. Se konsolen (Ctrl+Skift+i) för mer exakt beskrivning.`
        )
        logPersonUncertaintyTable(mapping, to, from, toName, fromName)
        return
    }

    let newFile = target.copy()

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

    // ===== Start merging families =====

    let [targetFamilyIds, possibleSourceFamilyIds] = identify_families(target.families, newSourceFamilies)
    // targetFamilyIds must be a bijection, identify in reverse as well
    let [_f, possibleTargetFamilyIds] = identify_families(newSourceFamilies, target.families)

    // TODO: Maybe let the user handle unsure pairs somehow?
    if (possibleSourceFamilyIds.size > 0 || possibleTargetFamilyIds.size > 0) {
        let reverse = possibleTargetFamilyIds.size > possibleSourceFamilyIds.size
        let [to, from] = reverse ? [source, target] : [target, source]
        let [toName, fromName] = reverse ? ["nya", "öppna"] : ["öppna", "nya"]
        let mapping = reverse ? possibleTargetFamilyIds : possibleSourceFamilyIds

        alert(
            `Kunde inte importera: Minst en familj i den ${toName} filen har flera familjer i den `
            + `${fromName} filen som den passar ihop med. Se konsolen (Ctrl+Skift+i) för mer exakt beskrivning.`
        )
        logFamilyUncertaintyTable(mapping, to, from, toName, fromName)
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


let openedFile = retrieveFileFromLocalStorage()
let mergeSourceFile: Slackt | null = null
/** Mapping from a source person (in mergeSourceFile) to a list of similar target people (in openedFile). */
let mergeMapping: Map<PersonId, [PersonId[], number | null]>
updateMergeMapping()

refresh()