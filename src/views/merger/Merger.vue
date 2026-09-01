<script setup lang="ts">
import { computed, ComputedRef, ref, watch } from 'vue';
import { Tree, PersonId, Person, FamilyId, mapAppend, open, personIdFromString } from '../../typesnmethods.ts';
import PersonButton from "./PersonButton.vue";

const workingTree = defineModel<Tree>('workingTree', {
    required: true,
});
const selectedPersonId = defineModel<PersonId | null>('selectedPersonId');
const selectedFamilyId = defineModel<FamilyId | null>('selectedFamilyId');

const sourceTree = ref<Tree | null>(null);
const mergeFileInput = ref<HTMLInputElement | null>(null);
async function openMergeFile(e: Event) {
    sourceTree.value = await open(e);
}

// Update mergeMapping whenever either tree changes
const mergeMapping = ref<Map<PersonId, [boolean, PersonId[], number]>>(new Map())
watch([sourceTree, workingTree], ([newSource, newTarget]) => {
    if (newSource !== null) {
        mergeMapping.value = identifyCandidates(newSource as Tree, newTarget)
    }
})

const firstNameInfo = ref<string>("")
const lastNamesInfo = ref<string>("")
const dateBirthInfo = ref<string>("")
const dateDeathInfo = ref<string>("")
const siblingsInfo = ref<string>("")
const halfSiblingsInfo = ref<string>("")
const parentsInfo = ref<string>("")
const familyInfo = ref<string>("")


/** The people from the new file, sorted by name. */
const sortedSourcePeople: ComputedRef<Person[]> = computed(() => {
    if (sourceTree.value === null)
        return []
    return sourceTree.value.people.slice().sort((p1, p2) => p1.formatName("full").localeCompare(p2.formatName("full")))
})
// Source people with different number of candidates
const zeroCandidatesPeople = computed(() => {
    return sortedSourcePeople.value.filter((p) => mergeMapping.value.has(p.id) && mergeMapping.value.get(p.id)![1].length === 0)
})
const oneCandidatePeople = computed(() => {
    return sortedSourcePeople.value.filter((p) => mergeMapping.value.has(p.id) && mergeMapping.value.get(p.id)![1].length === 1)
})
const manyCandidatesPeople = computed(() => {
    return sortedSourcePeople.value.filter((p) => mergeMapping.value.has(p.id) && mergeMapping.value.get(p.id)![1].length > 1)
})

const sections: [ComputedRef<Person[]>, string][] = [
    [manyCandidatesPeople, "Personer med flera möjliga målpersoner"],
    [zeroCandidatesPeople, "Personer utan möjliga målpersoner"],
    [oneCandidatePeople, "Personer med endast en möjlig målperson"],
]



/** Make a map from first names to the people with that name */
function groupFirstNames(people: Person[]): Map<string, PersonId[]> {
    let ids: Map<string, PersonId[]> = new Map()
    for (const person of people) {
        mapAppend(ids, person.nameFirst, person.id)
    }
    return ids
}

/** For two people with the same first name, return whether they could be the same person. */
function possiblySamePerson(
    source: Tree,
    target: Tree,
    sourcePerson: Person,
    targetPerson: Person,
    checkImmediateFamily: boolean = true,
): boolean {
    // Check that these fields match (if they are not empty)
    if (
        targetPerson.dateBirth !== ""
        && sourcePerson.dateBirth !== ""
        && targetPerson.dateBirth !== sourcePerson.dateBirth
    )
        return false
    if (
        targetPerson.dateDeath !== ""
        && sourcePerson.dateDeath !== ""
        && targetPerson.dateDeath !== sourcePerson.dateDeath
    )
        return false
    // Because of name changes, we can only use the first surname the people had
    // Example: Anna Svensson could be the same as Anna Jönsson (f. Svensson).
    let sourceOriginalLastName = sourcePerson.nameLastMaiden === "" ? sourcePerson.nameLast : sourcePerson.nameLastMaiden
    let targetOriginalLastName = targetPerson.nameLastMaiden === "" ? targetPerson.nameLast : targetPerson.nameLastMaiden
    if (
        targetOriginalLastName !== ""
        && sourceOriginalLastName !== ""
        && targetOriginalLastName !== sourceOriginalLastName
    )
        return false

    if (!checkImmediateFamily)
        // Don't check any more recursively
        return true

    let sourceParents = source.getParentsFromChild(sourcePerson.id)
    let targetParents = target.getParentsFromChild(targetPerson.id)
    // Father, then mother
    for (let i of [0, 1]) {
        // If any of the parents don't match, return false (and don't recurse more than once)
        if (
            targetParents[i] !== undefined
            && sourceParents[i] !== undefined
            && !possiblySamePerson(source, target, sourceParents[i], targetParents[i], checkImmediateFamily=false)
        )
            return false
    }

    let sourceSpouses = source.getSpousesFromParent(sourcePerson.id)
    let targetSpouses = target.getSpousesFromParent(targetPerson.id)
    if (
        targetSpouses.length === 1
        && sourceSpouses.length === 1
        && !possiblySamePerson(source, target, sourceSpouses[0], targetSpouses[0], checkImmediateFamily=false)
    )
        return false

    // No checks failed, these two could be the same
    return true
}

