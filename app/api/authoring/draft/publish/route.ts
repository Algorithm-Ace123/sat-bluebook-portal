import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { AuthoringQuestionSchema } from "@/lib/authoring";

const MODULES = ["RW_M1", "RW_M2", "MATH_M1", "MATH_M2"] as const;

function one<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
}

function moduleMeta(mod: string) {
    if (mod === "RW_M1") return { id: "m1_rw", timeLimitSec: 32 * 60 };
    if (mod === "RW_M2") return { id: "m2_rw", timeLimitSec: 32 * 60 };
    if (mod === "MATH_M1") return { id: "m3_math", timeLimitSec: 35 * 60 };
    return { id: "m4_math", timeLimitSec: 35 * 60 };
}

function flattenInline(nodes: any[] | undefined): string {
    if (!Array.isArray(nodes)) return "";
    return nodes
        .map((n) => (n.type === "text" ? n.text : n.type === "math" ? `[${n.latex}]` : ""))
        .join("");
}

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draftId, title } = await req.json();
    if (!draftId || !title) return NextResponse.json({ error: "Missing draftId/title" }, { status: 400 });

    const compiledModules: any[] = [];

    for (const mod of MODULES) {
        const { data, error } = await supabase
            .from("draft_test_questions")
            .select("order_index, question_bank!inner(kind, question)")
            .eq("draft_test_id", draftId)
            .eq("module", mod)
            .order("order_index", { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        const meta = moduleMeta(mod);
        const items: any[] = [];

        for (let i = 0; i < (data ?? []).length; i++) {
            const row: any = data![i];
            const qb = one(row.question_bank);

            const raw = qb?.question;
            if (!raw) {
                return NextResponse.json(
                    { error: `Missing question join in ${mod} at position ${i + 1}` },
                    { status: 400 }
                );
            }

            const v = AuthoringQuestionSchema.safeParse(raw);
            if (!v.success) {
                return NextResponse.json(
                    { error: `Invalid question found in ${mod} at position ${i + 1}` },
                    { status: 400 }
                );
            }

            const aq = v.data;

            const item: any = {
                id: `${mod.toLowerCase()}_${i + 1}`,
                kind: aq.kind,
                // store authoring stimulus blocks directly
                stimulus: { type: "passage", content: aq.stimulus },
                // keep both flattened and structured prompt for compatibility
                prompt: flattenInline(aq.question.prompt),
                promptLatex: aq.question.promptLatex,
                promptNodes: aq.question.prompt,
                promptBlocks: aq.question.promptBlocks, // Added this
                answer: aq.kind === "mcq" ? { correct: aq.answer.correct } : { accepted: aq.answer.accepted }
            };

            if (aq.kind === "mcq") {
                item.choices = aq.choices.map((c) => ({
                    id: c.id,
                    text: flattenInline(c.content),
                    content: c.content,
                    image: c.image
                }));
            }

            items.push(item);
        }

        compiledModules.push({ id: meta.id, timeLimitSec: meta.timeLimitSec, items });
    }

    const finalJson = {
        version: "1.0",
        title,
        section: "FULL",
        tools: { desmos: true, referenceSheetUrl: "/reference.png" },
        modules: compiledModules,
        assets: []
    };

    const { data: inserted, error: insErr } = await supabase
        .from("tests")
        .insert({ title, section: "FULL", json: finalJson, created_by: u.user.id })
        .select("id")
        .single();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

    await supabase
        .from("draft_tests")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", draftId);

    return NextResponse.json({ ok: true, testId: inserted.id });
}
