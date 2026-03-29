"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    const [loadingTests, setLoadingTests] = useState(true);

    const fetchTests = async () => {
        setLoadingTests(true);
        try {
            const r = await fetch("/api/assignments/list");
            const j = await r.json().catch(() => ({}));
            setTests(j.tests ?? []);
        } catch (err) {
            console.error("Failed to fetch tests:", err);
        } finally {
            setLoadingTests(false);
        }
    };

    useEffect(() => {
        fetchTests();
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
            setMsg("Please select a test to assign.");
            return;
        }

        if (studentEmails.length === 0) {
            setBusy(false);
            setMsg("Add at least one student email.");
            return;
        }

        try {
            const res = await fetch("/api/assignments/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    testId,
                    title: title || "New Assignment",
                    dueAt: dueAt || null,
                    timing: { totalTimeSec: Number(timingSec) },
                    students: studentEmails,
                    defaultPassword
                })
            });

            const out = await res.json().catch(async () => {
                const text = await res.text().catch(() => "");
                return { error: "Unexpected response from server", raw: text };
            });

            if (!res.ok) {
                setMsg(out.error ?? "Failed to create assignment.");
                setDetails(out.raw ? String(out.raw) : JSON.stringify(out, null, 2));
                return;
            }

            const assignedCount = typeof out.assignedCount === "number" ? out.assignedCount : 0;
            setMsg(`Success! Assigned to ${assignedCount} student(s).`);
            if (out.failures?.length) {
                setDetails(`Failed for: ${out.failures.join(", ")}`);
            }
            // Clear form on success
            setTitle("");
            setTestId("");
            setEmails("");
        } catch (err) {
            setMsg("A network error occurred.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
                            <Link href="/teacher" className="hover:text-slate-900 transition-colors">Dashboard</Link>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            <span className="text-slate-900">Create Assignment</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Assignment</h1>
                        <p className="text-slate-500 mt-1">
                            Pick a test and assign it to your students.
                        </p>
                    </div>
                    
                    <Link href="/teacher" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Select Test</label>
                                    <div className="relative">
                                        <select
                                            disabled={loadingTests}
                                            className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/50 p-4 pr-10 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                                            value={testId}
                                            onChange={(e) => setTestId(e.target.value)}
                                        >
                                            {loadingTests ? (
                                                <option>Loading tests...</option>
                                            ) : tests.length === 0 ? (
                                                <option value="">No published tests found</option>
                                            ) : (
                                                <>
                                                    <option value="">Choose a test...</option>
                                                    {tests.map((t) => (
                                                        <option key={t.id} value={t.id}>
                                                            {t.title} ({t.section})
                                                        </option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                    {!loadingTests && tests.length === 0 && (
                                        <p className="mt-2 text-sm text-amber-600 flex items-center gap-1.5 font-medium">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            No published tests. <Link href="/teacher/tests" className="underline hover:text-amber-700">Go to Test Dashboard</Link>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Assignment Title</label>
                                    <input
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Week 1 - Section 1 Practice"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Due Date (Optional)</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={dueAt}
                                            onChange={(e) => setDueAt(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Time Limit (Sec)</label>
                                        <input
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            type="number"
                                            min={60}
                                            value={timingSec}
                                            onChange={(e) => setTimingSec(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Student Emails (one per line)</label>
                                    <textarea
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 h-48 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                        value={emails}
                                        onChange={(e) => setEmails(e.target.value)}
                                        placeholder={`student1@example.com\nstudent2@example.com`}
                                    />
                                    <p className="mt-2 text-xs text-slate-400">
                                        Students will receive an automated invitation to start their practice session.
                                    </p>
                                </div>
                            </div>

                            <button
                                disabled={busy || loadingTests}
                                onClick={createAssignment}
                                className="w-full rounded-2xl bg-slate-900 text-white p-5 font-bold text-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                            >
                                {busy ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Creating Assignment...
                                    </>
                                ) : "Assign to Students"}
                            </button>

                            {msg && (
                                <div className={`rounded-2xl border p-4 text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${msg.includes("Success") ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                                    <div className="flex items-center gap-2 font-bold mb-1">
                                        {msg.includes("Success") ? (
                                            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        )}
                                        {msg}
                                    </div>
                                    {details && <pre className="mt-2 text-xs font-mono bg-white/50 p-3 rounded-xl overflow-auto border border-white max-h-32">{details}</pre>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl">
                            <h3 className="text-xl font-bold mb-4">Quick Tips</h3>
                            <ul className="space-y-4 text-blue-50/80 text-sm leading-relaxed">
                                <li className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                                    Only **published** tests can be assigned. Save your drafts first.
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                                    New student accounts use the **default password** until they change it.
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                                    Assignments appear instantly on the student portal.
                                </li>
                            </ul>
                        </div>

                        <div className="rounded-[2rem] bg-white border border-slate-100 p-8 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Security</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Default Password</label>
                                    <input
                                        className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-slate-700 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
                                        value={defaultPassword}
                                        onChange={(e) => setDefaultPassword(e.target.value)}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 leading-tight">
                                    This password will be used to create accounts for any student email that doesn't already have an account.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
