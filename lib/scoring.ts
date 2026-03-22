export type Route = "easy" | "hard";

function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}

function roundTo10(n: number) {
    return Math.round(n / 10) * 10;
}

/**
 * Infer whether a module uses the "hard" or "easy" route.
 */
export function inferRoute(mod: any | null, m1Correct: number, section: "RW" | "MATH"): Route {
    // 1) Explicit metadata hints
    if (mod) {
        const meta = (mod.meta ?? {}) as any;
        const route = (mod.route ?? meta.route ?? mod.difficulty ?? meta.difficulty) as string | undefined;
        if (route) {
            const r = route.toString().toLowerCase();
            if (r.includes("hard")) return "hard";
            if (r.includes("easy")) return "easy";
        }

        const tags = (mod.tags ?? mod.labels ?? []) as string[];
        if (Array.isArray(tags)) {
            for (const t of tags) {
                const tl = String(t).toLowerCase();
                if (tl.includes("hard") || tl.includes("advanced")) return "hard";
                if (tl.includes("easy") || tl.includes("calculator")) return "easy";
            }
        }
    }

    // 2) Heuristic fallback based on M1 performance (Strict thresholds matching the new system)
    if (section === "RW") {
        return m1Correct >= 20 ? "hard" : "easy";
    }
    return m1Correct >= 17 ? "hard" : "easy";
}

export type ScoreMode = "digital" | "legacy-hard" | "legacy-easy";

/**
 * Advanced Digital SAT Scoring System using Quadratic IRT simulation
 */
export function calculateSectionScore(
    m1Correct: number,
    m1Total: number,
    m2Correct: number,
    m2Total: number,
    section: "RW" | "MATH" = "RW",
    mode: ScoreMode = "digital"
): number {
    const isHard = inferRoute(null, m1Correct, section) === "hard";

    // Standardize totals securely
    const t1 = m1Total || (section === "RW" ? 27 : 22);
    // Be careful since some legacy usages may pass the entire section total to m2Total,
    // we clamp it to reality (e.g. 27 or 22). If they pass 54, clamp to 27.
    let t2 = m2Total || (section === "RW" ? 27 : 22);
    if (section === "RW" && t2 > 30) t2 -= t1; 
    if (section === "MATH" && t2 > 30) t2 -= t1;

    const w1 = Math.max(0, t1 - m1Correct);
    const w2 = Math.max(0, t2 - m2Correct);

    if (section === "RW") {
        const wRW = isHard ? (w1 + 0.9 * w2) : (w1 + 1.15 * w2);
        
        let score = 800 - 12 * wRW - 0.35 * Math.pow(wRW, 2);
        score = roundTo10(score);
        
        if (score > 750 && (w1 + w2) > 0) score -= 10;
        
        return clamp(score, 200, 800);
    } else {
        const wMath = isHard ? (w1 + 0.85 * w2) : (w1 + 1.10 * w2);
        
        let score = 800 - 14 * wMath - 0.30 * Math.pow(wMath, 2);
        score = roundTo10(score);
        
        if (score > 760 && (w1 + w2) > 0) score -= 10;
        
        return clamp(score, 200, 800);
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
