import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { TestJsonSchema } from "../../../../lib/schema";

export async function POST(req: Request) {
    const supabase = supabaseServer();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

    if (profile?.role !== "teacher") {
        return NextResponse.json({ error: "Forbidden (teacher only)" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.json) {
        return NextResponse.json({ error: "Missing 'json' in body" }, { status: 400 });
    }

    const v = TestJsonSchema.safeParse(body.json);
    if (!v.success) {
        return NextResponse.json(
            { error: "Invalid test JSON schema", details: v.error.format() },
            { status: 400 }
        );
    }

    const title = String(body.title || v.data.title);
    const section = v.data.section;

    const { error } = await supabase.from("tests").insert({
        title,
        section,
        json: v.data,
        created_by: userData.user.id
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
