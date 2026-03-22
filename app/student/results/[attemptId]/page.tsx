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
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Nav */}
            <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/student" className="text-blue-600 font-bold hover:underline flex items-center gap-2 text-sm">
                        ← Back to Dashboard
                    </Link>
                    <div className="text-sm font-bold text-slate-500 truncate max-w-xs">{test.title}</div>
                    <div className="w-24" />
                </div>
            </div>

            {/* Header */}
            <div className="bg-white border-b overflow-hidden">
                <div className="max-w-6xl mx-auto px-6 py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
                            <h1 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Your Final Score</h1>
                            <div className="relative">
                                <span className="text-8xl font-black text-slate-900 leading-none">{totalScaled}</span>
                                <span className="absolute -bottom-2 -right-12 text-2xl font-black text-slate-300">/ 1600</span>
                            </div>
                            <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold self-center lg:self-start">
                                Mock Assessment Completed
                            </div>
                            <div className="text-xs text-slate-500">
                                RW route: <b>{rwRoute.toUpperCase()}</b> • Math route: <b>{mathRoute.toUpperCase()}</b>
                            </div>
                        </div>

                        <div className="lg:col-span-2 flex flex-col md:flex-row items-center justify-around bg-slate-50 rounded-[32px] p-10 border border-slate-100 gap-8">
                            <div className="flex flex-col items-center space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Reading & Writing</h3>
                                <SemicircleGauge value={rwScaled} total={800} label="Score" color="#3b82f6" />
                                <div className="text-sm font-medium text-slate-600">{rwCorrectTotal} / {rwItemsTotal} Correct</div>
                            </div>

                            <div className="w-px h-24 bg-slate-200 hidden md:block" />

                            <div className="flex flex-col items-center space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mathematics</h3>
                                <SemicircleGauge value={mathScaled} total={800} label="Score" color="#10b981" />
                                <div className="text-sm font-medium text-slate-600">{mathCorrectTotal} / {mathItemsTotal} Correct</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modules / Breakdown Component */}
            <ResultsBreakdown
                testJson={testJson}
                answersMapList={Array.from(answersMap.entries())}
                showSolutions={showSolutions}
                modStats={modStats}
                rwScaled={rwScaled}
                mathScaled={mathScaled}
            />
        </div>
    );
}
