import { supabaseServer } from "../../../lib/supabase";
import TestRunner from "../../../components/TestRunner";
import { redirect } from "next/navigation";

export default async function AttemptPage({ params }: { params: { attemptId: string } }) {
    const supabase = supabaseServer();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    // 1) Get attempt
    const { data: attempt, error: aErr } = await supabase
        .from("attempts")
        .select("id, assignment_id, status, student_id")
        .eq("id", params.attemptId)
        .maybeSingle();

    if (attempt?.status === "submitted") {
        redirect(`/student/results/${params.attemptId}`);
    }

    if (aErr || !attempt) {
        return (
            <div className="p-6">
                <div className="max-w-2xl mx-auto rounded-2xl bg-white border p-6">
                    <h1 className="text-xl font-semibold">Attempt not found</h1>
                    <p className="text-sm text-slate-600 mt-2">{aErr?.message ?? "No attempt row returned."}</p>
                </div>
            </div>
        );
    }

    // 2) Get assignment (to obtain test_id + timing)
    const { data: assignment, error: asErr } = await supabase
        .from("assignments")
        .select("id, test_id, timing")
        .eq("id", attempt.assignment_id)
        .maybeSingle();

    if (asErr || !assignment) {
        return (
            <div className="p-6">
                <div className="max-w-2xl mx-auto rounded-2xl bg-white border p-6">
                    <h1 className="text-xl font-semibold">Assignment not accessible</h1>
                    <p className="text-sm text-slate-600 mt-2">
                        {asErr?.message ?? "No assignment row returned. (Likely missing RLS policy for student read.)"}
                    </p>
                </div>
            </div>
        );
    }

    // 3) Get test JSON
    const { data: test, error: tErr } = await supabase
        .from("tests")
        .select("id, json")
        .eq("id", assignment.test_id)
        .maybeSingle();

    if (tErr || !test) {
        return (
            <div className="p-6">
                <div className="max-w-2xl mx-auto rounded-2xl bg-white border p-6">
                    <h1 className="text-xl font-semibold">Test not accessible</h1>
                    <p className="text-sm text-slate-600 mt-2">
                        {tErr?.message ?? "No test row returned. (Likely missing RLS policy for student test read.)"}
                    </p>
                    <p className="text-xs text-slate-500 mt-3">
                        If you’re a student, you should only be able to read tests assigned to you via assignments.
                    </p>
                </div>
            </div>
        );
    }

    return <TestRunner attemptId={params.attemptId} testJson={test.json} />;
}
