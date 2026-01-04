import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { AuthoringQuestionSchema } from "@/lib/authoring";

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, module, kind, question, draftId } = body;

    if (!module || !kind || !question || !draftId) {
        return NextResponse.json({ error: "Missing module/kind/question/draftId" }, { status: 400 });
    }

    const v = AuthoringQuestionSchema.safeParse(question);
    if (!v.success) {
        return NextResponse.json({ error: "Validation failed", details: v.error.format() }, { status: 400 });
    }

    let questionId = id as string | null;

    if (questionId) {
        const { error } = await supabase
            .from("question_bank")
            .update({ module, kind, question: v.data, updated_at: new Date().toISOString() })
            .eq("id", questionId);

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
        const { data: created, error } = await supabase
            .from("question_bank")
            .insert({ module, kind, question: v.data, created_by: u.user.id })
            .select("id")
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        questionId = created.id;

        const { data: last } = await supabase
            .from("draft_test_questions")
            .select("order_index")
            .eq("draft_test_id", draftId)
            .eq("module", module)
            .order("order_index", { ascending: false })
            .limit(1);

        const nextIndex = last?.length ? last[0].order_index + 1 : 0;

        const { error: linkErr } = await supabase
            .from("draft_test_questions")
            .insert({ draft_test_id: draftId, module, question_id: questionId, order_index: nextIndex });

        if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 });
    }

    await supabase.from("draft_tests").update({ updated_at: new Date().toISOString() }).eq("id", draftId);

    return NextResponse.json({ ok: true, questionId });
}
