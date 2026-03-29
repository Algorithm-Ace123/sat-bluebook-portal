"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

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
    const [saving, setSaving] = useState(false);

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
        setSaving(true);

        const normalized: any = {
            ...q,
            question: { ...q.question, promptBlocks: Array.isArray(q.question.promptBlocks) ? q.question.promptBlocks : [] }
        };

        const v = AuthoringQuestionSchema.safeParse(normalized);
        if (!v.success) {
            setErr(JSON.stringify(v.error.format(), null, 2));
            setSaving(false);
            return;
        }

        try {
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
        } finally {
            setSaving(false);
        }
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

    async function finalizeTest() {
        if (!confirm("Are you sure you want to finalize and publish this test?")) return;
        const r = await fetch("/api/authoring/draft/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draftId, title })
        });
        const j = await r.json();
        if (!r.ok) return alert(j.error ?? "Finalize failed");
        alert("Published! You can now assign this test.");
        router.push("/teacher/tests");
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
        <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
            {/* Top Bar */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <Link href="/teacher/tests" className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </Link>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <input 
                                className="text-xl font-bold text-slate-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-100 rounded px-1 transition-all" 
                                value={title} 
                                onBlur={updateTitle}
                                onChange={(e) => setTitle(e.target.value)} 
                            />
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">{status}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono tracking-tighter">Draft ID: {draftId}</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={finalizeTest}
                        className="rounded-2xl bg-emerald-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                    >
                        Publish Test
                    </button>
                    <Link href="/api/auth/logout" className="text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors">Log out</Link>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Module Selector Sidebar */}
                <div className="w-64 bg-white border-r flex flex-col shrink-0">
                    <div className="p-4 border-b">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Modules</h3>
                        <div className="space-y-1.5">
                            {MODULES.map((m) => (
                                <button
                                    key={m.key}
                                    onClick={() => setActiveModule(m.key)}
                                    className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
                                        activeModule === m.key 
                                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                                        : "hover:bg-slate-50 text-slate-600"
                                    }`}
                                >
                                    <div className="font-bold text-sm tracking-tight">{m.label}</div>
                                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${activeModule === m.key ? 'bg-white/20' : 'bg-slate-100'}`}>
                                        {counts[m.key] ?? 0}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto p-4 space-y-3">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Questions</h3>
                            <button onClick={newQuestion} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-50 transition-colors">+</button>
                        </div>
                        
                        <div className="space-y-2">
                            {moduleItems.map((it: any, idx: number) => (
                                <div key={it.id} className={`group rounded-2xl border p-3 transition-all ${selectedId === it.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                    <button onClick={() => loadQuestion(it.id)} className="w-full text-left">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${it.kind === 'mcq' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {it.kind}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                                        </div>
                                        <div className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">{it.titlePreview || "Empty Question"}</div>
                                    </button>
                                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-[10px] font-bold text-red-500 hover:text-red-700" onClick={() => removeFromDraft(it.id)}>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {!moduleItems.length && <div className="text-[11px] text-slate-400 text-center py-8 italic">No questions yet.</div>}
                        </div>
                    </div>
                    
                    <div className="p-4 border-t">
                        <button 
                            onClick={() => setShowImport(true)}
                            className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            Import JSON
                        </button>
                    </div>
                </div>

                {/* Main Content Areas */}
                <main className="flex-1 flex overflow-hidden">
                    {/* Left Pane: Editor */}
                    <div className="w-1/2 p-6 overflow-auto border-r bg-white/50 backdrop-blur-sm space-y-8">
                        {showImport ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Import JSON</h2>
                                    <button className="text-sm font-bold text-slate-400 hover:text-slate-900" onClick={() => setShowImport(false)}>Cancel</button>
                                </div>
                                <textarea 
                                    className="w-full rounded-2xl border border-slate-200 bg-white p-5 font-mono text-xs h-[500px] outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-inner" 
                                    placeholder='Paste your JSON here...'
                                    value={importText} 
                                    onChange={(e) => setImportText(e.target.value)} 
                                />
                                {importErr && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold">{importErr}</div>}
                                <button className="w-full rounded-2xl bg-slate-900 text-white py-4 font-bold shadow-xl hover:shadow-2xl transition-all" onClick={importJSON}>
                                    Run Import
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8 max-w-2xl mx-auto">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Question Editor</h2>
                                    <div className="flex items-center gap-2">
                                        <select 
                                            className="rounded-xl border border-slate-200 bg-white p-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all pointer-events-auto shadow-sm"
                                            value={kind} 
                                            onChange={(e) => {
                                                const k = e.target.value as any;
                                                setKind(k);
                                                setSelectedId(null);
                                                setQ(defaultQuestion(k));
                                                setErr(null);
                                            }}
                                        >
                                            <option value="mcq">Multiple Choice (MCQ)</option>
                                            <option value="frq_math">Free Response (FRQ)</option>
                                        </select>
                                        <button 
                                            onClick={saveQuestion}
                                            disabled={saving}
                                            className="rounded-xl bg-blue-600 text-white px-6 py-2 text-sm font-black hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
                                        >
                                            {saving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>

                                {err && (
                                    <div className="rounded-2xl bg-red-50 border border-red-100 p-4 animate-in shake-in">
                                        <div className="text-red-800 font-bold text-sm mb-2">Configuration Errors:</div>
                                        <pre className="text-[10px] font-mono whitespace-pre-wrap text-red-600">{err}</pre>
                                    </div>
                                )}

                                <div className="space-y-10">
                                    {/* Stimulus Section (RW) */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Passage / Stimulus (RW)</label>
                                            <span className="text-[10px] text-slate-300 font-mono">JSON format</span>
                                        </div>
                                        <textarea
                                            className="w-full rounded-2xl border border-slate-200 bg-white p-4 font-mono text-[11px] h-48 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-inner resize-y"
                                            value={JSON.stringify((q as any).stimulus ?? [], null, 2)}
                                            onChange={(e) => setStimulusBlocksJSON(e.target.value)}
                                            placeholder="[ ]"
                                        />
                                    </div>

                                    {/* Prompt Editor */}
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Question Prompt</label>
                                            <textarea
                                                className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm h-32"
                                                value={inlineNodesToEditorString((q as any).question.prompt)}
                                                onChange={(e) => setQ((prev) => ({ ...(prev as any), question: { ...(prev as any).question, prompt: parseInlineText(e.target.value) } }))}
                                                placeholder="Ask the question here. Use [[latex:x]] for math."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prompt LaTeX (Optional)</label>
                                                <input
                                                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                                    value={(q as any).question.promptLatex ?? ""}
                                                    onChange={(e) => setQ((prev) => ({ ...(prev as any), question: { ...(prev as any).question, promptLatex: e.target.value } }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prompt Blocks (Math)</label>
                                                <textarea
                                                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[10px] font-mono h-24 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-inner"
                                                    value={JSON.stringify((q as any).question.promptBlocks ?? [], null, 2)}
                                                    onChange={(e) => setPromptBlocksJSON(e.target.value)}
                                                    placeholder="[ ]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Choices (MCQ) */}
                                    {q.kind === "mcq" && (
                                        <div className="space-y-6">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Answer Choices</label>
                                            <div className="grid grid-cols-1 gap-4">
                                                {(q as any).choices?.map((c: any) => (
                                                    <div key={c.id} className="relative group">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-400 z-10 transition-colors group-focus-within:bg-blue-600 group-focus-within:text-white group-focus-within:border-blue-600">
                                                            {c.id}
                                                        </div>
                                                        <textarea
                                                            className="w-full rounded-2xl border border-slate-200 bg-white p-4 pl-16 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                                                            value={inlineNodesToEditorString(c.content)}
                                                            onChange={(e) => {
                                                                const next = parseInlineText(e.target.value);
                                                                setQ((prev: any) => {
                                                                    const choices = prev.choices.map((cc: any) => cc.id === c.id ? { ...cc, content: next } : cc);
                                                                    return { ...prev, choices };
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                                <div className="text-sm font-bold text-blue-900">Correct Answer:</div>
                                                <div className="flex gap-2">
                                                    {(["A", "B", "C", "D"] as const).map((x) => (
                                                        <button 
                                                            key={x}
                                                            onClick={() => setQ((prev: any) => ({ ...prev, answer: { correct: x } }))}
                                                            className={`w-10 h-10 rounded-xl font-bold transition-all shadow-sm ${
                                                                (q as any).answer.correct === x 
                                                                ? "bg-blue-600 text-white scale-110 shadow-lg shadow-blue-200" 
                                                                : "bg-white text-slate-400 hover:text-slate-900 hover:bg-white"
                                                            }`}
                                                        >
                                                            {x}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* FRQ Section */}
                                    {q.kind === "frq_math" && (
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Accepted Answers (Math FRQ)</label>
                                            <textarea
                                                className="w-full rounded-2xl border border-slate-200 bg-white p-4 font-mono text-xs h-32 outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-inner"
                                                value={JSON.stringify((q as any).answer.accepted, null, 2)}
                                                onChange={(e) => {
                                                    try {
                                                        const acc = JSON.parse(e.target.value);
                                                        setQ((prev: any) => ({ ...prev, answer: { accepted: acc } }));
                                                        setErr(null);
                                                    } catch (err: any) {
                                                        setErr(`Accepted Answers JSON error: ${err.message}`);
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Pane: Live Preview */}
                    <div className="w-1/2 p-10 overflow-auto bg-[#fafafa]">
                        <div className="max-w-xl mx-auto space-y-10">
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Live Runner Preview</h3>
                                <div className="h-px flex-1 bg-slate-100"></div>
                            </div>
                            
                            <div className="rounded-[2.5rem] bg-white border border-slate-200/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden scale-100 transform transform-gpu origin-top">
                                <div className="p-8">
                                    <QuestionPreview q={q as any} />
                                </div>
                            </div>

                            {/* Stimulus Preview Block (dedicated) */}
                            {Array.isArray((q as any).stimulus) && (q as any).stimulus.length > 0 && (
                                <div className="space-y-4 animate-in fade-in duration-700">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Passage Only</h3>
                                        <div className="h-px flex-1 bg-slate-100"></div>
                                    </div>
                                    <div className="rounded-[2rem] bg-white border border-slate-100 p-8 shadow-sm">
                                        <StimulusRender blocks={(q as any).stimulus} variant="stimulus" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
