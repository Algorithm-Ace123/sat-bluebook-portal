// components/TestRunner.tsx
"use client";

/**
 * ✅ FUNCTIONAL BLUEBOOK RUNNER
 *
 * Requirements addressed:
 * 1) selection-based highlighting (3 colors + click highlight to edit)
 * 2) MCQ clicks + FRQ typing functional
 * 3) Removed Notes feature
 * 4) Option eliminator (ABC) fixed
 * 5) Fullscreen by default (no toggle button)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

import StimulusRender from "@/components/StimulusRender";
import RichTextRender from "@/components/RichTextRender";

import QuestionPopover from "@/components/QuestionPopover";
import DesmosPanel from "@/components/DesmosPanel";
import ReferencePanel from "@/components/ReferencePanel";

function Latex({ latex }: { latex: string }) {
    const html = useMemo(() => katex.renderToString(latex, { throwOnError: false }), [latex]);
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

/** FULL FRQ stimulus fallback (used only if FRQ JSON stimulus missing) */
const FRQ_FALLBACK_LEFT_BLOCKS: any[] = [
    { type: "heading", level: 2, content: [{ type: "text", text: "Student-produced response directions", marks: ["bold"] }] },
    { type: "paragraph", content: [{ type: "text", text: "• If you find more than one correct answer, enter only one answer." }] },
    {
        type: "paragraph",
        content: [
            { type: "text", text: "• You can enter up to " },
            { type: "text", text: "5 characters", marks: ["bold"] },
            { type: "text", text: " for a " },
            { type: "text", text: "positive", marks: ["bold"] },
            { type: "text", text: " answer and up to " },
            { type: "text", text: "6 characters", marks: ["bold"] },
            { type: "text", text: " (including the negative sign) for a " },
            { type: "text", text: "negative", marks: ["bold"] },
            { type: "text", text: " answer." }
        ]
    },
    {
        type: "paragraph",
        content: [
            { type: "text", text: "• If your answer is a " },
            { type: "text", text: "fraction", marks: ["bold"] },
            { type: "text", text: " that doesn’t fit in the provided space, enter the decimal equivalent." }
        ]
    },
    {
        type: "paragraph",
        content: [
            { type: "text", text: "• If your answer is a " },
            { type: "text", text: "decimal", marks: ["bold"] },
            { type: "text", text: " that doesn’t fit in the provided space, enter it by truncating or rounding at the fourth digit." }
        ]
    },
    {
        type: "paragraph",
        content: [
            { type: "text", text: "• If your answer is a " },
            { type: "text", text: "mixed number", marks: ["bold"] },
            { type: "text", text: " (such as " },
            { type: "math", latex: "3\\frac{1}{2}" },
            { type: "text", text: "), enter it as an improper fraction (" },
            { type: "math", latex: "\\frac{7}{2}" },
            { type: "text", text: ") or its decimal equivalent (3.5)." }
        ]
    },
    {
        type: "paragraph",
        content: [
            { type: "text", text: "• Don’t enter " },
            { type: "text", text: "symbols", marks: ["bold"] },
            { type: "text", text: " such as a percent sign, comma, or dollar sign." }
        ]
    },
    { type: "heading", level: 2, content: [{ type: "text", text: "Examples", marks: ["bold"] }] },
    {
        type: "table",
        columns: ["Answer", "Acceptable ways to enter answer", "Unacceptable: will NOT receive credit"],
        rows: [
            ["3.5", "3.5, 3.50, 7/2", "31/2, 3 1/2"],
            ["2/3", "2/3, .6666, .6667, 0.666, 0.667", "0.66, .66, 0.67, .67"],
            ["-1/3", "-1/3, -.3333, -0.333", "-.33, -0.33"]
        ]
    }
];

// ---------- getters ----------
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
function getRWStimulusBlocks(q: any): any[] {
    if (Array.isArray(q?.stimulus)) return q.stimulus;
    if (Array.isArray(q?.stimulus?.content)) return q.stimulus.content;
    return [];
}
function getFRQStimulusBlocks(q: any): any[] {
    if (Array.isArray(q?.stimulus) && q.stimulus.length > 0) return q.stimulus;
    if (Array.isArray(q?.stimulus?.content) && q.stimulus.content.length > 0) return q.stimulus.content;
    return FRQ_FALLBACK_LEFT_BLOCKS;
}
function renderChoiceContent(c: any) {
    if (Array.isArray(c?.content)) return <RichTextRender nodes={c.content} />;
    if (typeof c?.text === "string") return <div>{c.text}</div>;
    if (typeof c?.latex === "string" && c.latex.trim()) return <Latex latex={c.latex} />;
    return null;
}

