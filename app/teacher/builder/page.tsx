// app/teacher/builder/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AuthoringQuestionSchema } from "@/lib/authoring";
import type { AuthoringQuestion, StimulusBlock, InlineNode, ModuleKey } from "@/lib/authoring";
import QuestionPreview from "@/components/QuestionPreview";
import StimulusRender from "@/components/StimulusRender";

const MODULES: Array<{ key: ModuleKey; label: string }> = [
    { key: "RW_M1", label: "RW Module 1" },
    { key: "RW_M2", label: "RW Module 2" },
    { key: "MATH_M1", label: "Math Module 1" },
    { key: "MATH_M2", label: "Math Module 2" }
];

function textNodes(text: string): InlineNode[] {
    return [{ type: "text", text, marks: [] }];
}

function defaultQuestion(kind: "mcq" | "frq_math"): AuthoringQuestion {
    if (kind === "mcq") {
        return {
            kind: "mcq",
            stimulus: [],
            question: { prompt: textNodes("Write the question prompt here…"), promptBlocks: [] },
            choices: [
                { id: "A", content: textNodes("Choice A") },
                { id: "B", content: textNodes("Choice B") },
                { id: "C", content: textNodes("Choice C") },
                { id: "D", content: textNodes("Choice D") }
            ],
            answer: { correct: "A" }
        };
    }
    return {
        kind: "frq_math",
        stimulus: [],
        question: { prompt: textNodes("Write the question prompt here…"), promptLatex: "x=?", promptBlocks: [] },
        answer: { accepted: [{ type: "exact", value: "1" }] }
    };
}

/**
 * Inline editor supports tokens:
 *   [[latex: x]]
 *   [[latex: \frac{8}{5}x + 2]]
 */
function parseInlineText(input: string): InlineNode[] {
    const nodes: InlineNode[] = [];
    const re = /\[\[latex:\s*([\s\S]*?)\s*\]\]/g;

    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(input)) !== null) {
        const before = input.slice(last, m.index);
        if (before) nodes.push({ type: "text", text: before, marks: [] });

        const latex = m[1];
        if (latex) nodes.push({ type: "math", latex });

        last = m.index + m[0].length;
    }

    const tail = input.slice(last);
    if (tail) nodes.push({ type: "text", text: tail, marks: [] });

    return nodes.length ? nodes : [{ type: "text", text: "", marks: [] }];
}

function inlineNodesToEditorString(nodes?: InlineNode[]) {
    if (!Array.isArray(nodes)) return "";
    return nodes.map((n) => (n.type === "text" ? n.text : `[[latex:${n.latex}]]`)).join("");
}

/** Legacy / loose block normalizer (spans -> content, math -> math_block) */
function normalizeStimulusBlocks(input: any): StimulusBlock[] {
    if (!Array.isArray(input)) return [];

    return input.map((b: any) => {
        if (!b || typeof b !== "object") {
            return { type: "paragraph", content: textNodes(String(b ?? "")) } as any;
        }

        // legacy heading/paragraph with spans
        if ((b.type === "heading" || b.type === "paragraph") && Array.isArray(b.spans)) {
            const txt = b.spans.map((s: any) => s?.text ?? "").join("");
            const marks = Array.isArray(b.spans?.[0]?.marks) ? b.spans[0].marks : [];
            return b.type === "heading"
                ? { type: "heading", level: b.level ?? 3, content: [{ type: "text", text: txt, marks }] }
                : { type: "paragraph", content: [{ type: "text", text: txt, marks }] };
        }

        if (b.type === "heading") {
            return { type: "heading", level: b.level ?? 3, content: Array.isArray(b.content) ? b.content : textNodes(String(b.text ?? "")) } as any;
        }

        if (b.type === "paragraph") {
            if (Array.isArray(b.content)) return { type: "paragraph", content: b.content } as any;
            if (typeof b.text === "string") return { type: "paragraph", content: textNodes(b.text) } as any;
            return { type: "paragraph", content: textNodes(String(b.text ?? "")) } as any;
        }

        if (b.type === "table") {
            return { type: "table", label: b.label, columns: b.columns ?? [], rows: b.rows ?? [] } as any;
        }

        if (b.type === "image") {
            return { type: "image", label: b.label, src: b.src, alt: b.alt ?? "image" } as any;
        }

        if (b.type === "math" || b.type === "math_block") {
            return { type: "math_block", label: b.label, latex: b.latex ?? "" } as any;
        }

        return { type: "paragraph", content: textNodes(JSON.stringify(b)) } as any;
    });
}

