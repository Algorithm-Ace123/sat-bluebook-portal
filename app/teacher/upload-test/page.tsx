"use client";

import { useMemo, useState } from "react";
import { TestJsonSchema } from "../../../lib/schema";

export default function UploadTestPage() {
    const [title, setTitle] = useState("");
    const [jsonText, setJsonText] = useState("");
    const [msg, setMsg] = useState<string | null>(null);
    const [details, setDetails] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const placeholder = useMemo(
        () =>
            JSON.stringify(
                {
                    version: "1.0",
                    title: "RW Module 1",
                    section: "RW",
                    tools: { desmos: false, referenceSheetUrl: "https://example.com/reference.pdf" },
                    modules: [
                        {
                            id: "m1",
                            timeLimitSec: 1200,
                            items: [
                                {
                                    id: "rw-q1",
                                    kind: "mcq",
                                    stimulus: { type: "passage", content: [{ type: "text", text: "Sample passage..." }] },
                                    prompt: "What is the main idea?",
                                    choices: [
                                        { id: "A", text: "Option A" },
                                        { id: "B", text: "Option B" },
                                        { id: "C", text: "Option C" },
                                        { id: "D", text: "Option D" }
                                    ],
                                    answer: { correct: "B" }
                                }
                            ]
                        }
                    ],
                    assets: []
                },
                null,
                2
            ),
        []
    );

    async function onUpload() {
        setMsg(null);
        setDetails(null);
        setLoading(true);

        let parsed: any;
        try {
            parsed = JSON.parse(jsonText);
        } catch {
            setLoading(false);
            setMsg("Invalid JSON (parsing failed).");
            return;
        }

        const v = TestJsonSchema.safeParse(parsed);
        if (!v.success) {
            setLoading(false);
            setMsg("JSON schema validation failed.");
            setDetails(JSON.stringify(v.error.format(), null, 2));
            return;
        }

        const res = await fetch("/api/tests/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: title || v.data.title,
                json: v.data
            })
        });

        const out = await res.json().catch(() => ({}));

        setLoading(false);
        if (!res.ok) {
            setMsg(out.error ?? "Upload failed.");
            return;
        }

        setMsg("Uploaded ✔ Test saved to database.");
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Upload Test JSON</h1>
                        <p className="text-sm text-slate-600 mt-1">
                            Paste a test JSON. It will be validated and stored.
                        </p>
                    </div>
                    <a href="/teacher" className="rounded-xl border px-4 py-2 bg-white text-sm">
                        Back
                    </a>
                </div>

                <div className="mt-6 rounded-2xl bg-white border shadow-sm p-4 space-y-4">
                    <div>
                        <label className="text-sm font-medium">Override title (optional)</label>
                        <input
                            className="mt-1 w-full rounded-xl border p-3"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Pramana SAT RW Set 1"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Test JSON</label>
                        <textarea
                            className="mt-1 w-full rounded-xl border p-3 font-mono text-xs h-[420px]"
                            value={jsonText}
                            onChange={(e) => setJsonText(e.target.value)}
                            placeholder={placeholder}
                        />
                        <div className="mt-2 flex gap-2">
                            <button
                                onClick={() => setJsonText(placeholder)}
                                className="rounded-xl border px-3 py-2 text-sm bg-white"
                            >
                                Insert sample
                            </button>
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        onClick={onUpload}
                        className="rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-medium disabled:opacity-50"
                    >
                        {loading ? "Uploading..." : "Validate & Upload"}
                    </button>

                    {msg && (
                        <div className="rounded-xl border p-3 text-sm bg-slate-50">
                            <div className="font-medium">{msg}</div>
                            {details && (
                                <pre className="mt-2 text-xs overflow-auto">{details}</pre>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
