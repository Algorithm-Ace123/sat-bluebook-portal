import Link from "next/link";
import dynamicImport from 'next/dynamic';
const LogoClient = dynamicImport(() => import('../../components/InlineLogo'), { ssr: false });
import { supabaseServer } from "../../lib/supabase";

export const dynamic = "force-dynamic";

import { calculateSectionScore } from "@/lib/scoring";

export default async function StudentPage() {
    let supabase: any;
    try {
        supabase = await supabaseServer();
    } catch (err) {
        console.error('Supabase init error in StudentPage:', err);
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-xl mx-auto rounded-2xl bg-white border p-6">
                    <h1 className="text-xl font-semibold">Service temporarily unavailable</h1>
                    <p className="text-sm text-slate-600 mt-2">We’re having trouble connecting to our backend. Please try again later.</p>
                </div>
            </div>
        );
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null; 

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", userData.user.id)
        .single();

    // If teacher logs in and hits /student, send them to /teacher
    if (profile?.role === "teacher") {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-xl mx-auto rounded-2xl bg-white border p-6">
                    <h1 className="text-xl font-semibold">Teacher account detected</h1>
                    <p className="text-sm text-slate-600 mt-2">
                        You’re logged in as a teacher. Use the teacher dashboard.
                    </p>
                    <div className="mt-4 flex gap-3">
                        <Link className="rounded-xl bg-slate-900 text-white px-4 py-2" href="/teacher">
                            Go to Teacher Dashboard
                        </Link>
                        <Link className="rounded-xl border px-4 py-2" href="/api/auth/logout">
                            Logout
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Fetch assignments targeted to this student
    const { data: targets, error } = await supabase
        .from("assignment_targets")
        .select("assignment_id, assignments(id, title, due_at, test_id, tests(json))")
        .eq("student_id", userData.user.id);

    // Fetch existing attempts + answers for scoring
    const { data: attempts } = await supabase
        .from("attempts")
        .select("*, attempt_answers(is_correct, question_id)")
        .eq("student_id", userData.user.id);

    const attemptsMap = new Map();
    (attempts || []).forEach((a: any) => attemptsMap.set(a.assignment_id, a));

    const getScaledScore = (attempt: any, testJson: any) => {
        if (!attempt || !testJson) return 400;

        const answersMap = new Map();
        (attempt.attempt_answers || []).forEach((a: any) => answersMap.set(a.question_id, a));

        const modStats = testJson.modules.map((mod: any, modIdx: number) => {
            let correct = 0;
            let total = 0;
            (mod.items || []).forEach((item: any, itemIdx: number) => {
                total++;
                const qid = item.id != null ? String(item.id) : `qidx:${modIdx}:${itemIdx}`;
                if (answersMap.get(qid)?.is_correct) correct++;
            });
            return { correct, total };
        });

        const rw = calculateSectionScore(
            modStats[0]?.correct ?? 0, modStats[0]?.total ?? 0,
            modStats[1]?.correct ?? 0, modStats[1]?.total ?? 0,
            "RW"
        );
        const math = calculateSectionScore(
            modStats[2]?.correct ?? 0, modStats[2]?.total ?? 0,
            modStats[3]?.correct ?? 0, modStats[3]?.total ?? 0,
            "MATH"
        );
        return rw + math;
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20">
            {/* Top Navigation */}
            <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LogoClient className="h-8" />
                        <span className="text-xl font-black text-slate-900 tracking-tight">Digital SAT</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-900">{profile?.full_name || "Student"}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mock Candidate</span>
                        </div>
                        <Link href="/api/auth/logout" className="rounded-xl border bg-white px-4 py-2 font-bold text-xs shadow-sm hover:bg-slate-50 transition text-slate-600">
                            Logout
                        </Link>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="bg-white border-b">
                <div className="max-w-6xl mx-auto px-6 py-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">My Assignments</h1>
                    <p className="text-lg text-slate-500 font-medium">Track your progress and launch your SAT mock exams.</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 mt-12">
                <div className="grid grid-cols-1 gap-6">
                    {error && (
                        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 font-bold">
                            {error.message}
                        </div>
                    )}

                    {targets?.length ? (
                        targets.map((t: any) => {
                            const attempt = attemptsMap.get(t.assignment_id);
                            const isSubmitted = attempt?.status === "submitted";
                            const weightedScore = isSubmitted ? getScaledScore(attempt, t.assignments?.tests?.json) : null;

                            return (
                                <div
                                    key={t.assignment_id}
                                    className="rounded-[32px] bg-white border border-slate-200 shadow-sm overflow-hidden p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 transition hover:shadow-xl hover:border-blue-100 group"
                                >
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className={cx(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                isSubmitted ? "bg-emerald-50 text-emerald-600 border-emerald-100" : (attempt ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100")
                                            )}>
                                                {isSubmitted ? "Completed" : (attempt ? "In Progress" : "Not Started")}
                                            </span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                {t.assignments?.due_at ? `Due ${new Date(t.assignments.due_at).toLocaleDateString()}` : "No Deadline"}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {t.assignments?.title}
                                        </h2>
                                    </div>

                                    {isSubmitted && (
                                        <div className="flex items-center gap-8 px-8 border-x border-slate-100 hidden lg:flex">
                                            <div className="text-center">
                                                <div className="text-3xl font-black text-slate-900 leading-tight">{weightedScore}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scaled Score</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-3xl font-black text-emerald-600 leading-tight">
                                                    {attempt.max_score > 0 ? Math.round((attempt.score / attempt.max_score) * 100) : 0}%
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precision</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="shrink-0">
                                        {isSubmitted ? (
                                            <Link
                                                href={`/student/results/${attempt.id}`}
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white px-8 py-4 font-bold hover:bg-slate-800 transition shadow-lg w-full md:w-auto"
                                            >
                                                View Detailed Results
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                            </Link>
                                        ) : (
                                            <form action="/api/attempts/start" method="post" className="w-full md:w-auto">
                                                <input type="hidden" name="assignmentId" value={t.assignment_id} />
                                                <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white px-8 py-4 font-bold hover:bg-blue-700 transition shadow-xl shadow-blue-200 w-full md:w-auto active:transform active:scale-95">
                                                    {attempt ? "Resume Mock Exam" : "Begin Mock Exam"}
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7M3 12h18" /></svg>
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-[32px] bg-white border border-dashed border-slate-300 p-20 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">No Assignments Yet</h3>
                            <p className="text-slate-500 mt-2">When your instructor assigns a test, it will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function cx(...parts: any[]) {
    return parts.filter(Boolean).join(" ");
}

