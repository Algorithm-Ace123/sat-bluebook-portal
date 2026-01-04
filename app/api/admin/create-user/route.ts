import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "../../../../lib/supabase";

export async function POST(req: Request) {
    const supabase = await supabaseServer();

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

    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "");
    const password = String(body?.password ?? "");
    const fullName = String(body?.fullName ?? "");
    const role = String(body?.role ?? "student");

    if (!email || !password) {
        return NextResponse.json({ error: "Missing email/password" }, { status: 400 });
    }

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error || !data.user) {
        return NextResponse.json({ error: error?.message ?? "User creation failed" }, { status: 400 });
    }

    const { error: pErr } = await admin.from("profiles").upsert({
        id: data.user.id,
        role,
        full_name: fullName || email.split("@")[0]
    });

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, userId: data.user.id });
}
