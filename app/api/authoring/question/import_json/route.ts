import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { normalizeQuestionJSON } from "@/lib/normalizeQuestion";
import { ModuleKeySchema, AuthoringQuestionSchema } from "@/lib/authoring";

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { draftId, module, rawJson } = body;

    if (!draftId || !module || rawJson == null) {
        return NextResponse.json({ error: "Missing draftId/module/rawJson" }, { status: 400 });
    }

    const mod = ModuleKeySchema.safeParse(module);
    if (!mod.success) return NextResponse.json({ error: "Invalid module key" }, { status: 400 });

    let parsed: any;
    try {
        parsed = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
    } catch {
        return NextResponse.json({ error: "Invalid JSON (cannot parse)" }, { status: 400 });
    }

    // ✅ If already valid, keep as-is; else normalize
    const direct = AuthoringQuestionSchema.safeParse(parsed);
    const question = direct.success ? direct.data : normalizeQuestionJSON(parsed);

    const kind = question.kind;

    const { data: created, error } = await supabase
        .from("question_bank")
        .insert({
            module: mod.data,
            kind,
            question,
            created_by: u.user.id
        })
        .select("id")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // append to draft order
    const { data: last } = await supabase
        .from("draft_test_questions")
        .select("order_index")
        .eq("draft_test_id", draftId)
        .eq("module", mod.data)
        .order("order_index", { ascending: false })
        .limit(1);

    const nextIndex = last?.length ? last[0].order_index + 1 : 0;

    const { error: linkErr } = await supabase
        .from("draft_test_questions")
        .insert({
            draft_test_id: draftId,
            module: mod.data,
            question_id: created.id,
            order_index: nextIndex
        });

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 });

    await supabase.from("draft_tests").update({ updated_at: new Date().toISOString() }).eq("id", draftId);

    return NextResponse.json({ ok: true, questionId: created.id, kind });
}
