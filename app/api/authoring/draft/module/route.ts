import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const draftId = url.searchParams.get("draftId");
    const module = url.searchParams.get("module");
    if (!draftId || !module) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const { data, error } = await supabase
        .from("draft_test_questions")
        .select("order_index, question_bank(id, kind, question)")
        .eq("draft_test_id", draftId)
        .eq("module", module)
        .order("order_index", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const items = (data ?? []).map((row: any) => {
        const qb = Array.isArray(row.question_bank) ? row.question_bank[0] : row.question_bank;
        const q = qb?.question ?? {};

        const titlePreview =
            q?.question?.prompt?.[0]?.text ||
            q?.question?.promptLatex ||
            q?.question?.prompt?.toString?.() ||
            qb?.kind ||
            "Question";

        return {
            id: qb?.id,
            kind: qb?.kind,
            titlePreview: String(titlePreview).slice(0, 120),
            order_index: row.order_index
        };
    }).filter((x: any) => x.id); // drop empty joins

    return NextResponse.json({ items });
}
