import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

function moduleLabel(moduleKey: string) {
    if (moduleKey === "RW_M1") return { id: "m1_rw", timeLimitSec: 32 * 60 };
    if (moduleKey === "RW_M2") return { id: "m2_rw", timeLimitSec: 32 * 60 };
    if (moduleKey === "MATH_M1") return { id: "m3_math", timeLimitSec: 35 * 60 };
    return { id: "m4_math", timeLimitSec: 35 * 60 };
}

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draftId, title } = await req.json();

    if (!draftId || !title) return NextResponse.json({ error: "Missing draftId/title" }, { status: 400 });

    // Fetch all questions linked to this draft grouped by module order
    const modules = ["RW_M1", "RW_M2", "MATH_M1", "MATH_M2"] as const;

    const compiledModules: any[] = [];

    for (const mod of modules) {
        const { data, error } = await supabase
            .from("draft_test_questions")
            .select("order_index, question_bank(kind, question)")
            .eq("draft_test_id", draftId)
            .eq("module", mod)
            .order("order_index", { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        const items = (data ?? []).map((row: any, idx: number) => {
            const qq = row.question_bank.question;

            // Convert AuthoringQuestion -> Student Test JSON question (your runner expects these keys)
            // NOTE: we keep stimulus as-is; your student runner can render it using StimulusRender logic later.
            // For now, we store it in a compatible shape:
            return {
                id: `${mod.toLowerCase()}_${idx + 1}`,
                kind: qq.kind,
                stimulus: { type: "passage", content: qq.stimulus }, // store blocks directly
                prompt: qq.question?.prompt,
                promptLatex: qq.question?.promptLatex,
                choices: qq.kind === "mcq"
                    ? qq.choices.map((c: any) => ({
                        id: c.id,
                        text: c.spans?.map((s: any) => s.text).join("") // MVP flatten; you can upgrade renderer to spans later
                    }))
                    : undefined,
                answer: qq.kind === "mcq"
                    ? { correct: qq.answer.correct }
                    : { accepted: qq.answer.accepted }
            };
        });

        const meta = moduleLabel(mod);
        compiledModules.push({ id: meta.id, timeLimitSec: meta.timeLimitSec, items });
    }

    const finalJson = {
        version: "1.0",
        title,
        section: "FULL",
        tools: {
            desmos: true,
            referenceSheetUrl: "/reference.png"
        },
        modules: compiledModules,
        assets: []
    };

    // Save compiled test to tests table
    const { data: inserted, error: insErr } = await supabase
        .from("tests")
        .insert({
            title,
            section: "FULL",
            json: finalJson,
            created_by: user.user.id
        })
        .select("id")
        .single();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, testId: inserted.id });
}
