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
        <div className="max-w-6xl mx-auto px-6 mt-12 space-y-12">

            {/* Filters & Module Performance Overview */}
            <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                <div className="flex-1 bg-white p-6 rounded-2xl border shadow-sm">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Module Accuracy</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {["RW Module 1", "RW Module 2", "Math Module 1", "Math Module 2"].map((name, i) => (
                            <div key={i} className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border">
                                <div className="text-[10px] font-bold text-slate-500 uppercase">{name}</div>
                                <div className="text-xl font-bold mt-1 text-slate-800">{modStats[i]?.correct ?? 0} / {modStats[i]?.total ?? 0}</div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-green-500 h-full" style={{ width: `${Math.round(((modStats[i]?.correct ?? 0) / Math.max(1, modStats[i]?.total ?? 1)) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border shadow-sm shrink-0 w-full lg:w-auto">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Filter Questions</div>
                    <div className="flex flex-wrap gap-2">
                        {["ALL", "CORRECT", "INCORRECT", "OMITTED"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${filter === f ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 hover:bg-slate-50"}`}
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
                    <div key={mod.id ?? modIdx} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-px bg-slate-200 flex-1" />
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">
                                {modIdx < 2 ? "Reading & Writing" : "Mathematics"} - Module {modIdx % 2 + 1}
                            </h2>
                            <div className="h-px bg-slate-200 flex-1" />
                        </div>

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
                                    className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[380px]"
                                >
                                    {/* Left pane: stimulus */}
                                    {hasStimulus && (
                                        <div className="w-full md:w-1/2 p-8 border-b md:border-b-0 md:border-r overflow-y-auto max-h-[650px] bg-white prose-sm prose-slate">
                                            <div className="mb-4 inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider">
                                                Question {itemIdx + 1}
                                            </div>
                                            <StimulusRender blocks={rwStimulus} />
                                        </div>
                                    )}

                                    {/* Right pane */}
                                    <div className={`flex flex-col p-8 bg-slate-50/30 ${hasStimulus ? "w-full md:w-1/2" : "w-full"}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            {!hasStimulus && (
                                                <div className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider self-start mr-4">
                                                    Question {itemIdx + 1}
                                                </div>
                                            )}
                                            <div className={!hasStimulus ? "ml-auto" : ""}>
                                                {isCorrect ? (
                                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-green-200">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                        Correct
                                                    </span>
                                                ) : isOmitted ? (
                                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-slate-300">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Omitted
                                                    </span>
                                                ) : (
                                                    <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-red-100">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        Incorrect
                                                    </span>
                                                )}
                                            </div>
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
                                                    const isAnswerKey = choice.id === item.answer?.correct;
                                                    
                                                    let isSelected = answer?.choiceId === choice.id;
                                                    let box = "border-slate-200 bg-white";
                                                    let badge: string | null = null;
                                                    let cursor = "";
                                                    let onClickHandler = undefined;

                                                    if (retrying[qid]) {
                                                        const rHistory = retryAnswers[qid] || {};
                                                        const hasTriedThis = choice.id in rHistory;
                                                        const isRight = rHistory[choice.id] === true;
                                                        const isWrong = rHistory[choice.id] === false;

                                                        if (retryStatus[qid] === "correct") {
                                                            if (isRight) {
                                                                box = "border-green-500 bg-green-50 ring-2 ring-green-500 ring-offset-1";
                                                                badge = "Correct!";
                                                            } else if (isWrong) {
                                                                box = "border-red-300 bg-red-50/50 opacity-50";
                                                                badge = "Incorrect";
                                                            }
                                                        } else {
                                                            if (isWrong) {
                                                                box = "border-red-400 bg-red-50 opacity-60";
                                                                badge = "Incorrect";
                                                            } else {
                                                                box = "border-slate-300 bg-white hover:border-slate-400 hover:shadow-md cursor-pointer group";
                                                                onClickHandler = () => handleRetryMCQ(qid, choice.id, isAnswerKey);
                                                            }
                                                        }
                                                    } else {
                                                        // Static mode
                                                        if (isSelected) {
                                                            box = isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
                                                            badge = "Your Choice";
                                                        }
                                                        const canRevealMCQ = showSolutions && (isCorrect || revealAnswers[qid]);
                                                        if (canRevealMCQ && isAnswerKey) {
                                                            if (!isCorrect) {
                                                                box = "border-green-500 ring-2 ring-green-500 ring-offset-2 bg-white";
                                                                badge = "Correct Answer";
                                                            } else if (isSelected) {
                                                                badge = "Your Choice";
                                                            } else {
                                                                badge = "Correct Answer";
                                                            }
                                                        }
                                                    }

                                                    return (
                                                        <div key={choice.id} onClick={onClickHandler} className={`p-4 rounded-xl border-2 transition-all duration-200 relative ${box}`}>
                                                            <div className="flex items-start gap-4">
                                                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                                                                    retrying[qid] ? (
                                                                        retryStatus[qid] === "correct" && (retryAnswers[qid]||{})[choice.id] === true ? "bg-green-600 border-green-600 text-white" :
                                                                        (retryAnswers[qid]||{})[choice.id] === false ? "bg-red-500/50 border-red-500/50 text-white" :
                                                                        "border-slate-300 text-slate-500 group-hover:bg-slate-100"
                                                                    ) : (
                                                                        isSelected ? (isCorrect ? "bg-green-600 border-green-600 text-white" : "bg-red-600 border-red-600 text-white") : "border-slate-200 text-slate-400"
                                                                    )
                                                                }`}>
                                                                    {choice.id}
                                                                </div>
                                                                <div className="flex-1 pt-0.5 text-sm font-medium text-slate-700">
                                                                    {renderChoiceContent(choice)}
                                                                    {choice.image && <img src={choice.image.src || choice.image.url} alt={choice.image.alt || ""} className="mt-2 max-w-[200px]" />}
                                                                </div>
                                                            </div>
                                                            {badge && (
                                                                <div className={`absolute top-2 right-3 text-[9px] font-black uppercase tracking-widest ${(badge === "Correct Answer" || badge === "Correct!") ? "text-green-600" : (isCorrect || retrying[qid]) ? "text-red-500" : "text-red-600"}`}>
                                                                    {badge}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="space-y-4">
                                                    {retrying[qid] ? (
                                                        <div className={`p-6 rounded-xl border-2 transition ${retryStatus[qid] === 'correct' ? 'bg-green-50 border-green-500 ring-2 ring-green-500 ring-offset-2' : retryStatus[qid] === 'incorrect' ? 'bg-red-50 border-red-500 ring-2 ring-red-500 ring-offset-2' : 'bg-slate-50 border-slate-200'}`}>
                                                            <label className="text-[10px] font-black uppercase tracking-widest block mb-3 text-slate-600">Retry Mode: Enter your answer</label>
                                                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                                                                <input 
                                                                    type="text" 
                                                                    className="flex-1 bg-white border-2 border-slate-300 rounded-xl px-4 py-3 font-mono text-lg outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all font-bold text-slate-800"
                                                                    placeholder="Type your answer here..."
                                                                    defaultValue={retryAnswers[qid] || ""}
                                                                    disabled={retryStatus[qid] === "correct"}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleRetryFRQ(qid, (e.target as HTMLInputElement).value, item.answer?.accepted || []);
                                                                        }
                                                                    }}
                                                                />
                                                                {!retryStatus[qid] || retryStatus[qid] === "incorrect" ? (
                                                                    <button 
                                                                        onClick={() => {
                                                                            const input = document.activeElement as HTMLInputElement;
                                                                            if (input && input.tagName === 'INPUT') handleRetryFRQ(qid, input.value, item.answer?.accepted || []);
                                                                        }}
                                                                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2"
                                                                    >
                                                                        Submit
                                                                    </button>
                                                                ) : (
                                                                    <div className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 cursor-default shrink-0">
                                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                        Correct!
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {retryStatus[qid] === "incorrect" && <div className="mt-3 text-xs font-bold text-red-600">Incorrect. Try again!</div>}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="p-6 bg-slate-100 rounded-xl border border-slate-200">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                                                    Your Answer
                                                                </label>
                                                                <div className={`text-2xl font-mono font-bold ${isCorrect ? "text-green-600" : isOmitted ? "text-slate-500" : "text-red-600"}`}>
                                                                    {answer?.value || <span className="text-slate-400 italic font-sans text-sm">Omitted / No Answer</span>}
                                                                </div>
                                                            </div>

                                                            {showSolutions && (isCorrect || revealAnswers[qid]) && !isCorrect && Array.isArray(item.answer?.accepted) && (
                                                                <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                                                                    <label className="text-[10px] font-black text-green-600 uppercase tracking-widest block mb-2">
                                                                        Accepted Answer(s)
                                                                    </label>
                                                                    <div className="text-lg font-bold text-green-800 space-y-2">
                                                                        {item.answer.accepted.map((acc: any, i: number) => {
                                                                            const val = String(acc?.value ?? "");
                                                                            const frac = isFractionString(val) ? toFractionLatex(val) : null;
                                                                            return (
                                                                                <div key={i} className="flex items-center gap-2">
                                                                                    {frac ? <Latex latex={frac} /> : <span className="font-mono">{val}</span>}
                                                                                    {i < item.answer.accepted.length - 1 && <span className="text-slate-400 font-black text-xs uppercase">or</span>}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {!isCorrect && (
                                            <div className="mt-6 flex flex-wrap items-center gap-3">
                                                {!revealAnswers[qid] ? (
                                                    <>
                                                        <button onClick={() => {
                                                            setRetrying(prev => ({ ...prev, [qid]: !prev[qid] }));
                                                            if (!retrying[qid]) {
                                                                setRetryAnswers(prev => { const n={...prev}; delete n[qid]; return n; });
                                                                setRetryStatus(prev => { const n={...prev}; delete n[qid]; return n; });
                                                            }
                                                        }} className={`text-xs uppercase tracking-widest font-black flex items-center gap-2 transition px-4 py-2 rounded-lg border-2 ${retrying[qid] ? "text-red-500 border-red-100 bg-red-50/50 hover:bg-red-100" : "text-slate-500 border-slate-100 bg-slate-50 hover:bg-slate-100"}`}>
                                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                            {retrying[qid] ? "Give Up / Show Original Results" : "Retry This Question"}
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={() => {
                                                                setRevealAnswers(prev => ({ ...prev, [qid]: true }));
                                                                setRetrying(prev => ({ ...prev, [qid]: false }));
                                                            }}
                                                            className="text-xs uppercase tracking-widest font-black flex items-center gap-2 transition px-4 py-2 rounded-lg border-2 border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                                                        >
                                                            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            Show Answer
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                        <span className="text-[10px] uppercase font-black tracking-widest text-green-700">Answer Revealed</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        );
    }
