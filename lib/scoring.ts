/**
 * REFINED "FLEX" SAT SCORING MODEL
 * 
 * Benchmark Profile (Slightly relaxed Elite curve):
 * - Math: Missing 1 = -30 points (800 -> 770 -> 740).
 * - RW: Missing 1 = -10 points (800 -> 790 -> 780 -> 770 -> 760 -> 760 -> 750).
 * - Easy Paths: Capped at 510.
 * 
 * Target: 1450 + ~40 pts = ≈ 1490 for the 48/54 & 42/44 profile.
 */

// Reading & Writing - HARD PATH (0-54 raw)
const RW_HARD = new Array(55).fill(200);
RW_HARD[54] = 800; // Perfect
RW_HARD[53] = 790; // -1
RW_HARD[52] = 780; // -2
RW_HARD[51] = 770; // -3
RW_HARD[50] = 760; // -4 
RW_HARD[49] = 760; // -5
RW_HARD[48] = 750; // -6 (Target Benchmark: 730 -> 750)
for (let i = 40; i < 48; i++) RW_HARD[i] = 630 + (i - 40) * 15;
for (let i = 0; i < 40; i++) RW_HARD[i] = Math.min(630, 200 + i * 12);

// Reading & Writing - EASY PATH (0-54 raw)
const RW_EASY = new Array(55).fill(200);
RW_EASY[54] = 510; // Ceiling (480 -> 510)
RW_EASY[53] = 500;
for (let i = 40; i < 53; i++) RW_EASY[i] = 380 + (i - 40) * 10;
for (let i = 0; i < 40; i++) RW_EASY[i] = 200 + i * 5;

// Math - HARD PATH (0-44 raw)
const MATH_HARD = new Array(45).fill(200);
MATH_HARD[44] = 800; // Perfect
MATH_HARD[43] = 770; // -1 (Severe Penalty: 760 -> 770)
MATH_HARD[42] = 740; // -2 (Target Benchmark: 720 -> 740)
MATH_HARD[41] = 710; // -3
MATH_HARD[40] = 680; // -4
for (let i = 30; i < 40; i++) MATH_HARD[i] = 540 + (i - 30) * 14;
for (let i = 0; i < 30; i++) MATH_HARD[i] = 200 + i * 11;

// Math - EASY PATH (0-44 raw)
const MATH_EASY = new Array(45).fill(200);
MATH_EASY[44] = 510; // Ceiling (480 -> 510)
MATH_EASY[43] = 490;
for (let i = 30; i < 43; i++) MATH_EASY[i] = 360 + (i - 30) * 10;
for (let i = 0; i < 30; i++) MATH_EASY[i] = 200 + i * 6;

export type Route = "easy" | "hard";

export function inferRoute(m2: any, m1Correct: number, section: "RW" | "MATH"): Route {
    // If the module object has a label/difficulty hint, use it
    if (m2?.difficulty === "hard" || m2?.label?.toLowerCase().includes("hard")) return "hard";
    if (m2?.difficulty === "easy" || m2?.label?.toLowerCase().includes("easy")) return "easy";

    // Fallback: Infer from Module 1 performance
    if (section === "RW") {
        return m1Correct >= 18 ? "hard" : "easy";
    } else {
        return m1Correct >= 15 ? "hard" : "easy";
    }
}

function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}

/**
 * Digital SAT scoring support (strict mapping by default)
 *
 * To increase accuracy for the new Digital SAT, we use anchor-based
 * piecewise-linear conversion tables that are monotonic and tuned to
 * be slightly strict (e.g., RW 46/54 => ~680). We expose a simple mode
 * parameter so legacy mappings can still be used if necessary.
 */

// Helpers to build lookup tables from anchor points
function buildLookup(maxRaw: number, anchors: { raw: number; score: number }[]) {
    const table = new Array(maxRaw + 1).fill(200);

    // Sort anchors
    anchors = anchors.slice().sort((a, b) => a.raw - b.raw);

    // Ensure endpoints
    if (anchors[0].raw > 0) anchors.unshift({ raw: 0, score: anchors[0].score });
    if (anchors[anchors.length - 1].raw < maxRaw) anchors.push({ raw: maxRaw, score: anchors[anchors.length - 1].score });

    let ai = 0;
    for (let r = 0; r <= maxRaw; r++) {
        while (ai < anchors.length - 1 && r > anchors[ai + 1].raw) ai++;
        const a = anchors[ai];
        const b = anchors[ai + 1];
        if (!b) {
            table[r] = a.score;
            continue;
        }
        const span = b.raw - a.raw;
        const t = span === 0 ? 0 : (r - a.raw) / span;
        const val = Math.round(a.score + t * (b.score - a.score));
        table[r] = clamp(val, 200, 800);
    }

    // Guarantee monotonicity
    for (let i = 1; i <= maxRaw; i++) table[i] = Math.max(table[i - 1], table[i]);

    return table;
}

// Digital SAT anchor points tuned to be slightly strict
const RW_DIGITAL = buildLookup(54, [
    { raw: 0, score: 200 },
    { raw: 10, score: 300 },
    { raw: 20, score: 420 },
    { raw: 30, score: 540 },
    { raw: 40, score: 600 },
    { raw: 46, score: 680 }, // Strict mapping: 46 -> ~680
    { raw: 50, score: 740 },
    { raw: 54, score: 800 }
]);

const MATH_DIGITAL = buildLookup(44, [
    { raw: 0, score: 200 },
    { raw: 6, score: 300 },
    { raw: 12, score: 380 },
    { raw: 20, score: 480 },
    { raw: 30, score: 600 },
    { raw: 36, score: 700 },
    { raw: 40, score: 740 },
    { raw: 44, score: 800 }
]);

export type ScoreMode = "digital" | "legacy-hard" | "legacy-easy";

export function calculateSectionScore(
    m1Correct: number,
    m1Total: number,
    m2Correct: number,
    m2Total: number,
    section: "RW" | "MATH" = "RW",
    mode: ScoreMode = "digital"
): number {
    const rawTotal = m1Correct + m2Correct;
    if (section === "RW") {
        const r = clamp(rawTotal, 0, 54);
        if (mode === "digital") return RW_DIGITAL[r];
        const isHard = inferRoute(null, m1Correct, section) === "hard";
        return isHard ? RW_HARD[r] : RW_EASY[r];
    } else {
        const r = clamp(rawTotal, 0, 44);
        if (mode === "digital") return MATH_DIGITAL[r];
        const isHard = inferRoute(null, m1Correct, section) === "hard";
        return isHard ? MATH_HARD[r] : MATH_EASY[r];
    }
}

export function calculateTotalScore(
    rw1Correct: number,
    rw1Total: number,
    rw2Correct: number,
    rw2Total: number,
    m1Correct: number,
    m1Total: number,
    m2Correct: number,
    m2Total: number
): { rw: number; math: number; total: number } {
    const rw = calculateSectionScore(rw1Correct, rw1Total, rw2Correct, rw2Total, "RW");
    const math = calculateSectionScore(m1Correct, m1Total, m2Correct, m2Total, "MATH");

    return {
        rw,
        math,
        total: rw + math
    };
}