export default function BuilderPage() {
    const [draftId, setDraftId] = useState<string | null>(null);
    const [title, setTitle] = useState("Untitled Test");
    const [activeModule, setActiveModule] = useState<ModuleKey>("RW_M1");

    const [list, setList] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [kind, setKind] = useState<"mcq" | "frq_math">("mcq");
    const [q, setQ] = useState<AuthoringQuestion>(() => defaultQuestion("mcq"));

    const [err, setErr] = useState<string | null>(null);

    // bootstrap
    useEffect(() => {
        (async () => {
            const r = await fetch("/api/authoring/draft/bootstrap", { method: "POST" });
            const j = await r.json();
            setDraftId(j.draftId);
            setTitle(j.title ?? "Untitled Test");
        })();
    }, []);

    // load module list
    useEffect(() => {
        if (!draftId) return;
        (async () => {
            const r = await fetch(`/api/authoring/draft/module?draftId=${draftId}&module=${activeModule}`);
            const j = await r.json();
            setList(j.items ?? []);
            setSelectedId(null);
        })();
    }, [draftId, activeModule]);

    function newQuestion() {
        setSelectedId(null);
        setErr(null);
        setQ(defaultQuestion(kind));
    }

    async function loadQuestion(id: string) {
        const r = await fetch(`/api/authoring/question/get?id=${id}`);
        const j = await r.json();
        setSelectedId(id);
        setErr(null);
        setKind(j.kind);
        setQ(j.question);
    }

    async function saveQuestion() {
        setErr(null);

        const v = AuthoringQuestionSchema.safeParse(q);
        if (!v.success) {
            setErr(JSON.stringify(v.error.format(), null, 2));
            return;
        }

        const payload = {
            id: selectedId,
            module: activeModule,
            kind,
            question: v.data,
            draftId
        };

        const r = await fetch("/api/authoring/question/upsert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const j = await r.json();
        if (!r.ok) {
            setErr(typeof j.details === "object" ? JSON.stringify(j.details, null, 2) : (j.error ?? "Save failed"));
            return;
        }

        const rr = await fetch(`/api/authoring/draft/module?draftId=${draftId}&module=${activeModule}`);
        const jj = await rr.json();
        setList(jj.items ?? []);
        setSelectedId(j.questionId);
    }

    async function finalizeTest() {
        if (!draftId) return;
        const r = await fetch("/api/authoring/draft/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftId, title })
        });
        const j = await r.json();
        if (!r.ok) {
            alert(j.error ?? "Finalize failed");
            return;
        }
        alert(`Finalized! Test saved. Test ID: ${j.testId}`);
    }

    // ---- Stimulus builder helpers ----
    function setStimulusJSON(text: string) {
        try {
            const obj = JSON.parse(text);
            const rawBlocks = Array.isArray(obj) ? obj : obj?.stimulus;
            if (!Array.isArray(rawBlocks)) {
                setErr("Stimulus JSON must be an array OR an object with a stimulus array.");
                return;
            }
            const normalized = normalizeStimulusBlocks(rawBlocks);
            setQ((prev) => ({ ...(prev as any), stimulus: normalized }));
            setErr(null);
        } catch {
            setErr("Stimulus JSON invalid (cannot parse).");
        }
    }

    function setPromptBlocksJSON(text: string) {
        try {
            const obj = JSON.parse(text);
            const rawBlocks = Array.isArray(obj) ? obj : obj?.promptBlocks;
            if (!Array.isArray(rawBlocks)) {
                setErr("PromptBlocks JSON must be an array OR an object with promptBlocks array.");
                return;
            }
            const normalized = normalizeStimulusBlocks(rawBlocks);
            setQ((prev) => ({ ...(prev as any), question: { ...(prev as any).question, promptBlocks: normalized } }));
            setErr(null);
        } catch {
            setErr("PromptBlocks JSON invalid (cannot parse).");
        }
    }

    const moduleTitle = MODULES.find((m) => m.key === activeModule)?.label ?? activeModule;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4">
                {/* Left */}
                <div className="col-span-12 lg:col-span-3 space-y-3">
                    <div className="rounded-2xl border bg-white p-4">
                        <div className="text-sm font-semibold">Draft Test</div>
                        <input className="mt-2 w-full rounded-xl border p-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
                        <button className="mt-3 w-full rounded-xl bg-slate-900 text-white py-2 text-sm" onClick={finalizeTest} disabled={!draftId}>
                            Finalize Test
                        </button>
                    </div>

                    <div className="rounded-2xl border bg-white p-4">
                        <div className="text-sm font-semibold">Modules</div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            {MODULES.map((m) => (
                                <button
                                    key={m.key}
                                    onClick={() => setActiveModule(m.key)}
                                    className={[
                                        "rounded-xl border px-3 py-2 text-xs",
                                        activeModule === m.key ? "bg-slate-900 text-white border-slate-900" : "bg-white"
                                    ].join(" ")}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">{moduleTitle}</div>
                            <button className="rounded-lg border px-2 py-1 text-xs" onClick={newQuestion}>
                                + New
                            </button>
                        </div>

                        <div className="mt-3 space-y-2 max-h-[55vh] overflow-auto">
                            {list.map((it) => (
                                <button
                                    key={it.id}
                                    onClick={() => loadQuestion(it.id)}
                                    className={[
                                        "w-full text-left rounded-xl border p-3 text-sm",
                                        selectedId === it.id ? "border-blue-500 bg-blue-50" : "bg-white"
                                    ].join(" ")}
                                >
                                    <div className="text-xs text-slate-500">{it.kind}</div>
                                    <div className="font-medium line-clamp-2">{it.titlePreview ?? it.id}</div>
                                </button>
                            ))}
                            {!list.length && <div className="text-sm text-slate-500">No questions yet.</div>}
                        </div>
                    </div>
                </div>

                {/* Editor */}
                <div className="col-span-12 lg:col-span-5 space-y-3">
                    <div className="rounded-2xl border bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">Question Editor</div>
                            <div className="flex items-center gap-2">
                                <select
                                    className="rounded-xl border p-2 text-sm"
                                    value={kind}
                                    onChange={(e) => {
                                        const k = e.target.value as any;
                                        setKind(k);
                                        setQ(defaultQuestion(k));
                                        setSelectedId(null);
                                        setErr(null);
                                    }}
                                >
                                    <option value="mcq">MCQ</option>
                                    <option value="frq_math">Math FRQ</option>
                                </select>

                                <button className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm" onClick={saveQuestion}>
                                    Save
                                </button>
                            </div>
                        </div>

                        {err && (
                            <pre className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 overflow-auto">
                                {err}
                            </pre>
                        )}

                        <div className="mt-4 space-y-4">
                            {/* Stimulus (RW mostly) */}
                            <div className="rounded-xl border p-3">
                                <div className="text-sm font-semibold">Stimulus Blocks (RW usually)</div>
                                <textarea
                                    className="mt-2 w-full rounded-xl border p-3 font-mono text-xs h-40"
                                    value={JSON.stringify((q as any).stimulus ?? [], null, 2)}
                                    onChange={(e) => setStimulusJSON(e.target.value)}
                                />
                            </div>

                            {/* Prompt text (supports inline math tokens) */}
                            <div className="rounded-xl border p-3 space-y-2">
                                <div className="text-sm font-semibold">Prompt (supports inline math tokens)</div>
                                <textarea
                                    className="w-full rounded-xl border p-2 text-sm"
                                    value={inlineNodesToEditorString((q as any).question.prompt)}
                                    onChange={(e) =>
                                        setQ((prev) => ({
                                            ...(prev as any),
                                            question: { ...(prev as any).question, prompt: parseInlineText(e.target.value) }
                                        }))
                                    }
                                    placeholder='Use [[latex:x]] to insert inline math.'
                                />
                                <textarea
                                    className="w-full rounded-xl border p-2 text-sm font-mono"
                                    value={(q as any).question.promptLatex ?? ""}
                                    onChange={(e) =>
                                        setQ((prev) => ({
                                            ...(prev as any),
                                            question: { ...(prev as any).question, promptLatex: e.target.value }
                                        }))
                                    }
                                    placeholder="promptLatex (optional)"
                                />
                            </div>

                            {/* PromptBlocks (Math diagrams/tables belong here) */}
                            <div className="rounded-xl border p-3">
                                <div className="text-sm font-semibold">Prompt Blocks (Math diagrams/tables go here)</div>
                                <textarea
                                    className="mt-2 w-full rounded-xl border p-3 font-mono text-xs h-40"
                                    value={JSON.stringify((q as any).question.promptBlocks ?? [], null, 2)}
                                    onChange={(e) => setPromptBlocksJSON(e.target.value)}
                                />
                                <div className="text-xs text-slate-500 mt-2">
                                    Put tables/images here for Math MCQs and Math FRQs (right side). FRQ left directions are fixed by the runner.
                                </div>
                            </div>

                            {/* MCQ */}
                            {q.kind === "mcq" && (
                                <div className="rounded-xl border p-3 space-y-3">
                                    <div className="text-sm font-semibold">Choices (supports inline math tokens)</div>
                                    {(["A", "B", "C", "D"] as const).map((id) => {
                                        const c = (q as any).choices.find((x: any) => x.id === id);
                                        return (
                                            <div key={id} className="rounded-xl border p-3">
                                                <div className="font-semibold">{id}</div>
                                                <textarea
                                                    className="mt-2 w-full rounded-xl border p-2 text-sm"
                                                    value={inlineNodesToEditorString(c?.content)}
                                                    onChange={(e) => {
                                                        const next = parseInlineText(e.target.value);
                                                        setQ((prev) => {
                                                            if ((prev as any).kind !== "mcq") return prev as any;
                                                            const choices = (prev as any).choices.map((cc: any) =>
                                                                cc.id === id ? { ...cc, content: next } : cc
                                                            );
                                                            return { ...(prev as any), choices };
                                                        });
                                                    }}
                                                    placeholder='Use [[latex:...]] for inline math.'
                                                />
                                            </div>
                                        );
                                    })}

                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-semibold">Correct:</div>
                                        <select
                                            className="rounded-xl border p-2 text-sm"
                                            value={(q as any).answer.correct}
                                            onChange={(e) => setQ((prev) => prev.kind === "mcq" ? ({ ...(prev as any), answer: { correct: e.target.value as any } }) : prev)}
                                        >
                                            {(["A", "B", "C", "D"] as const).map((x) => <option key={x} value={x}>{x}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* FRQ */}
                            {q.kind === "frq_math" && (
                                <div className="rounded-xl border p-3 space-y-2">
                                    <div className="text-sm font-semibold">FRQ Accepted Answers</div>
                                    <textarea
                                        className="w-full rounded-xl border p-2 text-xs font-mono h-40"
                                        value={JSON.stringify((q as any).answer.accepted, null, 2)}
                                        onChange={(e) => {
                                            try {
                                                const accepted = JSON.parse(e.target.value);
                                                setQ((prev) => prev.kind === "frq_math" ? ({ ...(prev as any), answer: { accepted } }) : prev);
                                                setErr(null);
                                            } catch {
                                                setErr("Accepted JSON invalid.");
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="col-span-12 lg:col-span-4 space-y-3">
                    <QuestionPreview q={q} />
                    <div className="rounded-2xl border bg-white p-4">
                        <div className="text-sm font-semibold">Stimulus-only Preview</div>
                        <div className="mt-3 rounded-xl border p-3 bg-slate-50">
                            <StimulusRender blocks={(q as any).stimulus} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
