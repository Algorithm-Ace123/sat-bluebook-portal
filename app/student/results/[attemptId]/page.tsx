// app/student/results/[attemptId]/page.tsx
import { supabaseServer } from "@/lib/supabase";
import { notFound, redirect } from "next/navigation";
import StimulusRender from "@/components/StimulusRender";
import RichTextRender from "@/components/RichTextRender";
import katex from "katex";
import "katex/dist/katex.min.css";
import Link from "next/link";
import { calculateSectionScore, inferRoute, Route } from "@/lib/scoring";
import ResultsBreakdown from "@/components/ResultsBreakdown";

export const dynamic = "force-dynamic";

/**
 * FIXED RESULTS PAGE
 * 
 * Logic synchronized with lib/scoring.ts
 */

function Latex({ latex }: { latex: string }) {
    const html = katex.renderToString(latex, { throwOnError: false });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ---------- Gauge ----------
function SemicircleGauge({
    value,
    total,
    label,
    color
}: {
    value: number;
    total: number;
    label: string;
    color: string;
}) {
    const percentage = Math.min(100, Math.max(0, (value / total) * 100));
    const radius = 70;
    const circumference = Math.PI * radius; // half circle
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-40 h-24 overflow-hidden">
                <svg className="w-40 h-40 transform -rotate-180">
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        style={{ strokeDashoffset: 0 }}
                        strokeLinecap="round"
                    />
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 1s ease-out" }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
                    <div className="text-2xl font-black text-slate-800">{value}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1">{label}</div>
                </div>
            </div>
            <div className="text-xs font-bold text-slate-500 mt-2">Max: {total}</div>
        </div>
    );
}

// ---------- FRQ accepted rendering ----------
function isFractionString(v: string) {
    return /^\s*-?\d+\s*\/\s*\d+\s*$/.test(v);
}
function toFractionLatex(v: string) {
    const s = v.replace(/\s+/g, "");
    const neg = s.startsWith("-") ? "-" : "";
    const t = neg ? s.slice(1) : s;
    const [a, b] = t.split("/");
    if (!a || !b) return null;
    return `${neg}\\frac{${a}}{${b}}`;
}

// ---------- Getter Helpers ----------
function getRWStimulusBlocks(q: any): any[] {
    if (Array.isArray(q?.stimulus)) return q.stimulus;
    if (Array.isArray(q?.stimulus?.content)) return q.stimulus.content;
    return [];
}
function getPromptNodes(q: any): any[] {
    if (Array.isArray(q?.promptNodes)) return q.promptNodes;
    if (Array.isArray(q?.question?.prompt)) return q.question.prompt;
    return [];
}
function getPromptLatex(q: any): string | null {
    return (q?.promptLatex ?? q?.question?.promptLatex ?? null) as string | null;
}
function getPromptBlocks(q: any): any[] {
    if (Array.isArray(q?.promptBlocks)) return q.promptBlocks;
    if (Array.isArray(q?.question?.promptBlocks)) return q.question.promptBlocks;
    return [];
}
function getPromptText(q: any): string | null {
    return (q?.prompt ?? q?.question?.prompt ?? null) as string | null;
}

function renderChoiceContent(c: any) {
    if (Array.isArray(c?.content)) return <RichTextRender nodes={c.content} />;
    if (typeof c?.text === "string") return <div>{c.text}</div>;
    if (typeof c?.latex === "string" && c.latex.trim()) return <Latex latex={c.latex} />;
    return null;
}