function exactlySamePerson(sourcePerson: Person, targetPerson: Person): boolean {
    return (
        sourcePerson.nameFirst === targetPerson.nameFirst
        && sourcePerson.nameLast === targetPerson.nameLast
        && sourcePerson.nameLastMaiden === targetPerson.nameLastMaiden
        && sourcePerson.dateBirth === targetPerson.dateBirth
        && sourcePerson.dateDeath === targetPerson.dateDeath
    )
}

/** Get a map from a source person's id to the ids of target people that could be the same person. */
function identifyCandidates(source: Tree, target: Tree): Map<PersonId, [boolean, PersonId[], number]> {
    let nameToTargetPeople = groupFirstNames(target.people)
    let candidateMap: Map<PersonId, [boolean, PersonId[], number]> = new Map()

    for (const sourcePerson of source.people) {
        let candidates = (
            nameToTargetPeople.get(sourcePerson.nameFirst) ?? []
        )
            .filter((id) => possiblySamePerson(source, target, target.getPerson(id), sourcePerson))
            .map((id) => target.getPerson(id))

        // Index of the candidate to preselect, if any.
        let preSelectedIndex: number = -1
        // If there is a perfect candidate, map only to that one.
        let perfectCandidateIndex = candidates.findIndex((candidate) => exactlySamePerson(sourcePerson, candidate))
        if (perfectCandidateIndex !== -1) {
            // Put the perfect candidate first
            let [perfectCandidate] = candidates.splice(perfectCandidateIndex);
            candidates = [perfectCandidate].concat(candidates)
            preSelectedIndex = 0
        } else if (candidates.length === 1) {
            preSelectedIndex = 0
        } else {
            // Sort by how specific the candidates are (descending)
            candidates.sort((p1, p2) => p2.numFilledFields() - p1.numFilledFields())
        }

        candidateMap.set(sourcePerson.id, [true, candidates.map(p => p.id), preSelectedIndex])
    }
    return candidateMap
}

function toggleSelected(cell: {sourceId: PersonId, id: PersonId, side: 'source' | 'target'}) {
    let [selected, targetIds, selectedTarget] = mergeMapping.value.get(cell.sourceId)!

    if (cell.side === "source") {
        selected = !selected
    } else if (cell.side === "target") {
        if (targetIds[selectedTarget] === cell.id) {
            selectedTarget = -1
        } else {
            selectedTarget = targetIds.findIndex(id => id === cell.id)
        }
    }

    mergeMapping.value.set(cell.sourceId, [selected, targetIds, selectedTarget])
}

function updateInfo(cell: {sourceId: PersonId, id: PersonId, side: 'source' | 'target'}) {
    const tree = (cell.side === 'source' ? sourceTree : workingTree).value as Tree | null
    if (tree === null)
        return

    const person = tree.getPerson(cell.id)
    const [siblings, halfSiblings] = tree.getSiblings(cell.id);

    firstNameInfo.value = person.nameFirst
    lastNamesInfo.value = (person.nameLast || "?") + (person.nameLastMaiden === "" ? "" : ` (f. ${person.nameLastMaiden})`)
    dateBirthInfo.value = person.dateBirth
    dateDeathInfo.value = person.dateDeath
    siblingsInfo.value = siblings.map(p => p.formatName("short")).join(", ")
    halfSiblingsInfo.value = halfSiblings.map(p => p.formatName("short")).join(", ")
    familyInfo.value = tree.getFamiliesFromParent(cell.id).map(f => f.formatFamily(tree)).join("; ")
}

