import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title } = await req.json();
    const { data: created, error } = await supabase
        .from("draft_tests")
        .insert({ title: title ?? "Untitled Test", created_by: u.user.id })
        .select("id")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ draftId: created.id });
}
