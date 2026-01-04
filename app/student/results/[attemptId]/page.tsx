// app/student/results/[attemptId]/page.tsx
import { supabaseServer } from "@/lib/supabase";
import { notFound, redirect } from "next/navigation";
import StimulusRender from "@/components/StimulusRender";
import RichTextRender from "@/components/RichTextRender";
import katex from "katex";
import "katex/dist/katex.min.css";
import Link from "next/link";
import { calculateSectionScore, inferRoute, Route } from "@/lib/scoring";

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

export default async function ResultsPage({ params }: { params: { attemptId: string } }) {
    const supabase = supabaseServer();
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

            {/* Modules */}
            <div className="max-w-6xl mx-auto px-6 mt-12 space-y-12">
                {(testJson.modules ?? []).map((mod: any, modIdx: number) => (
                    <div key={mod.id ?? modIdx} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-px bg-slate-200 flex-1" />
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">
                                {modIdx < 2 ? "Reading & Writing" : "Mathematics"} - Module {modIdx % 2 + 1}
                            </h2>
                            <div className="h-px bg-slate-200 flex-1" />
                        </div>

                        {(mod.items ?? []).map((item: any, itemIdx: number) => {
                            const qid = item.id != null ? String(item.id) : `qidx:${modIdx}:${itemIdx}`;
                            const studentData = answersMap.get(qid);
                            const answer = studentData?.answer;
                            const isCorrect = !!studentData?.is_correct;

                            // Prompt rendering (correct + complete)
                            const promptNodes = item.promptNodes;
                            const promptLatex = item.promptLatex;
                            const promptText = item.prompt;
                            const promptBlocks = item.promptBlocks;

                            return (
                                <div
                                    key={qid}
                                    className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[380px]"
                                >
                                    {/* Left pane: stimulus for RW / FRQ; for Math MCQ often empty */}
                                    <div className="w-full md:w-1/2 p-8 border-b md:border-b-0 md:border-r overflow-y-auto max-h-[650px] bg-white prose-sm prose-slate">
                                        <div className="mb-4 inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider">
                                            Question {itemIdx + 1}
                                        </div>

                                        {item.stimulus?.content?.length ? (
                                            <StimulusRender blocks={item.stimulus.content} />
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">No passage/stimulus for this question.</div>
                                        )}
                                    </div>

                                    {/* Right pane */}
                                    <div className="w-full md:w-1/2 p-8 bg-slate-50/30 flex flex-col">
                                        <div className="flex items-center justify-between mb-6">
                                            {isCorrect ? (
                                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-200">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Correct
                                                </span>
                                            ) : (
                                                <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-red-100">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Incorrect
                                                </span>
                                            )}
                                        </div>

                                        {/* Prompt + promptBlocks */}
                                        <div className="mb-6 space-y-3 text-slate-800">
                                            {Array.isArray(promptNodes) && promptNodes.length > 0 ? (
                                                <div className="text-base font-medium">
                                                    <RichTextRender nodes={promptNodes} />
                                                </div>
                                            ) : promptLatex ? (
                                                <div className="text-lg font-medium">
                                                    <Latex latex={promptLatex} />
                                                </div>
                                            ) : (
                                                <p className="text-base font-medium">{promptText}</p>
                                            )}

                                            {Array.isArray(promptBlocks) && promptBlocks.length > 0 && (
                                                <div className="bg-white rounded-xl border p-3">
                                                    <StimulusRender blocks={promptBlocks} variant="prompt" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Answers */}
                                        <div className="space-y-4">
                                            {item.kind === "mcq" ? (
                                                (item.choices ?? []).map((choice: any) => {
                                                    const isSelected = answer?.choiceId === choice.id;
                                                    const isAnswerKey = choice.id === item.answer?.correct;

                                                    // Base style
                                                    let box = "border-slate-200 bg-white";
                                                    let badge: string | null = null;

                                                    if (isSelected) {
                                                        box = isCorrect ? "border-emerald-500 bg-emerald-50" : "border-red-500 bg-red-50";
                                                        badge = "Your Choice";
                                                    }

                                                    if (showSolutions && isAnswerKey) {
                                                        // if incorrect, highlight correct answer too
                                                        if (!isCorrect) {
                                                            box = "border-emerald-500 ring-2 ring-emerald-500 ring-offset-2 bg-white";
                                                            badge = "Correct Answer";
                                                        } else if (isSelected) {
                                                            // your choice and correct
                                                            badge = "Your Choice";
                                                        } else {
                                                            badge = "Correct Answer";
                                                        }
                                                    }

                                                    return (
                                                        <div key={choice.id} className={`p-4 rounded-xl border-2 transition ${box} relative`}>
                                                            <div className="flex items-start gap-4">
                                                                <div
                                                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 ${isSelected
                                                                        ? (isCorrect ? "bg-emerald-600 border-emerald-600 text-white" : "bg-red-600 border-red-600 text-white")
                                                                        : "border-slate-200 text-slate-400"
                                                                        }`}
                                                                >
                                                                    {choice.id}
                                                                </div>
                                                                <div className="flex-1 pt-0.5 text-sm font-medium text-slate-700">
                                                                    {choice.content ? <RichTextRender nodes={choice.content} /> : choice.text}
                                                                </div>
                                                            </div>

                                                            {badge && (
                                                                <div
                                                                    className={`absolute top-2 right-3 text-[9px] font-black uppercase ${badge === "Correct Answer" ? "text-emerald-600" : isCorrect ? "text-emerald-600" : "text-red-600"
                                                                        }`}
                                                                >
                                                                    {badge}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="p-6 bg-slate-100 rounded-xl border border-slate-200">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                                            Your Answer
                                                        </label>
                                                        <div className={`text-2xl font-mono font-bold ${isCorrect ? "text-emerald-600" : "text-red-600"}`}>
                                                            {answer?.value || <span className="text-slate-300">No answer provided</span>}
                                                        </div>
                                                    </div>

                                                    {showSolutions && !isCorrect && Array.isArray(item.answer?.accepted) && (
                                                        <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200">
                                                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">
                                                                Accepted Answer(s)
                                                            </label>
                                                            <div className="text-lg font-bold text-emerald-800 space-y-2">
                                                                {item.answer.accepted.map((acc: any, i: number) => {
                                                                    const val = String(acc?.value ?? "");
                                                                    const frac = isFractionString(val) ? toFractionLatex(val) : null;
                                                                    return (
                                                                        <div key={i} className="flex items-center gap-2">
                                                                            {frac ? <Latex latex={frac} /> : <span className="font-mono">{val}</span>}
                                                                            {i < item.answer.accepted.length - 1 && (
                                                                                <span className="text-slate-400 font-black text-xs uppercase">or</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
