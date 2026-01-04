import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const MODULES = ["RW_M1", "RW_M2", "MATH_M1", "MATH_M2"] as const;

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const draftId = url.searchParams.get("draftId");
    if (!draftId) return NextResponse.json({ error: "Missing draftId" }, { status: 400 });

    const { data: draft, error: dErr } = await supabase
        .from("draft_tests")
        .select("id,title,status,created_at,updated_at")
        .eq("id", draftId)
        .single();

    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 400 });

    // counts per module
    const counts: Record<string, number> = {};
    for (const mod of MODULES) {
        const { count, error } = await supabase
            .from("draft_test_questions")
            .select("*", { count: "exact", head: true })
            .eq("draft_test_id", draftId)
            .eq("module", mod);

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        counts[mod] = count ?? 0;
    }

    return NextResponse.json({ draft, counts });
}
