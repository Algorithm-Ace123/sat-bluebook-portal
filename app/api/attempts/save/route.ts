import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";

export async function POST(req: Request) {
    const supabase = await supabaseServer();
    const { attemptId, questionId, answer, isCorrect } = await req.json();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
        .from("attempt_answers")
        .upsert({
            attempt_id: attemptId,
            question_id: questionId,
            answer: answer ?? {},
            is_correct: !!isCorrect
        });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
}
