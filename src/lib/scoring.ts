import { Pair } from "./schema";

// ===== Scoring rules =====
const HEDGED_MARGIN = 30;        // "around 7pm" means 7pm ± 30 minutes
const EXACT_MARGIN = 10;         // "8:05" means 8:05 ± 10 minutes
const PENALTY_PER_HEDGE = 0.1;   // each hedge word lowers confidence by 10%
const MAX_HEDGE_PENALTY = 0.4;   // hedges never lower it by more than 40%
const BASE_DIRECT = 0.9;         // statements clash on their own
const BASE_INFERENTIAL = 0.6;    // clash depends on an assumption
const BASE_FALSE_POSITIVE = 0.8; // time ranges overlap, so likely harmless

// Words and phrases that show the witness is unsure
const HEDGES = [
    "maybe", "around", "about", "i think", "i don't think", "might",
    "i don't remember", "i don't recall", "or something", "i mean",
    "may", "possibly", "probably", "perhaps", "likely", "seems",
];

export type ContradictionType = "DROP" | "FALSE_POSITIVE" | "DIRECT" | "INFERENTIAL";
export type Range = { start: number; end: number };
export type ScoreResult = { confidence: number; reasons: string[] };

// ===== Helpers =====

// Lowercase, drop apostrophes ("don't" becomes "dont"),
// turn other punctuation into spaces, and collapse extra spaces.
export function normalize(text: string): string {
    let result = "";
    for (const ch of text.toLowerCase()) {
        const isLetter = ch >= "a" && ch <= "z";
        const isDigit = ch >= "0" && ch <= "9";
        if (isLetter || isDigit) {
            result += ch;
        } else if (ch === "'" || ch === "\u2019") {
            // skip apostrophes
        } else {
            result += " ";
        }
    }
    return result.split(" ").filter(word => word !== "").join(" ");
}

// Is this quote really in the transcript?
export function isGrounded(quote: string, transcript: string): boolean {
    return normalize(transcript).includes(normalize(quote));
}

// Which hedge words appear in this text? Whole words only,
// so "may" doesn't match inside "maybe".
export function findHedges(text: string): string[] {
    const padded = " " + normalize(text) + " ";
    const found: string[] = [];
    for (const hedge of HEDGES) {
        if (padded.includes(" " + normalize(hedge) + " ")) {
            found.push(hedge);
        }
    }
    return found;
}

// Turn one time phrase into minutes on a 12-hour clock.
// "around 7pm" -> 420, "10:30" -> 630, "Midnight maybe" -> 720, "all evening" -> null
function phraseToMinutes(phrase: string): number | null {
    const text = phrase.toLowerCase();
    if (text.includes("midnight") || text.includes("noon")) {
        return 12 * 60;
    }
    for (const word of text.split(" ")) {
        const first = word.charAt(0);
        if (first >= "0" && first <= "9") {
            const parts = word.split(":");        // "7:30" -> ["7", "30"]
            const hours = parseInt(parts[0]);     // parseInt("7pm") -> 7
            let minutes = 0;
            if (parts.length > 1) {
                minutes = parseInt(parts[1]);       // parseInt("30pm") -> 30
            }
            if (isNaN(hours) || isNaN(minutes)) {
                return null;
            }
            return hours * 60 + minutes;
        }
    }
    return null;
}

// Turn a quote's time phrases into one range, from the earliest
// time minus its margin to the latest time plus its margin.
// Returns null if no phrase is a real clock time.
export function toRange(times: string[]): Range | null {
    let start: number | null = null;
    let end: number | null = null;

    for (const phrase of times) {
        const minutes = phraseToMinutes(phrase);
        if (minutes === null) {
            continue; // e.g. "all evening"
        }

        let margin = EXACT_MARGIN;
        if (findHedges(phrase).length > 0) {
            margin = HEDGED_MARGIN;
        }

        if (start === null || minutes - margin < start) {
            start = minutes - margin;
        }
        if (end === null || minutes + margin > end) {
            end = minutes + margin;
        }
    }

    if (start === null || end === null) {
        return null;
    }
    return { start: start, end: end };
}

// Two ranges overlap if each one starts before the other ends
export function overlaps(a: Range, b: Range): boolean {
    return a.start <= b.end && b.start <= a.end;
}

// ===== Classification and scoring =====

// Decides what kind of contradiction a pair is
export function classify(pair: Pair, transcript1: string, transcript2: string): ContradictionType {
    // Check 1: are both quotes really in their transcripts?
    if (!isGrounded(pair.quote1, transcript1) || !isGrounded(pair.quote2, transcript2)) {
        return "DROP";
    }


    // Check 2: do the times overlap?
    const range1 = toRange(pair.times1);
    const range2 = toRange(pair.times2);

    if (range1 !== null && range2 !== null && overlaps(range1, range2)) {
        return "FALSE_POSITIVE";
    }

    // Check 3: use Gemini's suggestion
    if(pair.relation === "opposes") {
        return "DIRECT";
    } else {
        return "INFERENTIAL";
    }
}

// Decides how confident we are in that type, and records why
export function score(pair: Pair, type: ContradictionType): ScoreResult {
    const reasons: string[] = [];
    let confidence = 0;

    // Step 1: starting confidence for this type
    if (type === "DIRECT") {
        confidence = BASE_DIRECT;
    } else if (type === "INFERENTIAL") {
        confidence = BASE_INFERENTIAL;
    } else if (type === "FALSE_POSITIVE") {
        confidence = BASE_FALSE_POSITIVE;
    }
    reasons.push("Base for " + type + ": " + confidence);

    // Step 2: hedge penalty, skipped for false positives
    if (type !== "FALSE_POSITIVE") {
        const hedges = findHedges(pair.quote1).concat(findHedges(pair.quote2));

        let penalty = hedges.length * PENALTY_PER_HEDGE;
        if (penalty > MAX_HEDGE_PENALTY) {
            penalty = MAX_HEDGE_PENALTY;
        }

        confidence = confidence * (1 - penalty);

        if (hedges.length > 0) {
            reasons.push("Hedges (" + hedges.join(", ") + "): -" + Math.round(penalty * 100) + "%");
        }
    }

    // Step 3: keep it between 0 and 1, rounded to 2 decimals
    if (confidence < 0) confidence = 0;
    if (confidence > 1) confidence = 1;
    confidence = Math.round(confidence * 100) / 100;

    return { confidence: confidence, reasons: reasons };
}