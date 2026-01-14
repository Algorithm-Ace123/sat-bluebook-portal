import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";

export async function POST(req: Request) {
    const supabase = await supabaseServer();

    let assignmentId = "";

    // Check Content-Type to determine how to parse body
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        const body = await req.json();
        assignmentId = String(body.assignmentId || "");
    } else {
        const form = await req.formData();
        assignmentId = String(form.get("assignmentId") || "");
    }

    // Diagnostics: content type and initial assignment
    console.log(`[/api/attempts/start] Request content-type: ${contentType}; assignmentId: ${assignmentId}`);

    // 1. Bearer Token Auth (Client-side fallback)
    const authHeader = req.headers.get("Authorization");
    console.log(`[/api/attempts/start] Authorization header present: ${!!authHeader}`);
    if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        console.log(`[/api/attempts/start] Bearer token (masked): ${token ? token.slice(0, 6) + '...' + token.slice(-6) : 'none'}`);
        // Manually set the session on the client using the token provided by the client-side
        // This bypasses any server-side cookie reading issues
        const { data: sData, error: sessionError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: "" // Not needed for single request validation typically, or client can send it
        });
        if (sessionError) console.warn("[/api/attempts/start] Bearer setSession warning:", sessionError.message);
        console.log(`[/api/attempts/start] setSession via Bearer -> user present: ${!!sData?.user}`);
    }

    // 2. Cookie Auth (Standard) + Brute Force fallback (from cookies)
    let { data: userData, error: userError } = await supabase.auth.getUser();
    console.log(`[/api/attempts/start] After getUser -> user present: ${!!userData?.user}, userId: ${userData?.user?.id ?? 'none'}`);

    // If still no user, try brute force from cookies manually (if header wasn't used)
    if (!userData.user && !authHeader) {
        try {
            const { cookies } = await import("next/headers");
            const cookieStore = cookies();
            const fallbackToken = cookieStore.get("sb-access-token")?.value;
            console.log(`[/api/attempts/start] fallbackToken present: ${!!fallbackToken}`);
            if (fallbackToken) {
                console.log("[/api/attempts/start] Attempting brute-force cookie recovery...");
                const { data: recovered } = await supabase.auth.setSession({
                    access_token: fallbackToken,
                    refresh_token: ""
                });
                console.log(`[/api/attempts/start] Brute force recovered user: ${!!recovered?.user}`);
                if (recovered.user) userData = recovered;
            }
        } catch (e) {
            console.error("Cookie read error", e);
        }
    }

    // If still no user, try brute force from cookies manually (if header wasn't used)
    if (!userData.user && !authHeader) {
        try {
            const { cookies } = await import("next/headers");
            const cookieStore = cookies();
            const fallbackToken = cookieStore.get("sb-access-token")?.value;
            if (fallbackToken) {
                console.log("[/api/attempts/start] Attempting brute-force cookie recovery...");
                const { data: recovered } = await supabase.auth.setSession({
                    access_token: fallbackToken,
                    refresh_token: ""
                });
                if (recovered.user) userData = recovered;
            }
        } catch (e) {
            console.error("Cookie read error", e);
        }
    }

    console.log(`[/api/attempts/start] User detected: ${!!userData?.user}, Assignment: ${assignmentId}`);

    if (!userData.user) {
        if (contentType.includes("application/json")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
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

    // Return JSON if requested, otherwise redirect
    if (contentType.includes("application/json")) {
        return NextResponse.json({ ok: true, attemptId: attempt.id, url: `/test/${attempt.id}` });
    }

    return NextResponse.redirect(new URL(`/test/${attempt.id}`, req.url));
}
