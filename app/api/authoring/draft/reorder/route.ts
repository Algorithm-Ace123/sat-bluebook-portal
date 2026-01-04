import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draftId, module, orderedIds } = await req.json();
    if (!draftId || !module || !Array.isArray(orderedIds)) {
        return NextResponse.json({ error: "Missing draftId/module/orderedIds" }, { status: 400 });
    }

    // Update order_index per question
    for (let i = 0; i < orderedIds.length; i++) {
        const qid = orderedIds[i];
        const { error } = await supabase
            .from("draft_test_questions")
            .update({ order_index: i })
            .eq("draft_test_id", draftId)
            .eq("module", module)
            .eq("question_id", qid);

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from("draft_tests").update({ updated_at: new Date().toISOString() }).eq("id", draftId);

    return NextResponse.json({ ok: true });
}
