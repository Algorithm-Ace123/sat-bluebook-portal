"use client";

import { useState } from "react";

export default function NewTestPage() {
    const [title, setTitle] = useState("Untitled SAT Test");

    async function create() {
        const r = await fetch("/api/authoring/tests/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title })
        });
        const j = await r.json();
        if (!r.ok) return alert(j.error ?? "Failed");
        window.location.href = `/teacher/tests/${j.draftId}`;
    }

    return (
        <div className="min-h-screen p-6 bg-slate-50">
            <div className="max-w-xl mx-auto rounded-2xl border bg-white p-6">
                <h1 className="text-xl font-semibold">Create New Test</h1>
                <label className="text-sm font-medium mt-4 block">Title</label>
                <input className="mt-1 w-full rounded-xl border p-3" value={title} onChange={(e) => setTitle(e.target.value)} />
                <button className="mt-4 w-full rounded-xl bg-slate-900 text-white p-3" onClick={create}>
                    Create Draft
                </button>
            </div>
        </div>
    );
}
