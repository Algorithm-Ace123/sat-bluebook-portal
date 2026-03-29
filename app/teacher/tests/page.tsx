import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function TeacherTestsPage() {
    let supabase: any;
    try {
        supabase = await supabaseServer();
    } catch (err) {
        console.error('Supabase init error in TeacherTestsPage:', err);
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-xl w-full rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-2xl p-8 text-center">
                    <h1 className="text-2xl font-bold text-slate-900">Service temporarily unavailable</h1>
                    <p className="text-slate-600 mt-2">We’re having trouble connecting to our backend. Please try again later.</p>
                </div>
            </div>
        );
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.user.id).single();
    if (profile?.role !== "teacher") return <div className="p-10 text-center font-bold text-slate-500">Access denied. Teacher only.</div>;

    const { data: drafts } = await supabase
        .from("draft_tests")
        .select("id,title,status,updated_at,created_at")
        .order("updated_at", { ascending: false });

    const { data: published } = await supabase
        .from("tests")
        .select("id,title,created_at")
        .order("created_at", { ascending: false });

    return (
        <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-100 via-white to-blue-50/30 p-6 md:p-10">
            <div className="max-w-5xl mx-auto space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-1">
                            <Link href="/teacher" className="hover:text-slate-900 transition-colors">Dashboard</Link>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            <span className="text-slate-900">Test Management</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Test Dashboard</h1>
                        <p className="text-slate-500 mt-1">Create, edit, and publish your SAT practice tests.</p>
                    </div>
                    <Link href="/teacher/tests/new" className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-6 py-3.5 font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        Create New Test
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-10">
                    {/* Drafts Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-1.5 h-6 bg-amber-400 rounded-full"></div>
                            <h2 className="text-xl font-bold text-slate-800">Draft Tests</h2>
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold">{drafts?.length ?? 0}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {(drafts ?? []).map((d: any) => (
                                <div key={d.id} className="group rounded-2xl border border-slate-100 bg-white p-5 flex items-center justify-between transition-all hover:shadow-md hover:border-slate-200">
                                    <div className="space-y-1">
                                        <div className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{d.title}</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold">
                                                {d.status}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Last updated: {new Date(d.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <Link href={`/teacher/tests/${d.id}`} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold bg-white text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm">
                                        Edit Draft
                                    </Link>
                                </div>
                            ))}
                            {!drafts?.length && (
                                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <p className="text-slate-500 font-medium italic">No drafts currently in progress.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Published Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                            <h2 className="text-xl font-bold text-slate-800">Published Tests</h2>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold">{published?.length ?? 0}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {(published ?? []).map((t: any) => (
                                <div key={t.id} className="group rounded-2xl border border-slate-100 bg-white p-5 flex items-center justify-between transition-all hover:shadow-md hover:border-slate-200">
                                    <div className="space-y-1">
                                        <div className="font-bold text-slate-900 text-lg group-hover:text-emerald-600 transition-colors">{t.title}</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1 uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                Active
                                            </span>
                                            <span className="flex items-center gap-1 text-slate-400">
                                                Published: {new Date(t.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/teacher/tests/${t.id}?mode=published`} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                                            Manage Questions
                                        </Link>
                                        <Link href={`/teacher/create-assignment?testId=${t.id}`} className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-200 shadow-emerald-100">
                                            Assign Now
                                        </Link>
                                    </div>
                                </div>
                            ))}
                            {!published?.length && (
                                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                                    <p className="text-slate-500 font-medium italic">No published tests yet. Complete a draft to publish.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
