import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(req: Request) {
    const supabase = supabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draftId, title } = await req.json();
    if (!draftId || !title) return NextResponse.json({ error: "Missing draftId/title" }, { status: 400 });

    const { error } = await supabase
        .from("draft_tests")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", draftId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
}
