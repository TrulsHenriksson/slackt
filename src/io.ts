import {
    Slackt,
    Person,
    Family,
    PersonId,
    FamilyId,
    FindDirectRelatives,
} from './typesnmethods.js';



/** Throw an error if any element in the list does not exist. */
export function assertElementsExist(elements: (Element | null)[]) {
    elements.forEach((element, i) => {
        if (!element) { throw new Error(`Element ${i} does not exist.`) }
    });
}


/** Store a Slackt file in the user's localStorage. */
export function storeFileInLocalStorage(file: Slackt) {
    localStorage.setItem('openedFile', file.stringify());
}

/** Retrieve a Slackt file from the user's localStorage, or an empty file if that fails. */
export function retrieveFileFromLocalStorage(): Slackt {
    const fromLS = localStorage.getItem('openedFile')
    if (fromLS === null) {
        console.log("No Slackt file in localStorage, starting from blank")
        return new Slackt()
    }

    try {
        return Slackt.fromString(fromLS)
    } catch (err) {
        if (err instanceof Error) {
            if (err.message !== "")
                console.error(err.message)
        }
        console.log("Failed to parse the local Slackt file, starting from blank")
        return new Slackt()
    }
}


/** Store a number in localStorage. */
function storeNumberInLocalStorage(value: number | null, key: string) {
    localStorage.setItem(key, value === null ? "" : value.toString())
}

export function storeSelectedPersonInLocalStorage(value: PersonId | null) {
    storeNumberInLocalStorage(value, "selectedPerson")
}

export function storeSelectedFamilyInLocalStorage(value: FamilyId | null) {
    storeNumberInLocalStorage(value, "selectedFamily")
}


/** Retrieve a number from localStorage, or defaultValue if it fails. */
function retrieveNumberFromLocalStorage(key: string, defaultValue: number | null = null): number | null {
    const fromLS = localStorage.getItem(key)
    if (fromLS === null)
        return defaultValue

    const value = parseInt(fromLS);
    return isNaN(value) ? defaultValue : value
}

/** Get the id of the last selected person from localStorage, or null. */
export function retrieveLastSelectedPerson(file: Slackt): PersonId | null {
    if (file.people.length === 0)
        return null
    const maxPersonId = file.people[file.people.length - 1].id
    const num = retrieveNumberFromLocalStorage("selectedPerson");
    return num === null ? num : Math.min(num, maxPersonId) as PersonId
}

/** Get the id of the last selected family from localStorage, or null. */
export function retrieveLastSelectedFamily(file: Slackt): FamilyId | null {
    if (file.families.length === 0)
        return null
    const maxFamilyId = file.families[file.families.length - 1].id
    const num = retrieveNumberFromLocalStorage("selectedFamily");
    return num === null ? num : Math.min(num, maxFamilyId) as FamilyId
}


/** Download a file as a local file, with the current timestamp in the file name. */
export function download(file: Slackt) {
    const blob = new Blob([file.stringify()], {
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


/** Open and return a new file. If it fails, return undefined. */
export async function open(e: Event, openedFile: Slackt): Promise<Slackt | undefined> {
    if (!(e.target instanceof HTMLInputElement)) 
        return undefined

    const file = e.target.files?.item(0);
    const text = await file?.text();
    if (!file || !text) {
        console.error('äawh');
        return undefined;
    }
    try {
        openedFile = Slackt.fromString(text);
    } catch (error) {
        console.error('Fel på filen', error);
    }

    if (openedFile) {
        return openedFile;
    }
}


let timeStampLastClickedClear = 0

/** Return a blank file. If the clear button was pressed more than 2 seconds ago, show an alert first. */
export function tryClear(): Slackt | undefined {
    // Click twice within 2 seconds to clear
    if (Date.now() - timeStampLastClickedClear < 2000) {
        let newFile = new Slackt();
        return newFile;
    } else {
        alert(
            'Vill du verkligen ta bort alla personer och familjer? Klicka igen inom 2 sekunder i så fall.',
        );
    }
    timeStampLastClickedClear = Date.now();
}
