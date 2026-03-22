import Link from "next/link";
import dynamicImport from 'next/dynamic';
const LogoClient = dynamicImport(() => import('../../components/InlineLogo'), { ssr: false });
import { supabaseServer } from "../../lib/supabase";

export const dynamic = "force-dynamic";

import { calculateSectionScore } from "@/lib/scoring";
import StudentProgressCharts, { PulseCard } from "@/components/StudentProgressCharts";

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

    const getDetailedScores = (attempt: any, testJson: any) => {
        if (!attempt || !testJson) return { rw: 0, math: 0, total: 0 };

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
        return { rw, math, total: rw + math };
    };

    const getScaledScore = (attempt: any, testJson: any) => getDetailedScores(attempt, testJson).total;

    // Process Performance History
    const submittedAttempts = (attempts || [])
        .filter((a: any) => a.status === 'submitted')
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const history = submittedAttempts.map((a: any) => {
        const target = targets?.find((t: any) => t.assignment_id === a.assignment_id);
        const testJson = target?.assignments?.tests?.json;
        if (!testJson) return null;

        const scores = getDetailedScores(a, testJson);
        return {
            name: target.assignments.title,
            rw: scores.rw,
            math: scores.math,
            total: scores.total,
            date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
    }).filter((item: any): item is { name: string; rw: number; math: number; total: number; date: string } => !!item);

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    const getDelta = (curr: number, prev: number) => {
        if (!prev) return null;
        const diff = curr - prev;
        const trend: 'up' | 'down' | 'flat' = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
        return { diff, trend };
    };

    const rwDelta = latest && previous ? getDelta(latest.rw, previous.rw) : null;
    const mathDelta = latest && previous ? getDelta(latest.math, previous.math) : null;
    const totalDelta = latest && previous ? getDelta(latest.total, previous.total) : null;

    return (
        <div className="min-h-screen bg-slate-50 pb-32 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Top Navigation */}
            <nav className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center transition-all group-hover:rotate-12 shadow-lg shadow-slate-200">
                            <LogoClient className="h-6" />
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tight">Digital SAT</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-black text-slate-900">{profile?.full_name || "Practice Candidate"}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Tier</span>
                        </div>
                        <Link href="/api/auth/logout" className="rounded-2xl border-2 border-slate-100 bg-white px-5 py-2.5 font-bold text-xs shadow-sm hover:border-red-100 hover:text-red-500 transition-all text-slate-500 active:scale-95">
                            Logout
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="bg-white border-b overflow-hidden relative">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/2 opacity-70" />
                <div className="max-w-7xl mx-auto px-8 py-24 relative z-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                            Mock Ready
                        </div>
                        <h1 className="text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
                            Unlock Your <span className="text-blue-600">Potential.</span> Master the SAT.
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed mb-12 max-w-2xl">
                            Welcome back, {profile?.full_name?.split(' ')[0] || "Candidate"}. You have {targets?.length || 0} active mock exams to sharpen your skills and reach your target score.
                        </p>
                        
                        <div className="flex flex-wrap gap-12 items-center border-t border-slate-100 pt-10">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mocks Assigned</div>
                                <div className="text-4xl font-black text-slate-900">{targets?.length || 0}</div>
                            </div>
                            <div className="w-px h-12 bg-slate-100 hidden sm:block" />
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status: Completed</div>
                                <div className="text-4xl font-black text-emerald-600">{attempts?.filter((a:any)=>a.status==='submitted').length || 0}</div>
                            </div>
                            <div className="w-px h-12 bg-slate-100 hidden sm:block" />
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target Proficiency</div>
                                <div className="text-4xl font-black text-blue-600">
                                    {attempts?.length ? Math.round(attempts.reduce((acc: number, a: any) => acc + (a.max_score > 0 ? (a.score / a.max_score) : 0), 0) / attempts.length * 100) : 0}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 -mt-10 mb-20 relative z-20">
                {history.length > 0 && (
                    <div className="space-y-10">
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <PulseCard label="English Proficiency" score={latest?.rw || 200} delta={rwDelta} color="blue" />
                            <PulseCard label="Math Proficiency" score={latest?.math || 200} delta={mathDelta} color="purple" />
                            <PulseCard label="Total Performance" score={latest?.total || 400} delta={totalDelta} color="emerald" />
                        </section>

                        <section>
                            <StudentProgressCharts history={history} />
                        </section>
                    </div>
                )}
            </main>

            <main className="max-w-7xl mx-auto px-8 mt-16">
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Active Mock Exams</h2>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {targets?.length ? (
                        targets.map((t: any) => {
                            const attempt = attemptsMap.get(t.assignment_id);
                            const isSubmitted = attempt?.status === "submitted";
                            const weightedScore = isSubmitted ? getScaledScore(attempt, t.assignments?.tests?.json) : null;

                            return (
                                <div
                                    key={t.assignment_id}
                                    className="rounded-[40px] bg-white border border-slate-200 shadow-sm overflow-hidden p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 group"
                                >
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-4">
                                            <span className={cx(
                                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-colors",
                                                isSubmitted ? "bg-emerald-50 text-emerald-600 border-emerald-100" : (attempt ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100")
                                            )}>
                                                {isSubmitted ? "Completed" : (attempt ? "In Progress" : "Not Started")}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                {t.assignments?.due_at ? `Expires ${new Date(t.assignments.due_at).toLocaleDateString()}` : "Unlimited Access"}
                                            </span>
                                        </div>
                                        <h2 className="text-4xl font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                                            {t.assignments?.title}
                                        </h2>
                                        <p className="text-slate-500 font-medium">Digital Practice Assessment • Total Expected Time: 2h 14m</p>
                                    </div>

                                    {isSubmitted && (
                                        <div className="flex items-center gap-12 px-12 border-x border-slate-100 hidden xl:flex">
                                            <div className="text-center">
                                                <div className="text-6xl font-black text-slate-900 tracking-tighter leading-none mb-1">{weightedScore}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scaled Score</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-6xl font-black text-emerald-600 tracking-tighter leading-none mb-1">
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
                                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white px-10 py-5 font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 w-full lg:w-auto active:scale-95"
                                            >
                                                Review Report
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                            </Link>
                                        ) : (
                                            <form action="/api/attempts/start" method="post" className="w-full lg:w-auto">
                                                <input type="hidden" name="assignmentId" value={t.assignment_id} />
                                                <button className="inline-flex items-center justify-center gap-2 rounded-3xl bg-blue-600 text-white px-12 py-5 font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 w-full lg:w-auto active:scale-95 group/btn">
                                                    {attempt ? "Resume Exam" : "Launch Exam"}
                                                    <svg className="w-5 h-5 ml-1 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7M3 12h18" /></svg>
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-[48px] bg-white border-2 border-dashed border-slate-200 p-24 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mb-8 rotate-12 shadow-inner">
                                <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Active Mocks</h3>
                            <p className="text-slate-500 mt-2 font-medium">When your instructor assigns a new test, it will appear here instantly.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function cx(...parts: any[]) {
    return parts.filter(Boolean).join(" ");
}