</script>

<template>
    <div id="root">
        <button class="textButton" @click="mergeFileInput?.click()">Importera</button>
        <input
            @change="openMergeFile"
            ref="mergeFileInput"
            type="file"
            accept=".json"
            hidden
        />
        <div id="tableContainer">
            <table id="mergerTable">
                <thead>
                    <tr>
                        <th>Ny person</th>
                        <th>Målperson i den öppna filen</th>
                    </tr>
                </thead>
                <tbody id="mergerTableBody">
                    <template v-for="[array, dividerTitle] in sections">
                        <tr>
                            <td colspan="2" class="divider">{{ dividerTitle }} ({{ array.value.length }})</td>
                        </tr>
                        <tr v-for="sourcePerson in array.value">
                            <td>
                                <PersonButton
                                    :name="sourcePerson.formatName('full')"
                                    :cell="{ sourceId: sourcePerson.id, id: sourcePerson.id, side: 'source' }"
                                    :class="{ selected: mergeMapping.get(sourcePerson.id)?.[0] }"
                                    @toggle-select="toggleSelected"
                                    @show-info="updateInfo"
                                />
                            </td>
                            <td>
                                <PersonButton
                                    v-for="(targetId, i) in mergeMapping.get(sourcePerson.id)?.[1]"
                                    :name="workingTree.getPerson(targetId).formatName('full')"
                                    :cell="{ sourceId: sourcePerson.id, id: targetId, side: 'target'}"
                                    :class="{ selected: mergeMapping.get(sourcePerson.id)?.[2] === i }"
                                    @toggle-select="toggleSelected"
                                    @show-info="updateInfo"
                                />
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
        <div id="candidateInfoBox" popover="auto">
            <ul>
                <li>
                    <p>Förnamn: {{ firstNameInfo }}</p>
                </li>
                <li>
                    <p>Efternamn: {{ lastNamesInfo }}</p>
                </li>
                <li :hidden="dateBirthInfo === '' && dateDeathInfo === ''">
                    <p>Född: {{ dateBirthInfo }}<span :hidden="dateDeathInfo === ''"> Död: {{ dateDeathInfo }}</span></p>
                </li>
                <li :hidden="siblingsInfo === ''">
                    <p>Syskon: {{ siblingsInfo }}</p>
                </li>
                <li :hidden="halfSiblingsInfo === ''">
                    <p>Halvsyskon: {{ halfSiblingsInfo }}</p>
                </li>
                <li :hidden="parentsInfo === ''">
                    <p>Föräldrar: {{ parentsInfo }}</p>
                </li>
                <li :hidden="familyInfo === ''">
                    <p>Egen familj: {{ familyInfo }}</p>
                </li>
            </ul>
        </div>
    </div>
</template>

<style lang="css" scoped>
#root {
    padding: 1rem;
}

#tableContainer {
    display: flex;
    flex-flow: column;
    flex: 1 1 auto;
    overflow-y: auto;
    margin: 1em 0;
    padding: 0 1em;
}

table#mergerTable {
    border-spacing: 0;
    border: 2px solid rgb(140 140 140);
    overflow: auto;
}

tbody {
    white-space: nowrap;
}

tbody > tr:nth-of-type(even) {
    background-color: rgb(237 238 242);
}

thead > tr {
    background-color: rgb(228, 245, 230);
    border-bottom: 1px solid rgb(140 140 140);
    position: sticky;
    top: 0;
}

th, td {
    border: 1px solid rgb(160 160 160);
    padding: 4px 6px;
}

th {
    vertical-align: bottom;
    position: sticky;
    top: 0;
    width: 50%;
}

td:nth-of-type(1) {
    text-align: right;
}

td.divider {
    text-align: center;
    padding: 4px 2px;
    background-color: #aaa;
    font-weight: bolder;
}

#candidateInfoBox {
    position-area: right;
    inset: auto;
}
</style>