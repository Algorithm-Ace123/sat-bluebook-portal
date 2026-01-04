import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST() {
    const supabase = await supabaseServer();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Find latest draft or create one
    const { data: existing } = await supabase
        .from("draft_tests")
        .select("id,title")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existing?.id) {
        return NextResponse.json({ draftId: existing.id, title: existing.title });
    }

    const { data: created, error } = await supabase
        .from("draft_tests")
        .insert({ title: "Untitled Test", created_by: user.user.id })
        .select("id,title")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ draftId: created.id, title: created.title });
}
