import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draftId, module, questionId } = await req.json();
    if (!draftId || !module || !questionId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { error } = await supabase
        .from("draft_test_questions")
        .delete()
        .eq("draft_test_id", draftId)
        .eq("module", module)
        .eq("question_id", questionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from("draft_tests").update({ updated_at: new Date().toISOString() }).eq("id", draftId);

    return NextResponse.json({ ok: true });
}
