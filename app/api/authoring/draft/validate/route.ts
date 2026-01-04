import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { AuthoringQuestionSchema } from "@/lib/authoring";

const MODULES = ["RW_M1", "RW_M2", "MATH_M1", "MATH_M2"] as const;

function one<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const draftId = url.searchParams.get("draftId");
    if (!draftId) return NextResponse.json({ error: "Missing draftId" }, { status: 400 });

    const issues: string[] = [];
    const counts: Record<string, number> = {};

    for (const mod of MODULES) {
        const { data, error } = await supabase
            .from("draft_test_questions")
            // !inner helps return object shape; we still unwrap safely
            .select("order_index, question_bank!inner(question)")
            .eq("draft_test_id", draftId)
            .eq("module", mod)
            .order("order_index", { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        counts[mod] = (data ?? []).length;

        for (const row of data ?? []) {
            const qb = one((row as any).question_bank);
            const question = qb?.question;

            if (!question) {
                issues.push(`Missing joined question in ${mod} (order ${(row as any).order_index + 1})`);
                continue;
            }

            const v = AuthoringQuestionSchema.safeParse(question);
            if (!v.success) {
                issues.push(`Invalid question in ${mod} (order ${(row as any).order_index + 1})`);
                continue;
            }

            const q = v.data;

            // image alt checks
            for (const b of q.stimulus) {
                if (b.type === "image" && (!b.alt || !b.alt.trim())) {
                    issues.push(`Image missing alt text in ${mod} (order ${(row as any).order_index + 1})`);
                }
            }

            // table alignment checks (extra safety; schema also validates)
            for (const b of q.stimulus) {
                if (b.type === "table") {
                    const cols = b.columns.length;
                    const bad = b.rows.some((r) => r.length !== cols);
                    if (bad) issues.push(`Table row length mismatch in ${mod} (order ${(row as any).order_index + 1})`);
                }
            }
        }
    }

    return NextResponse.json({ ok: issues.length === 0, counts, issues });
}
