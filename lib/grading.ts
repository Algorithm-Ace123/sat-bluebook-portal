import type { Question } from "../lib/schema";

function normalize(s: string) {
    return String(s ?? "")
        .trim()
        .replace(/\s+/g, "")
        .replace(/−/g, "-");
}

function gcd(a: number, b: number): number {
    while (b !== 0) {
        const t = a % b;
        a = b;
        b = t;
    }
    return a;
}

function parseFraction(input: string): { num: number; den: number } | null {
    const s = normalize(input);
    const m = s.match(/^(-?\d+)\/(-?\d+)$/);
    if (!m) return null;
    const num = Number(m[1]);
    const den = Number(m[2]);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return { num, den };
}

function toNumber(input: string): number | null {
    const s = normalize(input);
    const frac = parseFraction(s);
    if (frac) return frac.num / frac.den;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

export function gradeQuestion(q: any, studentAnswer: any): boolean {
    if (q.kind === "mcq") {
        const correct = q.answer?.correct;
        return studentAnswer?.choiceId === correct;
    }

    // FRQ
    const raw = String(studentAnswer?.value ?? "");
    const nRaw = normalize(raw);

    const accepted = q.answer?.accepted ?? [];
    for (const a of accepted) {
        if (a.type === "exact") {
            if (normalize(a.value) === nRaw) return true;
        }
        if (a.type === "numeric") {
            const n = toNumber(raw);
            if (n === null) continue;
            const tol = a.tolerance ?? 1e-6;
            if (Math.abs(n - a.value) <= tol) return true;
        }
        if (a.type === "fraction") {
            const f1 = parseFraction(raw);
            const f2 = parseFraction(a.value);
            if (f1 && f2) {
                const g1 = gcd(Math.abs(f1.num), Math.abs(f1.den));
                const g2 = gcd(Math.abs(f2.num), Math.abs(f2.den));
                const r1 = { num: f1.num / g1, den: f1.den / g1 };
                const r2 = { num: f2.num / g2, den: f2.den / g2 };
                if (r1.num === r2.num && r1.den === r2.den) return true;
            } else {
                const n1 = toNumber(raw);
                const n2 = toNumber(a.value);
                if (n1 !== null && n2 !== null && Math.abs(n1 - n2) < 1e-9) return true;
            }
        }
    }

    return false;
}
