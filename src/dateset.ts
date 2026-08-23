const digitPattern = /(\d|\?|\[\d+\])/

const yearPattern = new RegExp(`^${digitPattern.source}{4}(\/${digitPattern.source}{4})*$`)
const monthDayPattern = new RegExp(`^${digitPattern.source}{2}(\/${digitPattern.source}{2})*$`)



class HelpfulError extends Error {
    helpMessage: string

    constructor(message?: string, helpMessage: string = "") {
        super(message)
        this.helpMessage = helpMessage
    }
}

export class DateParseError extends HelpfulError {}


/** A set of integers equal to the product of its digit sets.
 *
 *  Represented by strings such as "19?[45]".
 *
 *  Example: IntSet.fromString("20[01]?") is the set $\{x: x_0=2, x_1=0, x_2\in\{0,1\}, x_3\in\{0..9\}\}$.
 */
export class IntSet {
    readonly digits: Set<number>[]
    readonly length: number

    constructor(digits: Set<number>[]) {
        this.digits = digits
        this.length = digits.length
    }

    /** Convert a string of digits, like "19[78]?", to sets, like [Set("1"), Set("9"), Set("78"), Set("0123456789")]. */
    static fromString(digits: string): IntSet {
        return new IntSet(
            (digits.match(/(\d|\?|\[\d+\])/g) ?? []).map((d) => IntSet.digitToSet(d))
        )
    }

    toString(): string {
        return this.digits.map(
            (ints) =>
                ints.size === 10
                    ? "?"
                    : ints.size === 1
                        ? "" + ints.values().next().value!
                        : "[" + ints.values().toArray().join("") + "]"
        ).join("")
    }

    /** Convert a digit string (either single digit, "?", or several digits e.g. "[345]") to a set of characters. */
    static digitToSet(digit: string): Set<number> {
        return new Set(
            digit === "?"
                ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
                : digit.length === 1
                    ? [Number(digit)]
                    : digit.slice(1, digit.length - 1).split("").map((s) => Number(s))
        )
    }

    concat(other: IntSet) {
        return new IntSet(this.digits.concat(other.digits))
    }

    static repeat(ints: Set<number>, times: number): IntSet {
        return new IntSet(Array(times).fill(ints))
    }

    intersection(other: IntSet): IntSet | null {
        if (this.length !== other.length) {
            throw new Error("Cannot compare IntSets with different numbers of digits")
        }

        let newDigits = this.digits.map((digit, i) => digit.intersection(other.digits[i]))
        // If any intersection is empty, return null
        if (newDigits.find((digit) => digit.size === 0) !== undefined)
            return null
        return new IntSet(newDigits)
    }

    overlapsRange(start: number[], stop: number[]): boolean {
        if (this.length !== start.length || start.length !== stop.length) {
            throw new Error("The number of digits in the bounds must be the same as in the IntSet")
        }

        // WRONG

        // Check if all digit sets have a member in range
        for (let i = 0; i < this.length; i++) {
            const digitSet = this.digits[i]
            const min = start[i], max = stop[i]
            if ([...digitSet].find((n) => n >= min && n <= max) === undefined) {
                return false
            }
        }
        return true
    }
}


/** The union of several IntSets.
 *
 *  Represented by strings such as "05/1?/2[12]".
 */
export class IntSetUnion {
    readonly intSets: IntSet[]

    constructor(intSets: IntSet[]) {
        this.intSets = intSets
    }

    static fromString(values: string) {
        const parts = values.split("/").map((n) => IntSet.fromString(n))
        if (parts.length > 0 && parts.find((intSet) => intSet.length !== parts[0].length) !== undefined)
            throw new DateParseError("All parts must have the same length", "Alla delar avskilda av / måste ha lika många siffror.")
        return new IntSetUnion(parts)
    }

    toString(): string {
        return [...this.intSets].map((intSet) => intSet.toString()).join("/")
    }