// ---------- FRQ rules ----------
function sanitizeFrq(raw: string) {
    let v = raw.replace(/[^0-9./-]/g, "");
    v = v.replace(/(?!^)-/g, ""); // only leading minus

    const firstSlash = v.indexOf("/");
    if (firstSlash !== -1) v = v.slice(0, firstSlash + 1) + v.slice(firstSlash + 1).replace(/\//g, "");

    const slash = v.indexOf("/");
    if (slash === -1) {
        const dot = v.indexOf(".");
        if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
    } else {
        const left = v.slice(0, slash);
        const right = v.slice(slash + 1);
        const dl = left.indexOf(".");
        const dr = right.indexOf(".");
        const leftClean = dl === -1 ? left : left.slice(0, dl + 1) + left.slice(dl + 1).replace(/\./g, "");
        const rightClean = dr === -1 ? right : right.slice(0, dr + 1) + right.slice(dr + 1).replace(/\./g, "");
        v = leftClean + "/" + rightClean;
    }
    return v;
}
function frqCharLimitOk(v: string) {
    if (!v) return true;
    if (v.startsWith("-")) return v.length <= 6;
    return v.length <= 5;
}
function fractionPreviewLatex(v: string) {
    const s = v.trim();
    if (!s.includes("/")) return null;
    const [a, b] = s.split("/");
    if (!a || !b) return null;
    return `\\frac{${a}}{${b}}`;
}

// ---------- steps ----------
type Step =
    | { kind: "module"; label: string; timeLimitSec: number; moduleIndex: number; section: "RW" | "MATH" }
    | { kind: "break"; label: string; timeLimitSec: number };

function buildStepsFromTest(test: any): Step[] {
    const mods = test?.modules ?? [];
    const rw1 = mods[0]?.timeLimitSec ?? 32 * 60;
    const rw2 = mods[1]?.timeLimitSec ?? 32 * 60;
    const m1 = mods[2]?.timeLimitSec ?? 35 * 60;
    const m2 = mods[3]?.timeLimitSec ?? 35 * 60;
    return [
        { kind: "module", label: "Reading and Writing: Module 1", timeLimitSec: rw1, moduleIndex: 0, section: "RW" },
        { kind: "module", label: "Reading and Writing: Module 2", timeLimitSec: rw2, moduleIndex: 1, section: "RW" },
        { kind: "break", label: "Break", timeLimitSec: 10 * 60 },
        { kind: "module", label: "Math: Module 1", timeLimitSec: m1, moduleIndex: 2, section: "MATH" },
        { kind: "module", label: "Math: Module 2", timeLimitSec: m2, moduleIndex: 3, section: "MATH" }
    ];
}
function directionsText(section: "RW" | "MATH") {
    return section === "RW"
        ? "Directions: The questions in this section address reading and writing skills. Read each passage and question carefully, then choose the best answer."
        : "Directions: Solve each problem and choose the best answer. For student-produced response questions, enter your answer as instructed.";
}

// ---------- highlight types ----------
type HighlightColor = "yellow" | "green" | "blue";
type Highlight = { id: string; qid: string; blockIndex: number; text: string; color: HighlightColor };
type HighlightMap = Record<string, Highlight[]>;
type EliminatedMap = Record<string, Record<string, boolean>>;

export default function TestRunner({
    attemptId,
    testJson
}: {
    attemptId: string;
    testJson: any;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const test = testJson;

    const steps = useMemo(() => buildStepsFromTest(test), [test]);
    const [stepIndex, setStepIndex] = useState(0);
    const step = steps[stepIndex];

    const isFirstModule = useMemo(() => {
        const firstModIdx = steps.findIndex(s => s.kind === "module");
        return stepIndex === firstModIdx;
    }, [steps, stepIndex]);

    const activeSection: "RW" | "MATH" | null = step.kind === "module" ? step.section : null;
    const isMath = activeSection === "MATH";
    const isBreak = step.kind === "break";

    const moduleItems = useMemo(() => {
        if (step.kind !== "module") return [];
        return test?.modules?.[step.moduleIndex]?.items ?? [];
    }, [step, test]);

    const [qIndex, setQIndex] = useState(0);
    const q = step.kind === "module" ? moduleItems[qIndex] : null;
    const totalQs = moduleItems.length;

    const [remaining, setRemaining] = useState(step.timeLimitSec);

    const getQidForIndex = useCallback((idx: number) => {
        const item = moduleItems[idx];
        if (!item) return "";
        if (item.id != null) return String(item.id);
        const mIdx = step.kind === "module" ? step.moduleIndex : 0;
        return `qidx:${mIdx}:${idx}`;
    }, [moduleItems, step]);

    const qid = useMemo(() => getQidForIndex(qIndex), [getQidForIndex, qIndex]);

    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [marked, setMarked] = useState<Record<string, boolean>>({});

    const [showJump, setShowJump] = useState(false);
    const [showDirections, setShowDirections] = useState(true);

    // annotate/highlights
    const [hasStarted, setHasStarted] = useState(false);
    const [annotateMode, setAnnotateMode] = useState(false);
    const [highlights, setHighlights] = useState<HighlightMap>({});
    const [highlightPicker, setHighlightPicker] = useState<null | {
        qid: string;
        blockIndex: number;
        text: string;
        highlightId?: string;
        x: number;
        y: number;
    }>(null);
    const testAreaRef = useRef<HTMLDivElement | null>(null);

    // eliminator
    const [eliminateMode, setEliminateMode] = useState(false);
    const [eliminated, setEliminated] = useState<EliminatedMap>({});

    // panels
    const [showDesmosPanel, setShowDesmosPanel] = useState(false);
    const [showRefPanel, setShowRefPanel] = useState(false);

    const frqDebounceRef = useRef<number | null>(null);

    // reset per step
    useEffect(() => {
        setRemaining(step.timeLimitSec);
        setQIndex(0);
        setShowDirections(step.kind === "module");
        setShowJump(false);

        setAnnotateMode(false);
        setHighlightPicker(null);
        setEliminateMode(false);
        // Do not reset hasStarted here to show rules only at test start

        if (!(step.kind === "module" && step.section === "MATH")) {
            setShowDesmosPanel(false);
            setShowRefPanel(false);
        }
    }, [stepIndex, step.kind, step.timeLimitSec]);

    // timer tick
    useEffect(() => {
        const t = setInterval(() => {
            // Only tick if test has started OR if it's currently a break
            if (hasStarted || isBreak) {
                setRemaining((r) => Math.max(0, r - 1));
            }
        }, 1000);
        return () => clearInterval(t);
    }, [hasStarted, isBreak]);

    // auto advance on timeout
    useEffect(() => {
        if (remaining !== 0) return;
        const id = window.setTimeout(() => {
            if (stepIndex < steps.length - 1) {
                setStepIndex((i) => i + 1);
                setHasStarted(true); // Ensure test state is marked as started
            }
            else {
                // AUTO SUBMIT
                setIsSubmitting(true);
                fetch("/api/attempts/submit", {
                    method: "POST",
                    credentials: 'same-origin',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ attemptId })
                }).then(() => {
                    window.location.href = `/student/results/${attemptId}`;
                }).catch(() => {
                    setIsSubmitting(false);
                });
            }
        }, 600);
        return () => window.clearTimeout(id);
    }, [remaining, stepIndex, steps.length, attemptId]);

    const saveAnswer = useCallback(
        async (questionId: string, answer: any) => {
            setAnswers((prev) => ({ ...prev, [questionId]: answer }));
            if (!questionId) return;
            fetch("/api/attempts/save", {
                method: "POST",
                credentials: 'same-origin',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attemptId, questionId, answer, isCorrect: null })
            }).catch(() => { });
        },
        [attemptId]
    );

    const toggleMark = useCallback((questionId: string) => {
        setMarked((m) => ({ ...m, [questionId]: !m[questionId] }));
    }, []);

    // ✅ answered should turn BLUE only when actually answered
    const answeredSet = useMemo(() => {
        const s = new Set<number>();
        moduleItems.forEach((_: any, i: number) => {
            const id = getQidForIndex(i);
            const a = answers[id];
            if (!a) return;

            const it = moduleItems[i];
            if (it?.kind === "mcq") {
                if (a.choiceId != null) s.add(i);
            } else if (it?.kind === "frq_math") {
                if (String(a.value ?? "").trim().length > 0) s.add(i);
            } else {
                s.add(i);
            }
        });
        return s;
    }, [answers, moduleItems, getQidForIndex]);

    const markedSet = useMemo(() => {
        const s = new Set<number>();
        moduleItems.forEach((_: any, i: number) => {
            if (marked[getQidForIndex(i)]) s.add(i);
        });
        return s;
    }, [marked, getQidForIndex, moduleItems]);

    // module content
    const isLoadingQ = step.kind === "module" && (!q || totalQs === 0);
    const isFRQ = q?.kind === "frq_math";
    const useDualPane = !!q && (activeSection === "RW" || isFRQ);

    const rwStimulus = q && activeSection === "RW" ? getRWStimulusBlocks(q) : [];
    const frqStimulus = q && isFRQ ? getFRQStimulusBlocks(q) : [];
    const promptNodes = q ? getPromptNodes(q) : [];
    const promptLatex = q ? getPromptLatex(q) : null;
    const promptBlocks = q ? getPromptBlocks(q) : [];

    // eliminator helpers
    const isEliminated = (choiceId: string) => !!(qid && eliminated[qid]?.[choiceId]);
    const toggleEliminate = (choiceId: string) => {
        if (!qid) return;
        setEliminated((prev) => {
            const qmap = prev[qid] ?? {};
            return { ...prev, [qid]: { ...qmap, [choiceId]: !qmap[choiceId] } };
        });
    };

    // highlights per question id
    const qHighlights = useMemo(() => (qid ? highlights[qid] ?? [] : []), [highlights, qid]);

    const openHighlightEditor = (h: Highlight, x: number, y: number) => {
        if (!annotateMode) return;
        setHighlightPicker({
            qid: h.qid,
            blockIndex: h.blockIndex,
            text: h.text,
            highlightId: h.id,
            x: Math.min(window.innerWidth - 240, Math.max(12, x)),
            y: Math.max(12, y - 64)
        });
    };

    const applyHighlight = (color: HighlightColor) => {
        if (!highlightPicker) return;
        const { qid: hqid, blockIndex, text, highlightId } = highlightPicker;
        const id = highlightId ?? `${hqid}-${blockIndex}-${Date.now()}`;

        setHighlights((prev) => {
            const list = prev[hqid] ?? [];
            const next = highlightId
                ? list.map((hh) => (hh.id === highlightId ? { ...hh, color } : hh))
                : [...list, { id, qid: hqid, blockIndex, text, color }];
            return { ...prev, [hqid]: next };
        });

        setHighlightPicker(null);
    };

    // ✅ annotation selection handler: works in entire test area when annotateMode ON
    useEffect(() => {
        if (!annotateMode) return;
        if (!qid) return;

        const onMouseUp = () => {
            const container = testAreaRef.current;
            if (!container) return;

            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) return;

            const selectedText = sel.toString().trim();
            if (!selectedText || selectedText.length < 2) return;

            const range = sel.rangeCount ? sel.getRangeAt(0) : null;
            if (!range) return;

            const ancestor = range.commonAncestorContainer as any;
            const node = ancestor.nodeType === 3 ? ancestor.parentElement : ancestor;
            if (!node || !container.contains(node)) return;

            // ignore selections inside interactive tags
            const tag = (node as HTMLElement).tagName?.toLowerCase?.();
            if (tag === "button" || tag === "input" || tag === "textarea" || tag === "a") return;

            const host = (node as HTMLElement).closest?.("[data-blockindex]") as HTMLElement | null;
            if (!host) return;

            const blockIndex = Number(host.dataset.blockindex ?? -1);
            if (!Number.isFinite(blockIndex) || blockIndex < 0) return;

            const rect = range.getBoundingClientRect();
            setHighlightPicker({
                qid,
                blockIndex,
                text: selectedText,
                x: Math.min(window.innerWidth - 240, Math.max(12, rect.left)),
                y: Math.max(12, rect.top - 64)
            });

            // We do NOT clear ranges here if we want native selection to still show briefly,
            // but Bluebook usually clears it after annotation picker shows.
            sel.removeAllRanges();
        };

        window.addEventListener("mouseup", onMouseUp);
        return () => window.removeEventListener("mouseup", onMouseUp);
    }, [annotateMode, qid]);

    useEffect(() => {
        const handler = () => {
            if (hasStarted && !document.fullscreenElement) {
                // Persistent enforcement is tricky, but we hide escape UI
                setIsFullscreen(false);
            } else if (hasStarted && document.fullscreenElement) {
                setIsFullscreen(true);
            }
        };
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, [hasStarted]);

    function renderTextWithHighlights(text: string, blockIndex: number): React.ReactNode {
        const hs = qHighlights.filter((h) => h.blockIndex === blockIndex);
        if (hs.length === 0) return text;

        let parts: Array<React.ReactNode> = [text];

        hs.forEach((h) => {
            const newParts: Array<React.ReactNode> = [];
            parts.forEach((p) => {
                if (typeof p !== "string") return newParts.push(p);

                const idx = p.indexOf(h.text);
                if (idx === -1) return newParts.push(p);

                const before = p.slice(0, idx);
                const mid = p.slice(idx, idx + h.text.length);
                const after = p.slice(idx + h.text.length);

                if (before) newParts.push(before);

                const cls =
                    h.color === "yellow" ? "bg-yellow-200/90" : h.color === "green" ? "bg-emerald-200/90" : "bg-sky-200/90";

                newParts.push(
                    <span
                        key={h.id}
                        className={`${cls} rounded px-1 ${annotateMode ? "cursor-pointer" : ""}`}
                        onClick={(e) => {
                            if (!annotateMode) return;
                            e.stopPropagation();
                            openHighlightEditor(h, e.clientX, e.clientY);
                        }}
                    >
                        {mid}
                    </span>
                );

                if (after) newParts.push(after);
            });

            parts = newParts;
        });

        return parts;
    }

    const rightActionLabelStr =
        qIndex === totalQs - 1 ? (stepIndex === steps.length - 1 ? "Submit" : "End Module") : "Next";

    const onRightAction = async () => {
        if (qIndex < totalQs - 1) {
            setQIndex((i) => Math.min(totalQs - 1, i + 1));
            return;
        }

        if (stepIndex === steps.length - 1) {
            // SUBMIT TEST
            setIsSubmitting(true);
            try {
                // Determine if we need to flush a current FRQ
                let finalAnswers = { ...answers };
                if (q?.kind === "frq_math") {
                    const currentVal = (document.querySelector('input[inputmode="decimal"]') as HTMLInputElement)?.value;
                    if (currentVal !== undefined && qid) {
                        const sanitized = sanitizeFrq(currentVal);
                        finalAnswers[qid] = { value: sanitized };
                    }
                }

                const res = await fetch("/api/attempts/submit", {
                    method: "POST",
                    credentials: 'same-origin',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ attemptId, answers: finalAnswers })
                });
                if (res.ok) {
                    window.location.href = `/student/results/${attemptId}`;
                    return;
                } else {
                    const errorData = await res.json();
                    alert(`Submission failed: ${errorData.error || "Unknown error"}`);
                }
            } catch (err: any) {
                console.error("Submission failed", err);
                alert(`Submission error: ${err.message || "Please check your internet connection."}`);
            }
            setIsSubmitting(false);
            return;
        }

        setStepIndex((i) => Math.min(i + 1, steps.length - 1));
        setHasStarted(true);
    };

    const [isFullscreen, setIsFullscreen] = useState(false);
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => { });
            setIsFullscreen(false);
        }
    };

    // --- UI ---
    return (
        <div
            ref={testAreaRef}
            className={cx(
                "h-screen w-screen flex flex-col bg-white text-slate-900 overflow-hidden",
                annotateMode && "cursor-crosshair"
            )}
        >
            {isSubmitting && (
                <div className="fixed inset-0 z-[10000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <div className="text-xl font-bold text-slate-900">Finalizing your test...</div>
                    <div className="text-sm text-slate-500 mt-2">This may take a few seconds.</div>
                </div>
            )}

            {/* Global Fullscreen Enforcement Overlay */}
            {hasStarted && !isFullscreen && (
                <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mb-8 shadow-xl">
                        Pramana
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Fullscreen Required</h2>
                    <p className="text-xl text-slate-300 mb-12 max-w-md">
                        To continue your SAT mock exam, you must return to fullscreen mode.
                    </p>
                    <button
                        onClick={() => {
                            if (testAreaRef.current) {
                                testAreaRef.current.requestFullscreen().catch(() => { });
                                setIsFullscreen(true);
                            }
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-xl font-bold text-xl transition shadow-lg transform hover:scale-105"
                    >
                        Return to Fullscreen
                    </button>
                </div>
            )}

            {/* Rules Screen - ONLY for the very first module of the test */}
            {!hasStarted && isFirstModule && step.kind === "module" ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white">
                    <div className="max-w-2xl w-full px-8 py-12 text-center">
                        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-8 shadow-xl">
                            Pramana
                        </div>
                        <h1 className="text-3xl font-bold mb-4">{test.title || "Practice Test"}</h1>
                        <p className="text-xl text-slate-600 mb-12">Full Length SAT Mock</p>

                        <div className="grid grid-cols-2 gap-8 text-left mb-12">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <div className="font-bold">Timed Section</div>
                                    <div className="text-sm text-slate-500">This section is timed. The clock will show at the top.</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                    <div className="font-bold">Scratch Paper</div>
                                    <div className="text-sm text-slate-500">You can use scratch paper for all sections.</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </div>
                                <div>
                                    <div className="font-bold">Tools</div>
                                    <div className="text-sm text-slate-500">Use the built-in calculator, reference sheet, and more.</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <div className="font-bold">Auto-Save</div>
                                    <div className="text-sm text-slate-500">Your answers are automatically saved as you go.</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setHasStarted(true);
                                if (testAreaRef.current) {
                                    testAreaRef.current.requestFullscreen().catch(() => { });
                                    setIsFullscreen(true);
                                }
                            }}
                            className="w-full bg-blue-600 text-white rounded-xl py-5 text-xl font-bold hover:bg-blue-700 transition shadow-lg"
                        >
                            Start Section
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Break */}
                    {isBreak ? (
                        <div className="h-full w-full bg-black text-white flex flex-col">
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-[92vw] max-w-4xl flex gap-10 items-start">
                                    <div className="rounded-2xl border border-white/20 bg-white/10 p-6 w-[340px]">
                                        <div className="text-sm text-white/80">Remaining Break Time:</div>
                                        <div className="mt-3 text-5xl font-bold tabular-nums">{formatTime(remaining)}</div>
                                        <button
                                            onClick={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
                                            className="mt-6 w-full px-6 py-3 rounded-full bg-white/15 hover:bg-white/25 font-bold"
                                        >
                                            Skip break
                                        </button>
                                    </div>

                                    <div className="flex-1">
                                        <div className="text-2xl font-bold">Take a Break: Do Not Close Your Device</div>
                                        <div className="mt-2 text-sm text-white/80">After the break, you’ll return to the next section automatically.</div>

                                        <div className="mt-6 text-sm leading-relaxed text-white/90 space-y-2">
                                            <div>1. Do not exit or close your device.</div>
                                            <div>2. Do not open other apps or websites.</div>
                                            <div>3. Do not discuss test content.</div>
                                        </div>

                                        <button
                                            disabled={remaining !== 0}
                                            onClick={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
                                            className={cx(
                                                "mt-8 px-8 py-3 rounded-full font-bold",
                                                remaining === 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-white/20 text-white/60 cursor-not-allowed"
                                            )}
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="h-16 px-10 flex items-center justify-between text-white/70 text-sm">
                                <div>Pramana</div>
                                <div>{remaining === 0 ? "Break complete" : "Break in progress"}</div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {highlightPicker && (
                                <div
                                    className="fixed z-50 bg-white border shadow-xl rounded-xl px-4 py-3"
                                    style={{ left: highlightPicker.x, top: highlightPicker.y, width: 260 }}
                                >
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Highlight</div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => applyHighlight("yellow")} className="w-10 h-10 rounded-full bg-yellow-200 border-2 border-yellow-300 hover:scale-110 transition shrink-0" title="Yellow" />
                                        <button onClick={() => applyHighlight("green")} className="w-10 h-10 rounded-full bg-emerald-200 border-2 border-emerald-300 hover:scale-110 transition shrink-0" title="Green" />
                                        <button onClick={() => applyHighlight("blue")} className="w-10 h-10 rounded-full bg-sky-200 border-2 border-sky-300 hover:scale-110 transition shrink-0" title="Blue" />
                                        <button
                                            onClick={() => {
                                                if (highlightPicker.highlightId) {
                                                    setHighlights(prev => ({
                                                        ...prev,
                                                        [highlightPicker.qid]: (prev[highlightPicker.qid] || []).filter(h => h.id !== highlightPicker.highlightId)
                                                    }));
                                                }
                                                setHighlightPicker(null);
                                            }}
                                            className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center hover:bg-slate-200 hover:scale-110 transition shrink-0"
                                            title="Remove Highlight"
                                        >
                                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                        <button onClick={() => setHighlightPicker(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* top bar */}
                            <div className="flex-none px-8 pt-3 pb-3 border-b bg-white relative">
                                {/* center timer */}
                                <div className="absolute left-1/2 -translate-x-1/2 top-1.5 flex flex-col items-center">
                                    <div className="text-2xl font-bold tabular-nums">
                                        {formatTime(remaining)}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                        Pramana Full Length SAT Mock
                                    </div>
                                </div>

                                <div className="flex items-start justify-between">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-lg font-bold">{step.label}</div>

                                        <div className="relative">
                                            <button onClick={() => setShowDirections((v) => !v)} className="text-sm font-semibold text-slate-900 hover:text-blue-600">
                                                Directions ▾
                                            </button>

                                            {showDirections && activeSection && (
                                                <div className="absolute z-50 mt-2 w-[420px] max-w-[75vw] bg-white border shadow-xl rounded-xl p-4 text-sm text-slate-700">
                                                    <div className="font-bold text-slate-900 mb-2">Directions</div>
                                                    <div className="whitespace-pre-line">{directionsText(activeSection)}</div>
                                                    <button className="mt-3 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold" onClick={() => setShowDirections(false)}>
                                                        Close
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* right tools */}
                                    <div className="flex items-center gap-6">
                                        {!isMath && (
                                            <button
                                                onClick={() => {
                                                    setAnnotateMode((v) => !v);
                                                    setHighlightPicker(null);
                                                    setEliminateMode(false);
                                                }}
                                                className={cx(
                                                    "flex flex-col items-center gap-1 transition px-3 py-1 rounded-lg",
                                                    annotateMode ? "text-blue-600 bg-blue-50 ring-1 ring-blue-200 shadow-sm" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                                                )}
                                                title="Annotate"
                                            >
                                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 20h9" />
                                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                                </svg>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Annotate</span>
                                            </button>
                                        )}

                                        {isMath && (
                                            <>
                                                <button onClick={() => setShowRefPanel(true)} className="flex flex-col items-center gap-1 text-slate-600 hover:text-blue-600 transition">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Reference</span>
                                                </button>
                                                <button onClick={() => setShowDesmosPanel(true)} className="flex flex-col items-center gap-1 text-slate-600 hover:text-blue-600 transition">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Calculator</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* IMPORTANT: render QuestionPopover ONLY when open (prevents click blocking) */}
                            {showJump && (
                                <QuestionPopover
                                    open={true}
                                    onClose={() => setShowJump(false)}
                                    title={step.label}
                                    currentIndex={qIndex}
                                    total={totalQs}
                                    markedSet={markedSet}
                                    answeredSet={answeredSet}
                                    onJump={(i) => setQIndex(i)}
                                />
                            )}

                            {/* main */}
                            <div className="flex-1 overflow-hidden">
                                {isLoadingQ ? (
                                    <div className="h-full w-full flex items-center justify-center text-slate-600">Loading…</div>
                                ) : useDualPane ? (
                                    <div className="h-full flex">
                                        {/* left */}
                                        <div className="w-1/2 border-r-[4px] border-slate-100 h-full overflow-y-auto p-10">
                                            {isFRQ ? (
                                                <StimulusRender blocks={frqStimulus as any} variant="stimulus" isMath={isMath} />
                                            ) : (
                                                <div>
                                                    <div className="space-y-6">
                                                        {rwStimulus.map((b: any, i: number) => {
                                                            if (b.type === "heading") {
                                                                return (
                                                                    <div key={i} className="font-semibold">
                                                                        <RichTextRender nodes={b.content} />
                                                                    </div>
                                                                );
                                                            }

                                                            if (b.type === "paragraph") {
                                                                const textOnly =
                                                                    Array.isArray(b.content) &&
                                                                        b.content.length === 1 &&
                                                                        b.content[0]?.type === "text" &&
                                                                        typeof b.content[0]?.text === "string"
                                                                        ? b.content[0].text
                                                                        : null;

                                                                if (typeof textOnly === "string") {
                                                                    return (
                                                                        <p key={i} data-blockindex={i} className={cx("text-lg leading-relaxed font-serif", annotateMode && "select-text")}>
                                                                            {renderTextWithHighlights(textOnly, i)}
                                                                        </p>
                                                                    );
                                                                }

                                                                return (
                                                                    <p key={i} data-blockindex={i} className={cx("text-lg leading-relaxed font-serif", annotateMode && "select-text")}>
                                                                        <RichTextRender nodes={b.content} />
                                                                    </p>
                                                                );
                                                            }

                                                            return <StimulusRender key={i} blocks={[b]} variant="stimulus" isMath={isMath} />;
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* right */}
                                        <div className="w-1/2 h-full overflow-y-auto p-10 bg-slate-50/30">
                                            <QuestionPane
                                                q={q}
                                                qid={qid}
                                                qIndex={qIndex}
                                                promptNodes={promptNodes}
                                                promptLatex={promptLatex}
                                                promptBlocks={promptBlocks}
                                                answers={answers}
                                                marked={marked}
                                                currentMarkKey={qid}
                                                annotateMode={annotateMode}
                                                eliminateMode={eliminateMode}
                                                isEliminated={isEliminated}
                                                toggleEliminate={toggleEliminate}
                                                onToggleMark={toggleMark}
                                                onToggleEliminateMode={() => {
                                                    setEliminateMode((v) => !v);
                                                    setAnnotateMode(false);
                                                }}
                                                onSaveAnswer={saveAnswer}
                                                frqDebounceRef={frqDebounceRef}
                                                renderTextWithHighlights={renderTextWithHighlights}
                                                isMath={isMath}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    // math mcq single
                                    <div className="h-full overflow-y-auto p-10">
                                        <div className="max-w-4xl mx-auto">
                                            <QuestionPane
                                                q={q}
                                                qid={qid}
                                                qIndex={qIndex}
                                                promptNodes={promptNodes}
                                                promptLatex={promptLatex}
                                                promptBlocks={promptBlocks}
                                                answers={answers}
                                                marked={marked}
                                                currentMarkKey={qid}
                                                annotateMode={annotateMode}
                                                eliminateMode={eliminateMode}
                                                isEliminated={isEliminated}
                                                toggleEliminate={toggleEliminate}
                                                onToggleMark={toggleMark}
                                                onToggleEliminateMode={() => {
                                                    setEliminateMode((v) => !v);
                                                    setAnnotateMode(false);
                                                }}
                                                onSaveAnswer={saveAnswer}
                                                frqDebounceRef={frqDebounceRef}
                                                renderTextWithHighlights={renderTextWithHighlights}
                                                isMath={isMath}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* bottom strip (centered activator) */}
                            <div className="flex-none h-20 border-t bg-white px-8 flex items-center justify-between relative">
                                <div className="font-bold">Pramana</div>

                                {/* centered popover activator */}
                                <button
                                    onClick={() => setShowJump(true)}
                                    className="absolute left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-bold py-2.5 px-6 rounded-lg hover:bg-slate-800 flex items-center gap-2"
                                >
                                    Question {qIndex + 1} of {totalQs}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>

                                <div className="flex items-center gap-3">
                                    <button
                                        disabled={qIndex === 0}
                                        onClick={() => setQIndex((i) => Math.max(0, i - 1))}
                                        className="px-6 py-2.5 rounded-full border font-bold disabled:opacity-30"
                                    >
                                        Back
                                    </button>

                                    <button
                                        onClick={onRightAction}
                                        className={cx(
                                            "px-8 py-2.5 rounded-full text-white font-bold",
                                            qIndex === totalQs - 1 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
                                        )}
                                    >
                                        {rightActionLabelStr}
                                    </button>
                                </div>
                            </div>

                            <DesmosPanel open={isMath && showDesmosPanel} onClose={() => setShowDesmosPanel(false)} />
                            <ReferencePanel open={isMath && showRefPanel} onClose={() => setShowRefPanel(false)} />
                        </>
                    )}
                </>
            )}
        </div>
    );
}

// ---------- Right pane ----------
function QuestionPane({
    q,
    qid,
    qIndex,
    promptNodes,
    promptLatex,
    promptBlocks,
    answers,
    marked,
    currentMarkKey,
    annotateMode,
    eliminateMode,
    isEliminated,
    toggleEliminate,
    onToggleMark,
    onToggleEliminateMode,
    onSaveAnswer,
    frqDebounceRef,
    renderTextWithHighlights,
    isMath
}: {
    q: any;
    qid: string;
    qIndex: number;
    promptNodes: any[];
    promptLatex: string | null;
    promptBlocks: any[];
    answers: Record<string, any>;
    marked: Record<string, boolean>;
    currentMarkKey: string;
    annotateMode: boolean;
    eliminateMode: boolean;
    isEliminated: (choiceId: string) => boolean;
    toggleEliminate: (choiceId: string) => void;
    onToggleMark: (internalId: string) => void;
    onToggleEliminateMode: () => void;
    onSaveAnswer: (qid: string, ans: any) => Promise<void>;
    frqDebounceRef: React.MutableRefObject<number | null>;
    renderTextWithHighlights: (text: string, blockIndex: number) => React.ReactNode;
    isMath: boolean;
}) {
    const bookmarked = !!marked[currentMarkKey];
    const currentAnswer = qid ? answers[qid] : undefined;

    // FRQ
    const frqValue = String(currentAnswer?.value ?? "");
    const sanitized = sanitizeFrq(frqValue);
    const previewFrac = fractionPreviewLatex(sanitized);
    const withinLimit = frqCharLimitOk(sanitized);

    useEffect(() => {
        if (q.kind !== "frq_math") return;
        if (!qid) return;
        if (frqValue === sanitized) return;

        if (frqDebounceRef.current) window.clearTimeout(frqDebounceRef.current);
        frqDebounceRef.current = window.setTimeout(() => {
            onSaveAnswer(qid, { value: sanitized });
        }, 250);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [frqValue, sanitized, q.kind, qid]);

    return (
        <div>
            <div className="flex items-center justify-between mb-6 bg-slate-100 p-2 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-black text-white font-bold flex items-center justify-center text-sm rounded">
                        {qIndex + 1}
                    </div>

                    <button
                        type="button"
                        onClick={() => onToggleMark(qid)}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-black"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className={cx("w-5 h-5", bookmarked ? "fill-red-600 text-red-600" : "fill-none text-slate-800")}
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M6 3h12a1 1 0 011 1v17l-7-3-7 3V4a1 1 0 011-1z" />
                        </svg>
                        <span>Mark for Review</span>
                    </button>
                </div>

                {q.kind === "mcq" && (
                    <button
                        type="button"
                        onClick={onToggleEliminateMode}
                        className={cx(
                            "p-1 rounded font-bold border",
                            eliminateMode ? "bg-blue-600 text-white border-blue-600" : "text-slate-600 border-slate-300 hover:bg-slate-200"
                        )}
                        title="Eliminate choices"
                    >
                        <span className={cx(eliminateMode && "line-through decoration-2")}>ABC</span>
                    </button>
                )}
            </div>

            <div className="space-y-3 mb-6">
                {Array.isArray(promptNodes) && promptNodes.length > 0 && (
                    <div className="text-base" data-blockindex={100}>
                        {/* We use blockindex 100 for the main prompt to allow highlighting */}
                        {promptNodes.map((n, i) => {
                            if (n.type === "text" && typeof n.text === "string") {
                                return (
                                    <span key={i} className={cx(annotateMode && "select-text")}>
                                        {renderTextWithHighlights(n.text, 100)}
                                    </span>
                                );
                            }
                            return <RichTextRender key={i} nodes={[n]} />;
                        })}
                    </div>
                )}

                {promptLatex && (
                    <div className="text-lg">
                        <Latex latex={promptLatex} />
                    </div>
                )}

                {Array.isArray(promptBlocks) && promptBlocks.length > 0 && (
                    <StimulusRender blocks={promptBlocks as any} variant="prompt" isMath={isMath} />
                )}
            </div>

            {q.kind === "mcq" && (
                <div className="space-y-4">
                    {(q.choices ?? []).map((c: any, idx: number) => {
                        const selected = currentAnswer?.choiceId === c.id;
                        const letter = c.id ?? String.fromCharCode(65 + idx);
                        const eliminatedChoice = isEliminated(c.id);

                        return (
                            <div key={c.id} className="relative">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!qid) return;
                                        if (eliminateMode) {
                                            toggleEliminate(c.id);
                                            return;
                                        }
                                        onSaveAnswer(qid, { choiceId: c.id });
                                    }}
                                    className={cx(
                                        "w-full text-left p-4 rounded-xl border-2 transition group flex items-start gap-4 bg-white",
                                        selected ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <div
                                        className={cx(
                                            "w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 transition",
                                            selected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 text-slate-500"
                                        )}
                                    >
                                        {letter}
                                    </div>

                                    <div className="pt-1 text-base text-slate-800 font-medium relative flex-1">
                                        <div className={cx(eliminatedChoice && "text-slate-500")}>{renderChoiceContent(c)}</div>
                                        {eliminatedChoice && (
                                            <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-black/80 pointer-events-none" />
                                        )}
                                    </div>
                                </button>

                                {eliminatedChoice && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleEliminate(c.id);
                                        }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-sm font-semibold underline"
                                    >
                                        Undo
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {q.kind === "frq_math" && (
                <div className="space-y-4">
                    <div className="p-6 bg-slate-50 rounded-xl border space-y-3">
                        <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Student-Produced Response</label>

                        <input
                            value={sanitized}
                            onChange={(e) => {
                                if (!qid) return;
                                onSaveAnswer(qid, { value: sanitizeFrq(e.target.value) });
                            }}
                            className={cx(
                                "w-full text-2xl p-4 font-mono border-2 rounded-xl focus:outline-none",
                                withinLimit ? "border-slate-300 focus:border-blue-600" : "border-red-500 focus:border-red-600"
                            )}
                            placeholder="Type answer…"
                            inputMode="decimal"
                            autoComplete="off"
                            spellCheck={false}
                        />

                        <div className="flex items-center justify-between text-xs text-slate-600">
                            <div>Allowed: digits, decimal point, slash, and a leading negative sign.</div>
                            <div className={cx("font-semibold", withinLimit ? "text-slate-600" : "text-red-600")}>
                                {sanitized.length}/{sanitized.startsWith("-") ? 6 : 5}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-white rounded-xl border">
                        <div className="text-sm font-bold text-slate-700">Answer Preview</div>
                        <div className="mt-3 text-2xl">
                            {sanitized ? (
                                previewFrac ? (
                                    <Latex latex={previewFrac} />
                                ) : (
                                    <span className="font-mono">{sanitized}</span>
                                )
                            ) : (
                                <span className="text-slate-400">—</span>
                            )}
                        </div>
                        {!withinLimit && <div className="mt-2 text-xs text-red-600">Too many characters for Bluebook entry rules.</div>}
                    </div>
                </div>
            )}
        </div>
    );
}
