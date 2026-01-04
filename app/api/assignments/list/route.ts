import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";

export async function GET() {
    const supabase = supabaseServer();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

    if (profile?.role !== "teacher") {
        return NextResponse.json({ error: "Forbidden (teacher only)" }, { status: 403 });
    }

    const { data: tests, error } = await supabase
        .from("tests")
        .select("id, title, section")
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ tests: tests ?? [] });
}