    intersection(other: IntSetUnion): IntSetUnion | null {
        // The intersection of two unions is the union of all intersections
        // Example: 200[23]/200[45] & 20[01]2/20[01]4 --> 2002/2004
        let newIntSets: IntSet[] = []
        for (const y1 of this.intSets) {
            for (const y2 of other.intSets) {
                const intersection = y1.intersection(y2)
                if (intersection !== null)
                    newIntSets.push(intersection)
            }
        }
        if (newIntSets.length === 0)
            return null
        return new IntSetUnion(newIntSets)
    }

    overlapsRange(start: number[], stop: number[]): boolean {
        // If any intSet in the union overlaps the range, return true
        for (const intSet of this.intSets) {
            if (intSet.overlapsRange(start, stop))
                return true
        }
        return false
    }
}


/** A set of dates, where each field (year/month/day) is an IntSetUnion.
 *
 *  Represented by strings such as "1989/1990-0[45]-??".
 */
export class DateSet {
    readonly years: IntSetUnion
    readonly months: IntSetUnion
    readonly days: IntSetUnion

    constructor(years: IntSetUnion, months: IntSetUnion, days: IntSetUnion) {
        this.years = years
        this.months = months
        this.days = days
    }

    static fromString(spec: string): DateSet {
        const parts = spec.split("-")
        if (parts.length > 3) {
            throw new DateParseError(
                `At most two "-" may occur, found ${parts.length - 1}`, 
                `Max två "-" får finnas, hittade ${parts.length - 1}.`
            )
        }

        let [years, months, days] = parts
        // Give default values
        years = years ?? "????"
        months = months ?? "??"
        days = days ?? "??"

        if (years.match(yearPattern) === null)
            throw new DateParseError(`Invalid year: ${years}`, `Ogiltigt årtal: ${years}.`)
        if (months.match(monthDayPattern) === null)
            throw new DateParseError(`Invalid month: ${months}`, `Ogiltig månad: ${months}.`)
        if (days.match(monthDayPattern) === null)
            throw new DateParseError(`Invalid day: ${days}`, `Ogiltigt datum: ${days}.`)

        return new DateSet(
            IntSetUnion.fromString(years),
            IntSetUnion.fromString(months),
            IntSetUnion.fromString(days)
        )
    }

    toString(): string {
        return this.years.toString() + "-" + this.months.toString() + "-" + this.days.toString()
    }

    intersection(other: DateSet): DateSet | null {
        const newYears = this.years.intersection(other.years)
        if (newYears === null)
            return null
        const newMonths = this.months.intersection(other.months)
        if (newMonths === null)
            return null
        const newDays = this.days.intersection(other.days)
        if (newDays === null)
            return null
        return new DateSet(newYears, newMonths, newDays)
    }
}


/** A single date between 0001-01-01 and 9999-12-31. 
 * 
 *  Represented by YYYY[-MM[-DD]] strings.
*/
export class DatePoint {
    readonly year: number
    readonly month: number
    readonly day: number

    constructor(year: number, month: number, day: number) {
        if (year < 1 || year > 9999 || year % 1 !== 0)
            throw new DateParseError(
                `The year must be an integer in [1, 9999], got ${year}`,
                `Årtalet måste vara ett heltal mellan 1 och 9999, inte ${year}.`
            )
        if (month < 1 || month > 12 || month % 1 !== 0)
            throw new DateParseError(
                `The month must be an integer in [1, 12], got ${month}`,
                `Månaden måste vara ett heltal mellan 1 och 12, inte ${month}.`
            )
        if (day < 1 || day > 31 || day % 1 !== 0)
            throw new DateParseError(
                `The day must be an integer in [1, 31], got ${day}`,
                `Dagen måste vara ett heltal mellan 1 och 31, inte ${day}.`
            )
        this.year = year
        this.month = month
        this.day = day
    }

    copy(): DatePoint {
        return new DatePoint(this.year, this.month, this.day)
    }

