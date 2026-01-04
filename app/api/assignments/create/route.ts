import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { createClient } from "@supabase/supabase-js";

async function findUserIdByEmail(admin: any, email: string): Promise<string | null> {
    // MVP: scan users (works well for small cohorts)
    // Increase maxPages if you expect many users.
    const perPage = 200;
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw new Error(error.message);

        const users: any[] = data?.users ?? [];
        const match = users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
        if (match) return match.id;

        if (users.length < perPage) break; // no more pages
    }

    return null;
}

export async function POST(req: Request) {
    const supabase = supabaseServer();

    // Auth check
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Role check
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

    if (profile?.role !== "teacher") {
        return NextResponse.json({ error: "Forbidden (teacher only)" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);

    const testId = String(body?.testId ?? "");
    const title = String(body?.title ?? "Assignment");
    const dueAt = body?.dueAt ?? null;
    const timing = body?.timing ?? { totalTimeSec: 1800 };
    const students: string[] = Array.isArray(body?.students) ? body.students : [];
    const defaultPassword = String(body?.defaultPassword ?? "Pramana@123");

    if (!testId) return NextResponse.json({ error: "Missing testId" }, { status: 400 });
    if (!students.length) return NextResponse.json({ error: "No students provided" }, { status: 400 });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json(
            { error: "Missing SUPABASE_SERVICE_ROLE_KEY in env vars (required for creating users)" },
            { status: 500 }
        );
    }

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create assignment using teacher session (RLS-safe)
    const { data: assignment, error: aErr } = await supabase
        .from("assignments")
        .insert({
            test_id: testId,
            created_by: userData.user.id,
            title,
            due_at: dueAt,
            timing
        })
        .select("id")
        .single();

    if (aErr || !assignment) {
        return NextResponse.json({ error: aErr?.message ?? "Failed to create assignment" }, { status: 400 });
    }

    let assignedCount = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const rawEmail of students) {
        const email = String(rawEmail ?? "").trim().toLowerCase();
        if (!email) continue;

        try {
            let userId = await findUserIdByEmail(admin, email);

            // Create auth user if missing
            if (!userId) {
                const { data: created, error: cErr } = await admin.auth.admin.createUser({
                    email,
                    password: defaultPassword,
                    email_confirm: true
                });

                if (cErr || !created.user) throw new Error(cErr?.message ?? "User create failed");
                userId = created.user.id;
            }

            // Ensure profile exists
            const { error: pErr } = await admin.from("profiles").upsert({
                id: userId,
                role: "student",
                full_name: email.split("@")[0]
            });
            if (pErr) throw new Error(pErr.message);

            // Assign
            const { error: tErr } = await admin.from("assignment_targets").upsert({
                assignment_id: assignment.id,
                student_id: userId
            });
            if (tErr) throw new Error(tErr.message);

            assignedCount += 1;
        } catch (e: any) {
            failures.push({ email, error: e?.message ?? "Unknown error" });
        }
    }

    return NextResponse.json({
        ok: true,
        assignmentId: assignment.id,
        assignedCount,
        failures
    });
}
