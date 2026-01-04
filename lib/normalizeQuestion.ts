// lib/normalizeQuestion.ts
import { AuthoringQuestionSchema, type AuthoringQuestion, type InlineNode, type StimulusBlock } from "@/lib/authoring";

function textInline(s: string): InlineNode[] {
    return [{ type: "text", text: s, marks: [] }];
}

function normalizeInline(x: any): InlineNode[] {
    if (Array.isArray(x)) {
        // Already inline nodes?
        if (x.length && typeof x[0] === "object" && (x[0].type === "text" || x[0].type === "math")) return x as InlineNode[];
        if (x.every((t) => typeof t === "string")) return x.flatMap((t) => textInline(t));
    }
    if (typeof x === "string") return textInline(x);
    if (x == null) return textInline("");
    return textInline(String(x));
}

function normalizeStimulusBlocks(blocks: any): StimulusBlock[] {
    if (!Array.isArray(blocks)) return [];

    return blocks.map((b: any) => {
        if (!b || typeof b !== "object") return { type: "paragraph", content: textInline(String(b ?? "")) } as any;

        // legacy heading/paragraph spans
        if ((b.type === "heading" || b.type === "paragraph") && Array.isArray(b.spans)) {
            const txt = b.spans.map((s: any) => s?.text ?? "").join("");
            const marks = Array.isArray(b.spans?.[0]?.marks) ? b.spans[0].marks : [];
            return b.type === "heading"
                ? { type: "heading", level: b.level ?? 3, content: [{ type: "text", text: txt, marks }] }
                : { type: "paragraph", content: [{ type: "text", text: txt, marks }] };
        }

        if (b.type === "heading") return { type: "heading", level: b.level ?? 3, content: normalizeInline(b.content ?? b.text ?? "") } as any;
        if (b.type === "paragraph") return { type: "paragraph", content: normalizeInline(b.content ?? b.text ?? "") } as any;

        if (b.type === "table") return { type: "table", label: b.label, columns: b.columns ?? [], rows: b.rows ?? [] } as any;
        if (b.type === "image") return { type: "image", label: b.label, src: b.src, alt: b.alt ?? "image" } as any;

        // legacy "math" -> math_block
        if (b.type === "math" || b.type === "math_block")
            return { type: "math_block", label: b.label, latex: b.latex ?? "" } as any;

        // fallback
        return { type: "paragraph", content: textInline(JSON.stringify(b)) } as any;
    });
}

/**
 * Main import function:
 * 1) If raw already matches AuthoringQuestionSchema => return it (no data loss)
 * 2) Else normalize older/looser formats into AuthoringQuestion
 */
export function normalizeQuestionJSON(raw: any): AuthoringQuestion {
    // ✅ If already valid authoring question, keep as-is (INCLUDING promptBlocks)
    const direct = AuthoringQuestionSchema.safeParse(raw);
    if (direct.success) return direct.data;

    // Otherwise try to normalize
    const kind = raw?.kind ?? raw?.type;
    if (kind !== "mcq" && kind !== "frq_math") throw new Error("kind must be mcq or frq_math");

    const stimulus = normalizeStimulusBlocks(raw?.stimulus ?? raw?.stimulusBlocks ?? raw?.passage ?? []);

    const question = {
        prompt: normalizeInline(raw?.question?.prompt ?? raw?.prompt ?? ""),
        promptLatex: raw?.question?.promptLatex ?? raw?.promptLatex,
        // ✅ NEW: preserve/normalize promptBlocks
        promptBlocks: normalizeStimulusBlocks(raw?.question?.promptBlocks ?? raw?.promptBlocks ?? [])
    };

    if (kind === "mcq") {
        const choicesRaw = raw?.choices ?? raw?.options;
        if (!Array.isArray(choicesRaw) || choicesRaw.length !== 4) throw new Error("MCQ must have exactly 4 choices");

        const ids = ["A", "B", "C", "D"] as const;
        const choices = choicesRaw.map((c: any, i: number) => {
            if (typeof c === "string") return { id: ids[i], content: textInline(c) };
            return {
                id: c.id ?? ids[i],
                content: normalizeInline(c.content ?? c.text ?? ""),
                image: c.image ? { src: c.image.src ?? c.image, alt: c.image.alt ?? "choice image", label: c.image.label } : undefined
            };
        });

        const correct = raw?.answer?.correct ?? raw?.correct ?? raw?.answer;
        const out: any = { kind: "mcq", stimulus, question, choices, answer: { correct } };

        const v = AuthoringQuestionSchema.safeParse(out);
        if (!v.success) throw new Error("Normalized MCQ failed validation");
        return v.data;
    }

    // FRQ
    const accepted = raw?.answer?.accepted ?? raw?.acceptedAnswers ?? raw?.accepted ?? [{ type: "exact", value: "1" }];
    const out: any = { kind: "frq_math", stimulus, question, answer: { accepted } };

    const v = AuthoringQuestionSchema.safeParse(out);
    if (!v.success) throw new Error("Normalized FRQ failed validation");
    return v.data;
}