    static fromString(
        spec: string,
        yearDefault: string,
        monthDefault: string,
        dayDefault: string
    ): DatePoint {
        const parts = spec.split("-")
        if (parts.length > 3) {
            throw new DateParseError(
                `At most two "-" may occur, found ${parts.length - 1}`, 
                `Max två "-" får finnas, hittade ${parts.length - 1}.`
            )
        }

        let [year, month, day] = parts
        // Give default values
        year = year ?? yearDefault
        month = month ?? monthDefault
        day = day ?? dayDefault

        if (year.match(/^\d{4}$/) === null)
            throw new DateParseError(`Invalid year: ${year}`, `Ogiltigt årtal: ${year}.`)
        if (month.match(/^\d{2}$/) === null)
            throw new DateParseError(`Invalid month: ${month}`, `Ogiltig månad: ${month}.`)
        if (day.match(/^\d{2}$/) === null)
            throw new DateParseError(`Invalid day: ${day}`, `Ogiltigt datum: ${day}.`)

        return new DatePoint(Number(year), Number(month), Number(day))
    }

    toString(cutYear?: string, cutMonth?: string, cutDay?: string): string {
        let yearString = this.year.toFixed().padStart(4, "0")
        let monthString = "-" + this.month.toFixed().padStart(2, "0")
        let dayString = "-" + this.day.toFixed().padStart(2, "0")
        if (cutDay !== undefined && dayString.endsWith(cutDay)) {
            dayString = ""
            if (cutMonth !== undefined && monthString.endsWith(cutMonth)) {
                monthString = ""
                if (cutYear !== undefined && yearString.endsWith(cutYear)) {
                    yearString = ""
                }
            }
        }
        return yearString + monthString + dayString
    }

    isBefore(other: DatePoint): boolean {
        if (this.year !== other.year)
            return this.year < other.year
        if (this.month !== other.month)
            return this.month < other.month
        return this.day < other.day
    }

    equals(other: DatePoint): boolean {
        return this.year === other.year && this.month === other.month && this.day === other.day
    }

    min(other: DatePoint): DatePoint {
        if (this.isBefore(other))
            return this.copy()
        return other.copy()
    }

    max(other: DatePoint): DatePoint {
        if (this.isBefore(other))
            return other.copy()
        return this.copy()
    }
}


/** A range of dates between given endpoints. 
 * 
 *  Represented by strings such as "2005-06-22..2022-09".
*/
export class DateRange {
    readonly start: DatePoint
    readonly stop: DatePoint

    constructor(start: DatePoint, stop: DatePoint) {
        if (stop.isBefore(start))
            throw new DateParseError("Start must be before or equal to stop.", "Startdatumet måste vara före slutdatumet.")
        this.start = start
        this.stop = stop
    }

    static fromString(spec: string): DateRange {
        const parts = spec.split("..")
        if (parts.length != 2) {
            throw new DateParseError(
                `".." must occur exactly once, found ${parts.length - 1}.`,
                `".." får bara förekomma exakt en gång, hittade ${parts.length - 1}.`
            )
        }

        const [start, stop] = parts
        return new DateRange(
            DatePoint.fromString(start, "0001", "01", "01"),
            DatePoint.fromString(stop, "9999", "12", "31")
        )
    }

    toString(): string {
        return this.start.toString("0001", "01", "01") + ".." + this.stop.toString("9999", "12", "31")
    }

    intersection(other: DateRange): DateRange | null {
        const start = this.start.max(other.start)
        const stop = this.stop.min(other.stop)
        if (stop.isBefore(start))
            return null
        return new DateRange(start, stop)
    }

