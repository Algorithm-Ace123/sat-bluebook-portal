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

function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}

/**
 * Routing logic: Maintains high standards but remains consistent.
 */
export function inferRoute(mod: any, m1Correct?: number, section?: "RW" | "MATH"): Route {
    const id = String(mod?.id ?? "").toLowerCase();
    const label = String(mod?.label ?? "").toLowerCase();

    if (id.includes("hard") || label.includes("hard")) return "hard";
    if (id.includes("easy") || label.includes("easy")) return "easy";

    if (m1Correct !== undefined && section) {
        if (section === "RW") return m1Correct >= 18 ? "hard" : "easy";
        if (section === "MATH") return m1Correct >= 14 ? "hard" : "easy";
    }

    return "hard";
}

export function calculateSectionScore(
    m1Correct: number,
    m1Total: number,
    m2Correct: number,
    m2Total: number,
    section: "RW" | "MATH" = "RW"
): number {
    const rawTotal = m1Correct + m2Correct;
    const isHard = inferRoute(null, m1Correct, section) === "hard";

    if (section === "RW") {
        const r = clamp(rawTotal, 0, 54);
        return isHard ? RW_HARD[r] : RW_EASY[r];
    } else {
        const r = clamp(rawTotal, 0, 44);
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
    const rw = calculateSectionScore(rw1Correct, rw1Total, rw2Correct, rw1Total + rw2Total, "RW");
    const math = calculateSectionScore(m1Correct, m1Total, m2Correct, m1Total + m2Total, "MATH");

    return {
        rw,
        math,
        total: rw + math
    };
}