export default async function ResultsPage({ params }: { params: { attemptId: string } }) {
    const supabase = await supabaseServer();
    const { attemptId } = params;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) redirect("/login");

    // 1) Attempt + assignment
    const { data: attempt } = await supabase
        .from("attempts")
        .select("*, assignments(*)")
        .eq("id", attemptId)
        .single();

    if (!attempt || attempt.student_id !== userData.user.id) notFound();
    if (attempt.status !== "submitted") redirect(`/test/${attemptId}`);

    const assignment = attempt.assignments;
    if (!assignment) notFound();
    const showSolutions = assignment.show_solutions ?? true;

    // 2) Test JSON
    const { data: test } = await supabase.from("tests").select("*").eq("id", assignment.test_id).single();
    if (!test) notFound();
    const testJson = test.json;

    // 3) Attempt answers
    const { data: answers } = await supabase.from("attempt_answers").select("*").eq("attempt_id", attemptId);
    const answersMap = new Map<string, any>();
    (answers || []).forEach((a: any) => answersMap.set(String(a.question_id), a));

    // ---- Module stats (raw correct) ----
    const modStats = (testJson.modules ?? []).map((mod: any, modIdx: number) => {
        let correct = 0;
        let total = 0;
        (mod.items ?? []).forEach((item: any, itemIdx: number) => {
            total += 1;
            const qid = item.id != null ? String(item.id) : `qidx:${modIdx}:${itemIdx}`;
            if (answersMap.get(qid)?.is_correct) correct += 1;
        });
        return { correct, total };
    });

    // Determine routes (easy/hard) from Module 2 labels or M1 performance
    const rwRoute: Route = inferRoute(testJson.modules?.[1], modStats[0]?.correct ?? 0, "RW");
    const mathRoute: Route = inferRoute(testJson.modules?.[3], modStats[2]?.correct ?? 0, "MATH");

    const rwRaw = (modStats[0]?.correct ?? 0) + (modStats[1]?.correct ?? 0);
    const mathRaw = (modStats[2]?.correct ?? 0) + (modStats[3]?.correct ?? 0);

    // Scaled scores
    const rwScaled = calculateSectionScore(
        modStats[0]?.correct ?? 0, modStats[0]?.total ?? 0,
        modStats[1]?.correct ?? 0, modStats[1]?.total ?? 0,
        "RW"
    );
    const mathScaled = calculateSectionScore(
        modStats[2]?.correct ?? 0, modStats[2]?.total ?? 0,
        modStats[3]?.correct ?? 0, modStats[3]?.total ?? 0,
        "MATH"
    );
    const totalScaled = rwScaled + mathScaled;

    const rwCorrectTotal = rwRaw;
    const rwItemsTotal = (modStats[0]?.total ?? 0) + (modStats[1]?.total ?? 0);
    const mathCorrectTotal = mathRaw;
    const mathItemsTotal = (modStats[2]?.total ?? 0) + (modStats[3]?.total ?? 0);

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 pb-32">
            {/* Top Navigation / Breadcrumb */}
            <nav className="bg-white/80 backdrop-blur-xl border-b sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-8 h-20 flex items-center justify-between">
                    <Link href="/student" className="group flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border flex items-center justify-center transition-transform group-hover:-translate-x-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        </div>
                        <span className="text-sm font-black uppercase tracking-widest">Dashboard</span>
                    </Link>
                    <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12">
                            {/* InlineLogo is dynamic imported in some places, but here we can just use the branding */}
                            <div className="text-white text-[10px] font-black tracking-tighter">Mock</div>
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tight">Practice Score Report</span>
                    </div>
                    <div className="w-32 hidden sm:block" />
                </div>
            </nav>

            {/* Score Report Hero */}
            <header className="bg-white border-b relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/3 opacity-80" />
                <div className="max-w-6xl mx-auto px-8 py-20 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-emerald-100">
                                Results Finalized
                            </div>
                            <h1 className="text-6xl font-black text-slate-900 tracking-tight leading-none mb-6">
                                Your Mock <span className="text-emerald-600">Performance.</span>
                            </h1>
                            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-lg">
                                Review your results for <strong>{testJson.title || "Standard Mock Test"}</strong>. Use these insights to target your preparation for your official SAT date.
                            </p>
                        </div>

                        <div className="shrink-0 flex items-end gap-1">
                            <span className="text-[140px] font-black text-slate-900 leading-none tracking-tighter">
                                {totalScaled}
                            </span>
                            <div className="flex flex-col items-start mb-6 ml-4">
                                <span className="text-xl font-black text-slate-300 uppercase tracking-[0.2em]">/ 1600</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Composite Score</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 rounded-[44px] p-12 border-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between group hover:border-blue-100 transition-all duration-500 gap-8 shadow-sm hover:shadow-xl hover:shadow-blue-900/5">
                            <div className="text-center sm:text-left">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Reading & Writing</h3>
                                <div className="text-8xl font-black text-slate-900 tracking-tighter group-hover:text-blue-600 transition-colors leading-none">{rwScaled}</div>
                                <div className="text-xs font-bold text-slate-500 mt-4 uppercase tracking-widest opacity-60">Route: {rwRoute.toUpperCase()}</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{rwCorrectTotal} / {rwItemsTotal} Correct</div>
                            </div>
                            <SemicircleGauge value={rwScaled} total={800} label="RW Points" color="#2563eb" />
                        </div>
                        <div className="bg-slate-50 rounded-[44px] p-12 border-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between group hover:border-emerald-100 transition-all duration-500 gap-8 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5">
                            <div className="text-center sm:text-left">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Mathematics</h3>
                                <div className="text-8xl font-black text-slate-900 tracking-tighter group-hover:text-emerald-600 transition-colors leading-none">{mathScaled}</div>
                                <div className="text-xs font-bold text-slate-500 mt-4 uppercase tracking-widest opacity-60">Route: {mathRoute.toUpperCase()}</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{mathCorrectTotal} / {mathItemsTotal} Correct</div>
                            </div>
                            <SemicircleGauge value={mathScaled} total={800} label="Math Points" color="#10b981" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Modules / Breakdown Component */}
            <main className="max-w-6xl mx-auto px-8 mt-24">
                <div className="flex items-center justify-between mb-12">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Modules Breakdown</h2>
                    <div className="h-px flex-1 bg-slate-200 mx-10 hidden sm:block opacity-50" />
                </div>
                <ResultsBreakdown
                    testJson={testJson}
                    answersMapList={Array.from(answersMap.entries())}
                    showSolutions={showSolutions}
                    modStats={modStats}
                    rwScaled={rwScaled}
                    mathScaled={mathScaled}
                />
            </main>
        </div>
    );
}
