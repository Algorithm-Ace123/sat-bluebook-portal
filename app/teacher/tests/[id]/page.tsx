"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

import type { ModuleKey, AuthoringQuestion, InlineNode, StimulusBlock } from "@/lib/authoring";
import { AuthoringQuestionSchema } from "@/lib/authoring";

import QuestionPreview from "@/components/QuestionPreview";
import StimulusRender from "@/components/StimulusRender";

const MODULES: Array<{ key: ModuleKey; label: string }> = [
    { key: "RW_M1", label: "RW Module 1" },
    { key: "RW_M2", label: "RW Module 2" },
    { key: "MATH_M1", label: "Math Module 1" },
    { key: "MATH_M2", label: "Math Module 2" }
];

function makeTextNodes(s: string): InlineNode[] {
    return [{ type: "text", text: s, marks: [] }];
}

function defaultQuestion(kind: "mcq" | "frq_math"): AuthoringQuestion {
    if (kind === "mcq") {
        return {
            kind: "mcq",
            stimulus: [],
            question: { prompt: makeTextNodes(""), promptLatex: "", promptBlocks: [] },
            choices: [
                { id: "A", content: makeTextNodes("") },
                { id: "B", content: makeTextNodes("") },
                { id: "C", content: makeTextNodes("") },
                { id: "D", content: makeTextNodes("") }
            ],
            answer: { correct: "A" }
        };
    }
    return {
        kind: "frq_math",
        stimulus: [],
        question: { prompt: makeTextNodes(""), promptLatex: "", promptBlocks: [] },
        answer: { accepted: [{ type: "exact", value: "1" }] }
    };
}

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

