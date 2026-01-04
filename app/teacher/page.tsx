import Link from "next/link";
import { supabaseServer } from "../../lib/supabase";

export const dynamic = "force-dynamic";

export default async function TeacherPage() {
    let supabase: any;
    try {
        supabase = await supabaseServer();
    } catch (err) {
        console.error('Supabase init error in TeacherPage:', err);
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-xl mx-auto rounded-2xl bg-white border p-6">
                    <h1 className="text-xl font-semibold">Service temporarily unavailable</h1>
                    <p className="text-sm text-slate-600 mt-2">We’re having trouble connecting to our backend. Please try again later.</p>
                </div>
            </div>
        );
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null; 

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", userData.user.id)
        .single();

    // Role gate (MVP)
    if (profile?.role !== "teacher") {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-xl mx-auto rounded-2xl bg-white border p-6">
                    <h1 className="text-xl font-semibold">Access restricted</h1>
                    <p className="text-sm text-slate-600 mt-2">
                        This account is not marked as a teacher.
                    </p>
                    <div className="mt-4 flex gap-3">
                        <Link className="rounded-xl border px-4 py-2" href="/student">
                            Go to Student Dashboard
                        </Link>
                        <Link className="rounded-xl bg-slate-900 text-white px-4 py-2" href="/api/auth/logout">
                            Logout
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
                        <p className="text-sm text-slate-600 mt-1">
                            Upload tests, create assignments, and manage students.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            href="/teacher/upload-test"
                            className="rounded-xl bg-white border px-4 py-2"
                        >
                            Upload Test JSON
                        </Link>
                        <Link
                            href="/teacher/create-assignment"
                            className="rounded-xl bg-slate-900 text-white px-4 py-2"
                        >
                            Create Assignment
                        </Link>
                        <Link
                            href="/api/auth/logout"
                            className="rounded-xl border px-4 py-2"
                        >
                            Logout
                        </Link>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card
                        title="Upload Test JSON"
                        desc="Paste a JSON test; it’s validated and stored for reuse."
                        href="/teacher/upload-test"
                        cta="Open uploader"
                    />
                    <Card
                        title="Create Assignment"
                        desc="Assign a stored test to a list of student emails. Accounts can be created automatically."
                        href="/teacher/create-assignment"
                        cta="Create assignment"
                    />
                </div>
            </div>
        </div>
    );
}

function Card({
    title,
    desc,
    href,
    cta
}: {
    title: string;
    desc: string;
    href: string;
    cta: string;
}) {
    return (
        <div className="rounded-2xl bg-white border shadow-sm p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-slate-600 mt-1">{desc}</p>
            <div className="mt-4">
                <Link className="text-sm underline" href={href}>
                    {cta}
                </Link>
            </div>
        </div>
    );
}
