"use client";

import { useEffect, useState } from "react";

type TestRow = { id: string; title: string; section: "RW" | "MATH" | "FULL" };

export default function CreateAssignmentPage() {
    const [tests, setTests] = useState<TestRow[]>([]);
    const [testId, setTestId] = useState("");
    const [title, setTitle] = useState("");
    const [dueAt, setDueAt] = useState(""); // ISO string
    const [timingSec, setTimingSec] = useState(1800);
    const [defaultPassword, setDefaultPassword] = useState("Pramana@123");
    const [emails, setEmails] = useState("");

    const [msg, setMsg] = useState<string | null>(null);
    const [details, setDetails] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
            const r = await fetch("/api/assignments/list");
            const j = await r.json().catch(() => ({}));
            setTests(j.tests ?? []);
        })();
    }, []);

    async function createAssignment() {
        setMsg(null);
        setDetails(null);
        setBusy(true);

        const studentEmails = emails
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

        if (!testId) {
            setBusy(false);
            setMsg("Select a test.");
            return;
        }

        if (studentEmails.length === 0) {
            setBusy(false);
            setMsg("Add at least one student email.");
            return;
        }

        const res = await fetch("/api/assignments/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                testId,
                title: title || "Assignment",
                dueAt: dueAt || null,
                timing: { totalTimeSec: Number(timingSec) },
                students: studentEmails,
                defaultPassword
            })
        });

        const out = await res.json().catch(async () => {
            // If server returned non-JSON, show text
            const text = await res.text().catch(() => "");
            return { error: "Non-JSON response from server", raw: text };
        });

        setBusy(false);

        if (!res.ok) {
            setMsg(out.error ?? "Failed to create assignment.");
            setDetails(out.raw ? String(out.raw) : JSON.stringify(out, null, 2));
            return;
        }

        const assignedCount = typeof out.assignedCount === "number" ? out.assignedCount : 0;

        setMsg(`Created ✔ Assigned to ${assignedCount} student(s).`);

        if (out.failures?.length) {
            setDetails(JSON.stringify(out.failures, null, 2));
        }
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Create Assignment</h1>
                        <p className="text-sm text-slate-600 mt-1">
                            Pick a stored test and assign it to student emails.
                        </p>
                    </div>
                    <a href="/teacher" className="rounded-xl border px-4 py-2 bg-white text-sm">
                        Back
                    </a>
                </div>

                <div className="mt-6 rounded-2xl bg-white border shadow-sm p-4 space-y-4">
                    <div>
                        <label className="text-sm font-medium">Select Test</label>
                        <select
                            className="mt-1 w-full rounded-xl border p-3"
                            value={testId}
                            onChange={(e) => setTestId(e.target.value)}
                        >
                            <option value="">Select…</option>
                            {tests.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.title} ({t.section})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Assignment Title</label>
                        <input
                            className="mt-1 w-full rounded-xl border p-3"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Week 1 Full SAT"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Due At (optional, ISO)</label>
                            <input
                                className="mt-1 w-full rounded-xl border p-3"
                                value={dueAt}
                                onChange={(e) => setDueAt(e.target.value)}
                                placeholder="2026-01-10T18:00:00Z"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Total Time (seconds)</label>
                            <input
                                className="mt-1 w-full rounded-xl border p-3"
                                type="number"
                                min={60}
                                value={timingSec}
                                onChange={(e) => setTimingSec(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Default Password</label>
                        <input
                            className="mt-1 w-full rounded-xl border p-3"
                            value={defaultPassword}
                            onChange={(e) => setDefaultPassword(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            If a student user doesn’t exist yet, it will be created with this password.
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Student Emails (one per line)</label>
                        <textarea
                            className="mt-1 w-full rounded-xl border p-3 h-40"
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            placeholder={`student1@pramana.test\nstudent2@pramana.test`}
                        />
                    </div>

                    <button
                        disabled={busy}
                        onClick={createAssignment}
                        className="rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-medium disabled:opacity-50"
                    >
                        {busy ? "Creating..." : "Create Assignment"}
                    </button>

                    {msg && (
                        <div className="rounded-xl border p-3 text-sm bg-slate-50">
                            <div className="font-medium">{msg}</div>
                            {details && <pre className="mt-2 text-xs overflow-auto">{details}</pre>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
