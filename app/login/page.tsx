"use client";

import { useState } from "react";
import InlineLogo from "../../components/InlineLogo";
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

        const supabase = await supabaseBrowser();

        const normalizedEmail = email.trim().toLowerCase();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
        });

        console.debug('Sign-in result', { data, error });

        if (error || !data.user) {
            setLoading(false);
            console.error('Login error details:', error);
            setErr(error?.message ?? "Login failed. Check your email/password or contact your admin.");
            return;
        }

        // Persist session to server cookies so server-side routing and middleware can detect it
        try {
            const resp = await fetch('/api/auth/set-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    access_token: data.session?.access_token,
                    refresh_token: data.session?.refresh_token,
                    expires_at: data.session?.expires_at,
                    session: data.session
                })
            });

            const json = await resp.json();
            if (!resp.ok || !json.ok) {
                console.error('Failed to persist session on server:', json);
                // Fallback: set non-HttpOnly cookies client-side so middleware and server see them
                try {
                    const maxAge = (data.session?.expires_at && typeof data.session.expires_at === 'number')
                        ? Math.max(0, data.session.expires_at - Math.floor(Date.now() / 1000))
                        : 60 * 60;
                    document.cookie = `sb-access-token=${data.session?.access_token}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
                    document.cookie = `sb-session=${encodeURIComponent(JSON.stringify(data.session))}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
                } catch (err) {
                    console.error('Client-side cookie fallback failed', err);
                    setErr('Logged in, but failed to persist session. Try again or contact admin.');
                    setLoading(false);
                    return;
                }
            }
        } catch (err) {
            console.error('set-session fetch error', err);
            // Fallback to client-side cookie persistence
            try {
                const maxAge = (data.session?.expires_at && typeof data.session.expires_at === 'number')
                    ? Math.max(0, data.session.expires_at - Math.floor(Date.now() / 1000))
                    : 60 * 60;
                document.cookie = `sb-access-token=${data.session?.access_token}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
                document.cookie = `sb-session=${encodeURIComponent(JSON.stringify(data.session))}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
            } catch (err2) {
                console.error('Client-side cookie fallback failed', err2);
                setErr('Logged in, but failed to persist session. Try again or contact admin.');
                setLoading(false);
                return;
            }
        }

        // Ensure server actually sees the session; Vercel deployments can sometimes drop SDK cookies in edge layers.
        // Retry with exponential backoff to give edge network time to propagate cookies
        let sessionConfirmed = false;
        const maxRetries = 5;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Wait progressively longer between attempts (100ms, 200ms, 400ms, 800ms, 1600ms)
                if (attempt > 0) {
                    await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
                }

                const check = await fetch('/api/auth/check', { 
                    credentials: 'same-origin',
                    cache: 'no-store' // Prevent caching that could hide cookie issues
                });
                const checkJson = await check.json();
                
                if (checkJson.ok && checkJson.user) {
                    console.log(`Session confirmed on attempt ${attempt + 1}`);
                    sessionConfirmed = true;
                    break;
                }

                console.warn(`Attempt ${attempt + 1}/${maxRetries}: Server did not see session yet`);
                
                // On first failure, try forcing SDK cookie as fallback
                if (attempt === 0) {
                    try {
                        const force = await fetch('/api/auth/force-sdk-cookie', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'same-origin',
                            body: JSON.stringify({ 
                                access_token: data.session?.access_token, 
                                refresh_token: data.session?.refresh_token 
                            })
                        });
                        const fjson = await force.json();
                        if (!force.ok || !fjson.ok) {
                            console.error('force-sdk-cookie failed', fjson);
                        }
                    } catch (e) {
                        console.error('force-sdk-cookie error', e);
                    }
                }
            } catch (e) {
                console.error(`Session check error on attempt ${attempt + 1}:`, e);
            }
        }

        if (!sessionConfirmed) {
            console.error('Failed to confirm session after all retries');
            setErr('Logged in, but server could not verify session. Please try again or contact admin.');
            setLoading(false);
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

        // Respect the `next` query param if present and safe
        try {
            const params = new URLSearchParams(window.location.search);
            const next = params.get('next');
            if (next && typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')) {
                // Prevent open redirect; ensure path only
                window.location.href = next;
                return;
            }
        } catch (e) {
            // ignore and fall back to role routing
        }

        if (profile.role === "teacher") {
            window.location.href = "/teacher";
        } else {
            window.location.href = "/student";
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Mesh Gradient Aura Background */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-100/60 rounded-full blur-[160px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/60 rounded-full blur-[140px]" />
            <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-sky-50/80 rounded-full blur-[100px]" />

            <div className="w-full max-w-md relative z-10">
                <div className="mb-12 flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-900 rounded-[24px] flex items-center justify-center shadow-2xl shadow-slate-300 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <InlineLogo className="h-12" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Digital SAT</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Practice Platform • Authorized Access</p>
                    </div>
                    <div className="h-1.5 w-12 bg-blue-600 rounded-full mt-6" />
                </div>

                <div className="rounded-[44px] bg-white border border-slate-200 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06)] p-12 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -translate-y-16 translate-x-16 transition-transform group-hover:scale-110 duration-700" />
                    
                    <div className="mb-10 relative z-10">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Student Portal</h2>
                        <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">
                            Log in with the official credentials provided by your test administration.
                        </p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-8 relative z-10">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Official Email Address</label>
                            <input
                                className="mt-3 w-full rounded-2xl bg-slate-50/50 border-2 border-slate-100 p-5 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all placeholder:text-slate-300"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="candidate@exam.com"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Access Password</label>
                            <input
                                className="mt-3 w-full rounded-2xl bg-slate-50/50 border-2 border-slate-100 p-5 font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all placeholder:text-slate-300"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        {err && (
                            <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-5 text-sm text-red-600 font-bold overflow-hidden relative">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {err}
                                </div>
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full rounded-2xl bg-slate-900 hover:bg-black text-white p-5 font-black disabled:opacity-50 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98] group-hover:shadow-slate-300"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Enter Mock Portal
                                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7M3 12h18" /></svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] opacity-80">
                            Digital Assessment System v2.1
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
