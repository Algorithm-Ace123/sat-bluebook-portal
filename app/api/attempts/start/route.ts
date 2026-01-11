import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";

export async function POST(req: Request) {
    const supabase = await supabaseServer();

    const form = await req.formData();
    const assignmentId = String(form.get("assignmentId") || "");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log(`[/api/attempts/start] User detected: ${!!userData?.user}, Error: ${userError?.message || "none"}`);

    if (!userData.user) {
        console.warn("[/api/attempts/start] No user found, redirecting to /login");
        return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
    }

    // create attempt
    const { data: attempt, error } = await supabase
        .from("attempts")
        .insert({
            assignment_id: assignmentId,
            student_id: userData.user.id,
            status: "in_progress",
            started_at: new Date().toISOString()
        })
        .select("id")
        .single();

    if (error || !attempt) {
        return NextResponse.json({ error: error?.message ?? "Failed to create attempt" }, { status: 400 });
    }

    return NextResponse.redirect(new URL(`/test/${attempt.id}`, req.url));
}
