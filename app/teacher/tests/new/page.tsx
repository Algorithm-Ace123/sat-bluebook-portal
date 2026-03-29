"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewTestPage() {
    const [title, setTitle] = useState("Untitled SAT Practice Test");
    const [creating, setCreating] = useState(false);
    const router = useRouter();

    async function create() {
        setCreating(true);
        try {
            const r = await fetch("/api/authoring/tests/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title })
            });
            const j = await r.json();
            if (!r.ok) {
                alert(j.error ?? "Failed to create draft");
                return;
            }
            router.push(`/teacher/tests/${j.draftId}`);
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-slate-100 flex items-center justify-center p-6">
            <div className="max-w-md w-full animate-in zoom-in duration-500">
                <Link href="/teacher/tests" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-medium text-sm group">
                    <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Dashboard
                </Link>
                
                <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-2xl p-8 sm:p-10">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create New Test</h1>
                        <p className="text-slate-500 mt-2 text-sm leading-relaxed">Give your practice test a clear, descriptive name. You can change this later.</p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Test Title</label>
                            <input 
                                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-medium placeholder:text-slate-300" 
                                placeholder="e.g. SAT Practice Test #1"
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                autoFocus
                            />
                        </div>
                        
                        <button 
                            className="w-full rounded-2xl bg-slate-900 text-white p-4.5 font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 hover:shadow-2xl transition-all disabled:opacity-50 active:scale-95"
                            onClick={create}
                        >
                            {creating ? "Initialzing Workspace..." : "Create Test Draft"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
