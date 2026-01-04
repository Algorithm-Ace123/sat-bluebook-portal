import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { calculateSectionScore } from "@/lib/scoring";

export async function POST(req: Request) {
    try {
        const supabase = supabaseServer();
        const body = await req.json();
        const { attemptId } = body;

        console.log(`[Submit Route] Processing attempt: ${attemptId}`);

        if (!attemptId) return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });

        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 1. Fetch attempt and assignment
        const { data: attempt, error: aErr } = await supabase
            .from("attempts")
            .select("*, assignments(*)")
            .eq("id", attemptId)
            .single();

        if (aErr || !attempt) {
            console.error(`[Submit Route] Attempt fetch error:`, aErr);
            return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
        }
        if (attempt.status === "submitted") return NextResponse.json({ error: "Attempt already submitted" }, { status: 400 });

        const assignment = attempt.assignments;
        const testId = assignment.test_id;

        // 2. Fetch test JSON
        const { data: test, error: tErr } = await supabase
            .from("tests")
            .select("json")
            .eq("id", testId)
            .single();

        if (tErr || !test) {
            console.error(`[Submit Route] Test fetch error:`, tErr);
            return NextResponse.json({ error: "Test not found" }, { status: 404 });
        }
        const testJson = test.json;

        // 3. Fetch all saved answers for this attempt
        const { data: savedAnswers, error: saErr } = await supabase
            .from("attempt_answers")
            .select("*")
            .eq("attempt_id", attemptId);

        if (saErr) {
            console.error(`[Submit Route] Answers fetch error:`, saErr);
            return NextResponse.json({ error: saErr.message }, { status: 400 });
        }

        const bodAnswers = body.answers || {};

        const answersMap = new Map();
        // First, load from DB
        (savedAnswers || []).forEach(row => {
            answersMap.set(row.question_id, row.answer);
        });
        // Then, override with body answers (the latest sync state from frontend)
        Object.entries(bodAnswers).forEach(([qid, ans]) => {
            answersMap.set(qid, ans);
        });

        // 4. Grading logic
        let totalCorrect = 0;
        let totalItems = 0;
        const gradingOperations: any[] = [];

        // Track module-level performance for scaling
        const modScores: { correct: number; total: number }[] = [];

        testJson.modules.forEach((mod: any, modIdx: number) => {
            let modCorrect = 0;
            let modTotal = 0;

            (mod.items || []).forEach((item: any, itemIdx: number) => {
                totalItems++;
                modTotal++;

                // Fallback ID logic consistent with TestRunner
                const qid = item.id != null ? String(item.id) : `qidx:${modIdx}:${itemIdx}`;

                const studentAns = answersMap.get(qid);
                let isCorrect = false;

                if (studentAns) {
                    if (item.kind === "mcq") {
                        if (studentAns.choiceId === item.answer?.correct) {
                            isCorrect = true;
                        }
                    } else if (item.kind === "frq_math") {
                        const val = String(studentAns.value || "").trim();
                        const accepted = item.answer?.accepted || [];

                        for (const acc of accepted) {
                            if (acc.type === "exact") {
                                if (val === acc.value) isCorrect = true;
                            } else if (acc.type === "numeric") {
                                const numVal = parseFloat(val);
                                if (!isNaN(numVal) && numVal === acc.value) isCorrect = true;
                            } else if (acc.type === "fraction") {
                                if (val === acc.value) isCorrect = true;
                            }
                        }
                    }
                }

                if (isCorrect) {
                    totalCorrect++;
                    modCorrect++;
                }

                // Prepare upsert for attempt_answers
                gradingOperations.push({
                    attempt_id: attemptId,
                    question_id: qid,
                    answer: studentAns || {}, // Fix: Use empty object if no answer exists to avoid NOT NULL constraint
                    is_correct: isCorrect
                });
            });
            modScores.push({ correct: modCorrect, total: modTotal });
        });

        // 5. Calculate Scaled Scores (SAT Guidelines)
        const rwScaled = calculateSectionScore(
            modScores[0]?.correct ?? 0, modScores[0]?.total ?? 0,
            modScores[1]?.correct ?? 0, modScores[1]?.total ?? 0,
            "RW"
        );
        const mathScaled = calculateSectionScore(
            modScores[2]?.correct ?? 0, modScores[2]?.total ?? 0,
            modScores[3]?.correct ?? 0, modScores[3]?.total ?? 0,
            "MATH"
        );
        const compositeScore = rwScaled + mathScaled;

        // 6. Atomic Update: Set is_correct for all answers
        const { error: gradeErr } = await supabase
            .from("attempt_answers")
            .upsert(gradingOperations);

        if (gradeErr) {
            console.error(`[Submit Route] Grading upsert error:`, gradeErr);
            return NextResponse.json({ error: gradeErr.message }, { status: 400 });
        }

        // 7. Finalize attempt
        const { error: finalErr } = await supabase
            .from("attempts")
            .update({
                status: "submitted",
                score: totalCorrect,
                max_score: totalItems,
                submitted_at: new Date().toISOString()
            })
            .eq("id", attemptId);

        if (finalErr) {
            console.error(`[Submit Route] Attempt finalize error:`, finalErr);
            return NextResponse.json({ error: finalErr.message }, { status: 400 });
        }

        console.log(`[Submit Route] Successfully submitted attempt ${attemptId}. Final Score: ${compositeScore}`);

        return NextResponse.json({
            ok: true,
            score: totalCorrect,
            maxScore: totalItems,
            scaledScore: compositeScore,
            rwScaled,
            mathScaled
        });
    } catch (err: any) {
        console.error(`[Submit Route] CRITICAL ERROR:`, err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
