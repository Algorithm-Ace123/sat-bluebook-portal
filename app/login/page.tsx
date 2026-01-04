"use client";

import { useState } from "react";
import { supabaseBrowser } from "../../lib/supabase-browser";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        setLoading(true);

        const supabase = supabaseBrowser();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.user) {
            setLoading(false);
            setErr(error?.message ?? "Login failed.");
            return;
        }

        // Fetch profile role and route accordingly
        const { data: profile, error: pErr } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

        console.log("Profile query result:", { profile, pErr, userId: data.user.id });

        setLoading(false);

        if (pErr || !profile?.role) {
            console.error("Profile error:", pErr);
            setErr(
                pErr
                    ? `Profile error: ${pErr.message}`
                    : "Logged in, but your profile is missing. Ask admin to add your row in profiles table."
            );
            return;
        }

        if (profile.role === "teacher") {
            window.location.href = "/teacher";
        } else {
            window.location.href = "/student";
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0f172a] relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]" />

            <div className="w-full max-w-md relative z-10">
                <div className="mb-10 flex flex-col items-center">
                    <img src="/logo.png" alt="Pramana Logo" className="h-16 mb-4 drop-shadow-2xl" />
                    <h1 className="text-3xl font-black text-white tracking-tight">Pramana</h1>
                    <div className="h-1 w-12 bg-blue-500 rounded-full mt-2" />
                </div>

                <div className="rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/10 shadow-2xl p-10">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-white">Student Portal</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Log in with the credentials provided by your instructor.
                        </p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-6">
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                            <input
                                className="mt-2 w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition placeholder:text-slate-600"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                            <input
                                className="mt-2 w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition placeholder:text-slate-600"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        {err && (
                            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 font-medium">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {err}
                                </div>
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 text-white p-4 font-bold disabled:opacity-50 transition shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </>
                            ) : "Enter Portal"}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-500 font-medium tracking-tight">
                            Authorized Access Only • Pramana Mock Portal
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