    /** Return a DateSet that covers this range.
     * 
     * An exact DateSet isn't possible in general. For example, 2020-11..2021-02 cannot
     * be represented by a DateSet. The best we can do is 202[01]-??, which is what this
     * returns.
     */
    coveringDateSet(): DateSet {
        function digitsOf(n: number, length: number): number[] {
            return n.toFixed().padStart(length, "0").split("").map(Number)
        }

        let years: IntSetUnion, months: IntSetUnion, days: IntSetUnion

        if (this.start.year !== this.stop.year) {
            // The year needs to be varied
            years = new IntSetUnion(
                enumerateIntSets(digitsOf(this.start.year, 4), digitsOf(this.stop.year, 4), [9, 9, 9, 9]).toArray()
            )
            // Any day and month, since we can't be more specific
            months = IntSetUnion.fromString("??")
            days = IntSetUnion.fromString("??")
        } else {
            // Fixed year
            years = IntSetUnion.fromString(this.start.year.toFixed().padStart(4, "0"))
            if (this.start.month !== this.stop.month) {
                // The month needs to be varied
                months = new IntSetUnion(
                    enumerateIntSets(digitsOf(this.start.month, 2), digitsOf(this.stop.month, 2), [1, 9]).toArray()
                )
                // Any day
                days = IntSetUnion.fromString("??")
            } else {
                // Fixed month
                months = IntSetUnion.fromString(this.start.month.toFixed().padStart(2, "0"))
                // Only the day needs to be varied
                days = new IntSetUnion(
                    enumerateIntSets(digitsOf(this.start.day, 2), digitsOf(this.stop.day, 2), [3, 9]).toArray()
                )
            }
        }

        return new DateSet(years, months, days)
    }
}


const allDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

/** Enumerate all IntSets in a given range, where each digit is less than or equal a given radix.
 * 
 * To write all years in the range 1785..2026 as an IntSetUnion string, we would have to write
 * 178[56789]/179?/1[89]??/20[01]?/202[0123456]. This function helps with this by yielding each
 * year IntSet (178[56789], 179?, etc.) in order.
 */
export function* enumerateIntSets(starts: number[], stops: number[], radixes: number[]): Generator<IntSet> {
    let fromZero = starts.every(n => n === 0)
    let toMax = stops.every((n, i) => n >= radixes[i])
    if (fromZero && toMax) {
        yield IntSet.repeat(new Set(allDigits), starts.length)
        return
    }

    let [start, ...startsRest] = starts
    let [stop, ...stopsRest] = stops
    let [radix, ...radixesRest] = radixes
    stop = Math.min(stop, radix)

    if (startsRest.length === 0) {
        // No more recursing
        yield new IntSet([new Set(allDigits.slice(start, stop + 1))])
        return
    }

    if (start === stop) {
        // Only one possibility for this digit
        let thisDigit = new IntSet([new Set([start])])
        for (const sequence of enumerateIntSets(startsRest, stopsRest, radixesRest)) {
            yield thisDigit.concat(sequence)
        }
        return
    }

    // We now know that stop > start.

    let doEnumerateBeginning = true
    if (startsRest.every(n => n === 0)) {
        // Don't yield 196? from start and 19[78]? from middle, let middle handle them both to give 19[678]?
        start -= 1
        doEnumerateBeginning = false
    }
    let doEnumerateEnd = true
    if (stopsRest.every((n, i) => n >= radixesRest[i])) {
        stop += 1
        doEnumerateEnd = false
    }

    // First, from start:
    if (doEnumerateBeginning) {
        let thisDigit = new IntSet([new Set([start])])
        for (const sequence of enumerateIntSets(startsRest, stopsRest.map(n => 9), radixesRest)) {
            yield thisDigit.concat(sequence)
        }
    }

    // Secondly, from start + 1 to stop - 1:
    if (start + 1 < stop) {
        let digits = new IntSet([new Set(allDigits.slice(start + 1, stop))])
        yield digits.concat(IntSet.repeat(new Set(allDigits), startsRest.length))
    }

    // Lastly, until stop:
    if (doEnumerateEnd) {
        let thisDigit = new IntSet([new Set([stop])])
        for (const sequence of enumerateIntSets(startsRest.map(n => 0), stopsRest, radixesRest)) {
            yield thisDigit.concat(sequence)
        }
    }
}

