import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const MODULES = ["RW_M1", "RW_M2", "MATH_M1", "MATH_M2"] as const;

function modFromIndex(i: number) {
    return MODULES[i] ?? "RW_M1";
}

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { testId } = await req.json();
    if (!testId) return NextResponse.json({ error: "Missing testId" }, { status: 400 });

    const { data: testRow, error } = await supabase
        .from("tests")
        .select("title,json")
        .eq("id", testId)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const title = `${testRow.title} (Copy)`;

    // Create new draft
    const { data: draft, error: dErr } = await supabase
        .from("draft_tests")
        .insert({ title, created_by: u.user.id, status: "draft" })
        .select("id")
        .single();

    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 400 });

    const json = testRow.json;
    const mods = json?.modules ?? [];

    // For each module, recreate questions in question_bank (snapshot copy)
    for (let mi = 0; mi < mods.length; mi++) {
        const moduleKey = modFromIndex(mi);
        const items = mods[mi]?.items ?? [];

        for (let qi = 0; qi < items.length; qi++) {
            const item = items[qi];

            // Recreate a question_bank record with "question" stored as-is if possible.
            // If it was published from authoring, stimulus.content is authoring blocks already.
            const question = item?.stimulus?.content
                ? {
                    kind: item.kind,
                    stimulus: item.stimulus.content,
                    question: { prompt: item.promptNodes ?? [{ type: "text", text: item.prompt ?? "" }], promptLatex: item.promptLatex },
                    choices: item.choices?.map((c: any) => ({ id: c.id, content: c.content ?? [{ type: "text", text: c.text ?? "" }], image: c.image })),
                    answer: item.answer
                }
                : item; // fallback

            const kind = item.kind;

            const { data: qb, error: qErr } = await supabase
                .from("question_bank")
                .insert({
                    module: moduleKey,
                    kind,
                    question,
                    created_by: u.user.id
                })
                .select("id")
                .single();

            if (qErr) return NextResponse.json({ error: qErr.message }, { status: 400 });

            await supabase.from("draft_test_questions").insert({
                draft_test_id: draft.id,
                module: moduleKey,
                question_id: qb.id,
                order_index: qi
            });
        }
    }

    return NextResponse.json({ ok: true, draftId: draft.id });
}
