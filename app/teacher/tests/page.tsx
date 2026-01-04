import Link from "next/link";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function TeacherTestsPage() {
    const supabase = await supabaseServer();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.user.id).single();
    if (profile?.role !== "teacher") return <div className="p-6">Teacher only.</div>;

    const { data: drafts } = await supabase
        .from("draft_tests")
        .select("id,title,status,updated_at,created_at")
        .order("updated_at", { ascending: false });

    const { data: published } = await supabase
        .from("tests")
        .select("id,title,created_at")
        .order("created_at", { ascending: false });

    return (
        <div className="min-h-screen p-6 bg-slate-50">
            <div className="max-w-5xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Test Dashboard</h1>
                        <p className="text-sm text-slate-600">Create, edit, and publish SAT tests.</p>
                    </div>
                    <Link href="/teacher/tests/new" className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm">
                        + Create New Test
                    </Link>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                    <div className="text-lg font-semibold">Draft Tests</div>
                    <div className="mt-3 space-y-2">
                        {(drafts ?? []).map((d: any) => (
                            <div key={d.id} className="rounded-xl border p-3 flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{d.title}</div>
                                    <div className="text-xs text-slate-500">Status: {d.status} • Updated: {new Date(d.updated_at).toLocaleString()}</div>
                                </div>
                                <Link href={`/teacher/tests/${d.id}`} className="rounded-lg border px-3 py-2 text-sm bg-white">
                                    Open
                                </Link>
                            </div>
                        ))}
                        {!drafts?.length && <div className="text-sm text-slate-500">No drafts yet.</div>}
                    </div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                    <div className="text-lg font-semibold">Published Tests</div>
                    <div className="mt-3 space-y-2">
                        {(published ?? []).map((t: any) => (
                            <div key={t.id} className="rounded-xl border p-3 flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{t.title}</div>
                                    <div className="text-xs text-slate-500">Created: {new Date(t.created_at).toLocaleString()}</div>
                                </div>
                                <Link href={`/teacher/tests/${t.id}?mode=published`} className="rounded-lg border px-3 py-2 text-sm bg-white">
                                    Duplicate to Edit
                                </Link>
                            </div>
                        ))}
                        {!published?.length && <div className="text-sm text-slate-500">No published tests yet.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
