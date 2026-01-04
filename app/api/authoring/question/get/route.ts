import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data, error } = await supabase
        .from("question_bank")
        .select("id,module,kind,question")
        .eq("id", id)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: data.id, module: data.module, kind: data.kind, question: data.question });
}
