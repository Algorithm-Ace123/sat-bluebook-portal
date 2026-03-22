"use client";

import { useState, useEffect, useRef } from "react";
import StimulusRender from "@/components/StimulusRender";
import RichTextRender from "@/components/RichTextRender";
import katex from "katex";
import "katex/dist/katex.min.css";

function Latex({ latex }: { latex: string }) {
    const html = katex.renderToString(latex, { throwOnError: false });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
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

export default function ResultsBreakdown({
    testJson,
    answersMapList,
    showSolutions,
    modStats,
    rwScaled,
    mathScaled
}: {
    testJson: any;
    answersMapList: any[];
    showSolutions: boolean;
    modStats: any[];
    rwScaled: number;
    mathScaled: number;
}) {
    const answersMap = new Map<string, any>(answersMapList);

    const [filter, setFilter] = useState<"ALL" | "CORRECT" | "INCORRECT" | "OMITTED">("ALL");
    const [retrying, setRetrying] = useState<Record<string, boolean>>({});
    const [retryAnswers, setRetryAnswers] = useState<Record<string, any>>({});
    const [retryStatus, setRetryStatus] = useState<Record<string, "correct" | "incorrect">>({});
    const [revealAnswers, setRevealAnswers] = useState<Record<string, boolean>>({});

    const handleRetryMCQ = (qid: string, choiceId: string, isCorrectMatch: boolean) => {
        setRetryAnswers(prev => ({ ...prev, [qid]: { ...(prev[qid] || {}), [choiceId]: isCorrectMatch } }));
        if (isCorrectMatch) {
            setRetryStatus(prev => ({ ...prev, [qid]: "correct" }));
        }
    };

    const handleRetryFRQ = (qid: string, val: string, acceptedArgs: any[]) => {
        let isCorrectMatch = false;
        const v = String(val || "").trim();
        for (const acc of acceptedArgs) {
            if (acc.type === "exact" && v === acc.value) isCorrectMatch = true;
            else if (acc.type === "numeric") {
                const numVal = parseFloat(v);
                if (!isNaN(numVal) && numVal === acc.value) isCorrectMatch = true;
            } else if (acc.type === "fraction" && v === acc.value) isCorrectMatch = true;
        }
        setRetryAnswers(prev => ({ ...prev, [qid]: v }));
        setRetryStatus(prev => ({ ...prev, [qid]: isCorrectMatch ? "correct" : "incorrect" }));
    };

    return (
        <div className="max-w-6xl mx-auto space-y-16">

            {/* Filters & Module Performance Overview */}
            <div className="flex flex-col lg:flex-row gap-10 items-start">
                <div className="flex-1 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Section Accuracy</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {["RW M1", "RW M2", "Math M1", "Math M2"].map((name, i) => (
                            <div key={i} className="flex flex-col items-center bg-slate-50/50 p-5 rounded-3xl border border-slate-100 transition-colors hover:border-blue-100">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{name}</div>
                                <div className="text-2xl font-black mt-2 text-slate-900">{modStats[i]?.correct ?? 0} / {modStats[i]?.total ?? 0}</div>
                                <div className="w-full bg-slate-200/50 h-1.5 rounded-full mt-4 overflow-hidden">
                                    <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${Math.round(((modStats[i]?.correct ?? 0) / Math.max(1, modStats[i]?.total ?? 1)) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm shrink-0 w-full lg:w-auto">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Global Filter</div>
                    <div className="flex flex-wrap gap-3">
                        {["ALL", "CORRECT", "INCORRECT", "OMITTED"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-5 py-3 text-[10px] font-black rounded-2xl border-2 transition-all active:scale-95 ${filter === f ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200" : "bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50"}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Questions by Module */}
            {(testJson.modules ?? []).map((mod: any, modIdx: number) => {
                const moduleQuestions = (mod.items ?? []).map((item: any, itemIdx: number) => {
                    const qid = item.id != null ? String(item.id) : `qidx:${modIdx}:${itemIdx}`;
                    const studentData = answersMap.get(qid);
                    const answer = studentData?.answer;
                    const isCorrect = !!studentData?.is_correct;
                    const isOmitted = !answer || (item.kind === "mcq" ? !answer.choiceId : String(answer.value || "").trim() === "");
                    const isIncorrect = !isCorrect && !isOmitted;

                    return { item, itemIdx, qid, studentData, answer, isCorrect, isOmitted, isIncorrect };
                });

                const filteredQuestions = moduleQuestions.filter((q: any) => {
                    if (filter === "CORRECT") return q.isCorrect;
                    if (filter === "INCORRECT") return q.isIncorrect;
                    if (filter === "OMITTED") return q.isOmitted;
                    return true;
                });

                if (filteredQuestions.length === 0) return null;

                return (
                    <div key={mod.id ?? modIdx} className="space-y-10">
                        <div className="flex items-center gap-6">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">
                                {modIdx < 2 ? "RW Review" : "Math Review"} • Module {modIdx % 2 + 1}
                            </h2>
                            <div className="h-px bg-slate-200 flex-1 opacity-50" />
                        </div>

                        <div className="grid grid-cols-1 gap-10">
                            {filteredQuestions.map(({ item, itemIdx, qid, studentData, answer, isCorrect, isOmitted, isIncorrect }: any) => {
                                // Prompt rendering fallback
                                const promptNodes = getPromptNodes(item);
                                const promptLatex = getPromptLatex(item);
                                const promptText = getPromptText(item);
                                const promptBlocks = getPromptBlocks(item);

                                const rwStimulus = getRWStimulusBlocks(item);
                                const hasStimulus = item.kind !== "frq_math" && rwStimulus.length > 0;

                                return (
                                    <div
                                        key={qid}
                                        className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[450px] transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/5 group"
                                    >
                                        {/* Left pane: stimulus */}
                                        {hasStimulus && (
                                            <div className="w-full md:w-1/2 p-12 border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto max-h-[700px] bg-white prose-sm prose-slate selection:bg-blue-50">
                                                <div className="mb-6 inline-flex px-3 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    Item Case #{itemIdx + 1}
                                                </div>
                                                <div className="text-slate-900 leading-relaxed font-serif text-lg">
                                                    <StimulusRender blocks={rwStimulus} />
                                                </div>
                                            </div>
                                        )}

                                        {/* Right pane */}
                                        <div className={`flex flex-col p-12 bg-slate-50/20 ${hasStimulus ? "w-full md:w-1/2" : "w-full"}`}>
                                            <div className="flex items-center justify-between mb-10">
                                                {!hasStimulus && (
                                                    <div className="inline-flex px-3 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                        Item Case #{itemIdx + 1}
                                                    </div>
                                                )}
                                                <div className={!hasStimulus ? "ml-auto" : ""}>
                                                    {isCorrect ? (
                                                        <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border-2 border-emerald-100 shadow-sm shadow-emerald-50">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                            Correct
                                                        </span>
                                                    ) : isOmitted ? (
                                                        <span className="bg-slate-50 text-slate-500 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border-2 border-slate-100 shadow-sm">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            Omitted
                                                        </span>
                                                    ) : (
                                                        <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border-2 border-red-100 shadow-sm shadow-red-50">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            Incorrect
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Prompt */}
                                            <div className="mb-10 space-y-4">
                                                <div className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                                                    {Array.isArray(promptNodes) && promptNodes.length > 0 ? (
                                                        <RichTextRender nodes={promptNodes} />
                                                    ) : promptLatex ? (
                                                        <Latex latex={promptLatex} />
                                                    ) : (
                                                        promptText
                                                    )}
                                                </div>

                                                {Array.isArray(promptBlocks) && promptBlocks.length > 0 && (
                                                    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
                                                        <StimulusRender blocks={promptBlocks} variant="prompt" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Answers Area */}
                                            <div className="space-y-4 mb-auto">
                                                {item.kind === "mcq" ? (
                                                    (item.choices ?? []).map((choice: any) => {
                                                        const isAnswerKey = choice.id === item.answer?.correct;
                                                        
                                                        let isSelected = answer?.choiceId === choice.id;
                                                        let box = "border-slate-100 bg-white shadow-sm";
                                                        let badge: string | null = null;
                                                        let onClickHandler = undefined;

                                                        if (retrying[qid]) {
                                                            const rHistory = retryAnswers[qid] || {};
                                                            const hasTriedThis = choice.id in rHistory;
                                                            const isRight = rHistory[choice.id] === true;
                                                            const isWrong = rHistory[choice.id] === false;

                                                            if (retryStatus[qid] === "correct") {
                                                                if (isRight) {
                                                                    box = "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-50 shadow-xl";
                                                                    badge = "Verified Correct";
                                                                } else if (isWrong) {
                                                                    box = "border-red-100 bg-white opacity-40 grayscale pointer-events-none";
                                                                }
                                                            } else {
                                                                if (isWrong) {
                                                                    box = "border-red-500 bg-red-50 opacity-80 shadow-inner";
                                                                    badge = "Try Again";
                                                                } else {
                                                                    box = "border-slate-100 bg-white hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5 cursor-pointer group/choice active:scale-[0.99]";
                                                                    onClickHandler = () => handleRetryMCQ(qid, choice.id, isAnswerKey);
                                                                }
                                                            }
                                                        } else {
                                                            // Static mode
                                                            if (isSelected) {
                                                                box = isCorrect ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-50" : "border-red-500 bg-red-50 ring-4 ring-red-50";
                                                                badge = "Your Selection";
                                                            }
                                                            const canRevealMCQ = showSolutions && (isCorrect || revealAnswers[qid]);
                                                            if (canRevealMCQ && !isCorrect && isAnswerKey) {
                                                                box = "border-emerald-500 ring-4 ring-emerald-100/50 bg-white shadow-xl";
                                                                badge = "Key Answer";
                                                            }
                                                        }

                                                        return (
                                                            <div key={choice.id} onClick={onClickHandler} className={`p-6 rounded-3xl border-2 transition-all duration-300 relative ${box}`}>
                                                                <div className="flex items-start gap-5">
                                                                    <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center font-black text-sm shrink-0 transition-all ${
                                                                        retrying[qid] ? (
                                                                            retryStatus[qid] === "correct" && (retryAnswers[qid]||{})[choice.id] === true ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" :
                                                                            (retryAnswers[qid]||{})[choice.id] === false ? "bg-red-500 border-red-500 text-white" :
                                                                            "border-slate-200 text-slate-400 group-hover/choice:bg-blue-50 group-hover/choice:border-blue-200 group-hover/choice:text-blue-600"
                                                                        ) : (
                                                                            isSelected ? (isCorrect ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100") : "border-slate-100 text-slate-400"
                                                                        )
                                                                    }`}>
                                                                        {choice.id}
                                                                    </div>
                                                                    <div className="flex-1 pt-1.5 text-base font-bold text-slate-700 leading-relaxed">
                                                                        {renderChoiceContent(choice)}
                                                                        {choice.image && <img src={choice.image.src || choice.image.url} alt={choice.image.alt || ""} className="mt-4 rounded-2xl border border-slate-100 max-w-full" />}
                                                                    </div>
                                                                </div>
                                                                {badge && (
                                                                    <div className={`absolute top-3 right-6 text-[9px] font-black uppercase tracking-[0.2em] ${badge.includes("Correct") || badge.includes("Key") ? "text-emerald-600" : "text-red-500"}`}>
                                                                        {badge}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="space-y-6">
                                                        {retrying[qid] ? (
                                                            <div className={`p-10 rounded-[32px] border-2 transition-all duration-500 ${retryStatus[qid] === 'correct' ? 'bg-emerald-50 border-emerald-500 shadow-xl' : retryStatus[qid] === 'incorrect' ? 'bg-red-50 border-red-500' : 'bg-white border-slate-200 shadow-sm'}`}>
                                                                <label className="text-[10px] font-black uppercase tracking-[0.3em] block mb-5 text-slate-400">Response Console</label>
                                                                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                                                                    <input 
                                                                        type="text" 
                                                                        className="flex-1 bg-white border-2 border-slate-100 rounded-[20px] px-6 py-4 font-mono text-xl outline-none focus:border-blue-600 focus:ring-8 focus:ring-blue-100 transition-all font-black text-slate-900 shadow-sm"
                                                                        placeholder="Input Answer"
                                                                        defaultValue={retryAnswers[qid] || ""}
                                                                        disabled={retryStatus[qid] === "correct"}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                handleRetryFRQ(qid, (e.target as HTMLInputElement).value, item.answer?.accepted || []);
                                                                            }
                                                                        }}
                                                                    />
                                                                    {retryStatus[qid] !== "correct" ? (
                                                                        <button 
                                                                            onClick={() => {
                                                                                const input = (document.activeElement?.tagName === 'INPUT' ? document.activeElement : document.querySelector(`input[defaultValue]`)) as HTMLInputElement;
                                                                                if (input) handleRetryFRQ(qid, input.value, item.answer?.accepted || []);
                                                                            }}
                                                                            className="bg-slate-900 hover:bg-black text-white font-black px-10 py-4 rounded-[20px] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95"
                                                                        >
                                                                            Verify Answer
                                                                        </button>
                                                                    ) : (
                                                                        <div className="bg-emerald-600 text-white font-black px-10 py-4 rounded-[20px] flex items-center justify-center gap-3 cursor-default shadow-xl shadow-emerald-100">
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                                            Verified
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {retryStatus[qid] === "incorrect" && <div className="mt-4 text-[10px] font-black text-red-600 uppercase tracking-widest text-center">Inaccurate Response. Refine and retry.</div>}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-6">
                                                                <div className="p-10 bg-white rounded-[32px] border border-slate-100 shadow-sm">
                                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-4">
                                                                        Your Response
                                                                    </label>
                                                                    <div className={`text-4xl font-mono font-black ${isCorrect ? "text-emerald-600" : isOmitted ? "text-slate-300" : "text-red-500"}`}>
                                                                        {answer?.value || <span className="text-slate-200 italic font-sans text-lg tracking-tight">Omitted</span>}
                                                                    </div>
                                                                </div>

                                                                {showSolutions && (isCorrect || revealAnswers[qid]) && !isCorrect && Array.isArray(item.answer?.accepted) && (
                                                                    <div className="p-10 bg-emerald-50/50 rounded-[32px] border-2 border-emerald-100 shadow-inner">
                                                                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] block mb-5">
                                                                            Accepted Protocol(s)
                                                                        </label>
                                                                        <div className="text-2xl font-black text-emerald-800 flex flex-wrap gap-8">
                                                                            {item.answer.accepted.map((acc: any, i: number) => {
                                                                                const val = String(acc?.value ?? "");
                                                                                const frac = isFractionString(val) ? toFractionLatex(val) : null;
                                                                                return (
                                                                                    <div key={i} className="flex items-center gap-4">
                                                                                        {frac ? <Latex latex={frac} /> : <span className="font-mono">{val}</span>}
                                                                                        {i < item.answer.accepted.length - 1 && <span className="text-emerald-300 text-[10px] uppercase font-black tracking-widest">or</span>}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Action Bar */}
                                            {(!isCorrect || (isCorrect && retrying[qid])) && (
                                                <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-8">
                                                    {!revealAnswers[qid] ? (
                                                        <>
                                                            <button onClick={() => {
                                                                setRetrying(prev => ({ ...prev, [qid]: !prev[qid] }));
                                                                if (!retrying[qid]) {
                                                                    setRetryAnswers(prev => { const n={...prev}; delete n[qid]; return n; });
                                                                    setRetryStatus(prev => { const n={...prev}; delete n[qid]; return n; });
                                                                }
                                                            }} className={`text-[10px] uppercase tracking-widest font-black flex items-center gap-3 transition-all px-6 py-3 rounded-2xl border-2 active:scale-95 ${retrying[qid] ? "text-red-500 border-red-100 bg-red-50 hover:bg-red-100" : "text-slate-900 border-slate-900 bg-transparent hover:bg-slate-900 hover:text-white"}`}>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                                {retrying[qid] ? "Deactivate Retry" : "Simulate Retry"}
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={() => {
                                                                    setRevealAnswers(prev => ({ ...prev, [qid]: true }));
                                                                    setRetrying(prev => ({ ...prev, [qid]: false }));
                                                                }}
                                                                className="text-[10px] uppercase tracking-widest font-black flex items-center gap-3 transition-all px-6 py-3 rounded-2xl border-2 border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:shadow-lg hover:shadow-slate-100 active:scale-95"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                Reveal Answer
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-50 border-2 border-emerald-100 rounded-2xl">
                                                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600">Answer Analysis Decoded</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