export default function WorkspacePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const search = useSearchParams();
    const mode = search.get("mode");
    const draftId = params.id;

    const [title, setTitle] = useState("Untitled Test");
    const [status, setStatus] = useState<"draft" | "published">("draft");
    const [counts, setCounts] = useState<Record<string, number>>({});

    const [activeModule, setActiveModule] = useState<ModuleKey>("RW_M1");
    const [moduleItems, setModuleItems] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [kind, setKind] = useState<"mcq" | "frq_math">("mcq");
    const [q, setQ] = useState<AuthoringQuestion>(() => defaultQuestion("mcq"));
    const [err, setErr] = useState<string | null>(null);

    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState("");
    const [importErr, setImportErr] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            if (mode !== "published") return;
            const r = await fetch("/api/authoring/tests/duplicate_published", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ testId: draftId })
            });
            const j = await r.json();
            if (!r.ok) {
                alert(j.error ?? "Failed to duplicate");
                router.replace("/teacher/tests");
                return;
            }
            router.replace(`/teacher/tests/${j.draftId}`);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    async function loadDraftMeta() {
        const r = await fetch(`/api/authoring/tests/get?draftId=${draftId}`);
        const j = await r.json();
        if (!r.ok) {
            alert(j.error ?? "Failed to load draft");
            router.replace("/teacher/tests");
            return;
        }
        setTitle(j.draft.title);
        setStatus(j.draft.status);
        setCounts(j.counts ?? {});
    }

    async function loadModuleList(mod: ModuleKey) {
        const r = await fetch(`/api/authoring/draft/module?draftId=${draftId}&module=${mod}`);
        const j = await r.json();
        if (!r.ok) return alert(j.error ?? "Failed to load module");
        setModuleItems(j.items ?? []);
        setSelectedId(null);
    }

    async function loadQuestion(id: string) {
        const r = await fetch(`/api/authoring/question/get?id=${id}`);
        const j = await r.json();
        if (!r.ok) return alert(j.error ?? "Failed to load question");
        setSelectedId(j.id);
        setKind(j.kind);
        if (!j.question.question.promptBlocks) j.question.question.promptBlocks = [];
        setQ(j.question);
        setErr(null);
    }

    function newQuestion() {
        setSelectedId(null);
        setErr(null);
        setQ(defaultQuestion(kind));
    }

    async function saveQuestion() {
        setErr(null);

        const normalized: any = {
            ...q,
            question: { ...q.question, promptBlocks: Array.isArray(q.question.promptBlocks) ? q.question.promptBlocks : [] }
        };

        const v = AuthoringQuestionSchema.safeParse(normalized);
        if (!v.success) {
            setErr(JSON.stringify(v.error.format(), null, 2));
            return;
        }

        const payload = { id: selectedId, module: activeModule, kind, question: v.data, draftId };
        const r = await fetch("/api/authoring/question/upsert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const j = await r.json();
        if (!r.ok) {
            setErr(j.details ? JSON.stringify(j.details, null, 2) : (j.error ?? "Save failed"));
            return;
        }

        await loadDraftMeta();
        await loadModuleList(activeModule);
        setSelectedId(j.questionId);
    }

    async function removeFromDraft(questionId: string) {
        const ok = confirm("Remove this question from the draft?");
        if (!ok) return;

        const r = await fetch("/api/authoring/question/remove_from_draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftId, module: activeModule, questionId })
        });
        const j = await r.json();
        if (!r.ok) return alert(j.error ?? "Failed to remove");
        await loadDraftMeta();
        await loadModuleList(activeModule);
        if (selectedId === questionId) setSelectedId(null);
    }

    async function importJSON() {
        setImportErr(null);
        const r = await fetch("/api/authoring/question/import_json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftId, module: activeModule, rawJson: importText })
        });
        const j = await r.json();
        if (!r.ok) {
            setImportErr(j.error ?? "Import failed");
            return;
        }
        setShowImport(false);
        setImportText("");
        await loadDraftMeta();
        await loadModuleList(activeModule);
        await loadQuestion(j.questionId);
    }

    async function updateTitle() {
        const r = await fetch("/api/authoring/tests/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftId, title })
        });
        const j = await r.json();
        if (!r.ok) return alert(j.error ?? "Update failed");
        await loadDraftMeta();
    }

    useEffect(() => {
        (async () => {
            if (mode === "published") return;
            await loadDraftMeta();
            await loadModuleList(activeModule);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (mode === "published") return;
        loadModuleList(activeModule);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeModule]);

    function setStimulusBlocksJSON(val: string) {
        try {
            const arr = JSON.parse(val);
            if (!Array.isArray(arr)) throw new Error("stimulus must be array");
            setQ((prev) => ({ ...(prev as any), stimulus: arr as StimulusBlock[] }));
            setErr(null);
        } catch (e: any) {
            setErr(`Stimulus JSON invalid: ${e.message}`);
        }
    }

    function setPromptBlocksJSON(val: string) {
        try {
            const arr = JSON.parse(val);
            if (!Array.isArray(arr)) throw new Error("promptBlocks must be array");
            setQ((prev) => ({ ...(prev as any), question: { ...(prev as any).question, promptBlocks: arr as StimulusBlock[] } }));
            setErr(null);
        } catch (e: any) {
            setErr(`PromptBlocks JSON invalid: ${e.message}`);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-4">
                <div className="rounded-2xl border bg-white p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                            <div className="text-xs text-slate-500">Draft ID: {draftId}</div>
                            <div className="text-2xl font-semibold">Test Workspace</div>
                            <div className="text-sm text-slate-600">Status: {status}</div>
                        </div>
                        <button className="rounded-xl border px-4 py-2 text-sm" onClick={updateTitle}>
                            Save Title
                        </button>
                    </div>

                    <input className="mt-3 w-full rounded-xl border p-3 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MODULES.map((m) => (
                            <button
                                key={m.key}
                                onClick={() => setActiveModule(m.key)}
                                className={[
                                    "rounded-xl border px-3 py-2 text-xs text-left",
                                    activeModule === m.key ? "bg-slate-900 text-white border-slate-900" : "bg-white"
                                ].join(" ")}
                            >
                                <div className="font-semibold">{m.label}</div>
                                <div className="text-[11px] opacity-80">Questions: {counts[m.key] ?? 0}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                    {/* Left list */}
                    <div className="col-span-12 lg:col-span-4 space-y-3">
                        <div className="rounded-2xl border bg-white p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-lg font-semibold">{MODULES.find(m => m.key === activeModule)?.label}</div>
                                <div className="flex gap-2">
                                    <button className="rounded-lg border px-2 py-1 text-xs" onClick={newQuestion}>+ New</button>
                                    <button className="rounded-lg border px-2 py-1 text-xs" onClick={() => setShowImport(true)}>Import JSON</button>
                                </div>
                            </div>

                            <div className="mt-3 space-y-2 max-h-[60vh] overflow-auto">
                                {moduleItems.map((it: any, idx: number) => (
                                    <div key={it.id} className="rounded-xl border p-3 bg-white">
                                        <button onClick={() => loadQuestion(it.id)} className="w-full text-left">
                                            <div className="text-xs text-slate-500">{it.kind} • #{idx + 1}</div>
                                            <div className="font-medium line-clamp-2 mt-1">{it.titlePreview}</div>
                                        </button>
                                        <div className="mt-2 flex justify-end">
                                            <button className="rounded-lg border px-2 py-1 text-xs text-red-600" onClick={() => removeFromDraft(it.id)}>
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {showImport && (
                            <div className="rounded-2xl border bg-white p-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold">Import Question JSON</div>
                                    <button className="text-sm underline" onClick={() => { setShowImport(false); setImportErr(null); }}>
                                        Close
                                    </button>
                                </div>
                                <textarea className="mt-3 w-full rounded-xl border p-3 font-mono text-xs h-64" value={importText} onChange={(e) => setImportText(e.target.value)} />
                                {importErr && <div className="mt-2 text-sm text-red-600">{importErr}</div>}
                                <button className="mt-3 w-full rounded-xl bg-slate-900 text-white py-2 text-sm" onClick={importJSON}>
                                    Import into {activeModule}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Editor */}
                    <div className="col-span-12 lg:col-span-4 space-y-3">
                        <div className="rounded-2xl border bg-white p-4">
                            <div className="flex items-center justify-between">
                                <div className="text-lg font-semibold">Editor</div>
                                <div className="flex items-center gap-2">
                                    <select className="rounded-xl border p-2 text-sm" value={kind} onChange={(e) => {
                                        const k = e.target.value as any;
                                        setKind(k);
                                        setSelectedId(null);
                                        setQ(defaultQuestion(k));
                                        setErr(null);
                                    }}>
                                        <option value="mcq">MCQ</option>
                                        <option value="frq_math">Math FRQ</option>
                                    </select>
                                    <button className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm" onClick={saveQuestion}>Save</button>
                                </div>
                            </div>

                            {err && (
                                <pre className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 overflow-auto">
                                    {err}
                                </pre>
                            )}

                            <div className="mt-4 space-y-3">
                                <div className="text-sm font-semibold">Prompt (use [[latex:x]] for inline math)</div>
                                <textarea
                                    className="w-full rounded-xl border p-3 text-sm"
                                    value={inlineNodesToEditorString((q as any).question.prompt)}
                                    onChange={(e) => setQ((prev) => ({ ...(prev as any), question: { ...(prev as any).question, prompt: parseInlineText(e.target.value) } }))}
                                />

                                <div className="text-sm font-semibold">Prompt LaTeX (optional)</div>
                                <input
                                    className="w-full rounded-xl border p-2 text-sm font-mono"
                                    value={(q as any).question.promptLatex ?? ""}
                                    onChange={(e) => setQ((prev) => ({ ...(prev as any), question: { ...(prev as any).question, promptLatex: e.target.value } }))}
                                />

                                {/* ✅ RW stimulus editor */}
                                <div className="text-sm font-semibold">Stimulus (RW only)</div>
                                <textarea
                                    className="w-full rounded-xl border p-3 font-mono text-xs h-40"
                                    value={JSON.stringify((q as any).stimulus ?? [], null, 2)}
                                    onChange={(e) => setStimulusBlocksJSON(e.target.value)}
                                />

                                {/* ✅ promptBlocks editor for Math */}
                                <div className="text-sm font-semibold">Prompt Blocks (Math tables/graphs)</div>
                                <textarea
                                    className="w-full rounded-xl border p-3 font-mono text-xs h-40"
                                    value={JSON.stringify((q as any).question.promptBlocks ?? [], null, 2)}
                                    onChange={(e) => setPromptBlocksJSON(e.target.value)}
                                />

                                {q.kind === "mcq" && (
                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold">Choices</div>
                                        {(q as any).choices?.map((c: any) => (
                                            <div key={c.id} className="rounded-xl border p-3">
                                                <div className="font-semibold">{c.id}</div>
                                                <textarea
                                                    className="mt-2 w-full rounded-lg border p-2 text-sm"
                                                    value={inlineNodesToEditorString(c.content)}
                                                    onChange={(e) => {
                                                        const next = parseInlineText(e.target.value);
                                                        setQ((prev) => {
                                                            if ((prev as any).kind !== "mcq") return prev as any;
                                                            const choices = (prev as any).choices.map((cc: any) => cc.id === c.id ? { ...cc, content: next } : cc);
                                                            return { ...(prev as any), choices };
                                                        });
                                                    }}
                                                />
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-semibold">Correct:</div>
                                            <select className="rounded-xl border p-2 text-sm" value={(q as any).answer.correct}
                                                onChange={(e) => setQ((prev) => ({ ...(prev as any), answer: { correct: e.target.value as any } }))}
                                            >
                                                {(["A", "B", "C", "D"] as const).map((x) => <option key={x} value={x}>{x}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ✅ RW stimulus preview right here */}
                            {Array.isArray((q as any).stimulus) && (q as any).stimulus.length > 0 && (
                                <div className="mt-4 rounded-xl border bg-slate-50 p-3">
                                    <div className="text-xs font-semibold text-slate-600 mb-2">Stimulus Preview</div>
                                    <StimulusRender blocks={(q as any).stimulus} variant="stimulus" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="col-span-12 lg:col-span-4 space-y-3">
                        <QuestionPreview q={q as any} />
                    </div>
                </div>
            </div>
        </div>
    );
}
