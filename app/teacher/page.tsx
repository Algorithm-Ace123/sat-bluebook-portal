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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-xl w-full rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Service temporarily unavailable</h1>
                    <p className="text-slate-600 mt-2">We’re having trouble connecting to our backend. Please try again later.</p>
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-xl w-full rounded-3xl bg-white/80 backdrop-blur-xl border border-white shadow-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Access restricted</h1>
                    <p className="text-slate-600 mt-2">This account is not marked as a teacher.</p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <Link className="rounded-2xl border border-slate-200 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 transition-colors" href="/student">
                            Go to Student Dashboard
                        </Link>
                        <Link className="rounded-2xl bg-slate-900 text-white px-6 py-3 font-medium hover:bg-slate-800 transition-colors" href="/api/auth/logout">
                            Logout
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-purple-50/50 p-6 sm:p-10">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
                    <div className="space-y-1">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold tracking-wider uppercase mb-2">
                            Teacher Portal
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{profile?.full_name?.split(' ')[0] || 'Teacher'}</span>
                        </h1>
                        <p className="text-lg text-slate-500 max-w-2xl">
                            Manage your tests, create student assignments, and track performance.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/api/auth/logout"
                            className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200"
                        >
                            Log out
                        </Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DashboardCard
                        title="Test Dashboard"
                        desc="Manage, edit, and publish SAT sections. Create new tests from scratch."
                        href="/teacher/tests"
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                        color="bg-blue-500"
                        cta="View all tests"
                    />
                    <DashboardCard
                        title="Assign Tests"
                        desc="Assign published tests to students by email. Manage deadlines and timing."
                        href="/teacher/create-assignment"
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                        color="bg-purple-500"
                        cta="New assignment"
                    />
                    <DashboardCard
                        title="Student Performance"
                        desc="Track student progress, view score breakdowns, and detailed analytics."
                        href="/teacher/analytics"
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                        color="bg-emerald-500"
                        cta="Coming soon"
                        disabled={true}
                    />
                </div>

                <div className="mt-16 p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -m-8 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -m-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold">Ready to create a new challenge?</h2>
                            <p className="text-slate-400 text-lg max-w-lg">
                                Use our visual builder to create custom RW or Math modules with full Desmos support.
                            </p>
                            <Link 
                                href="/teacher/tests/new"
                                className="inline-flex items-center gap-2 rounded-2xl bg-white text-slate-900 px-8 py-4 font-bold hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                Create New Test
                            </Link>
                        </div>
                        <div className="hidden lg:block">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-blue-400">1.2s</div>
                                    <div className="text-xs text-slate-400">Avg. Load Time</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-emerald-400">99.9%</div>
                                    <div className="text-xs text-slate-400">Reliability Rate</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-purple-400">4k+</div>
                                    <div className="text-xs text-slate-400">Questions Ready</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <div className="text-2xl font-bold text-amber-400">PRO</div>
                                    <div className="text-xs text-slate-400">Account Level</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardCard({
    title,
    desc,
    href,
    icon,
    color,
    cta,
    disabled = false
}: {
    title: string;
    desc: string;
    href: string;
    icon: React.ReactNode;
    color: string;
    cta: string;
    disabled?: boolean;
}) {
    const Content = (
        <div className={`group h-full rounded-[2rem] bg-white border border-slate-100 p-8 transition-all duration-300 ${disabled ? 'opacity-60 grayscale' : 'hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:border-slate-200 shadow-sm'}`}>
            <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
            <p className="text-slate-500 leading-relaxed mb-8">{desc}</p>
            {!disabled && (
                <div className="flex items-center text-sm font-bold text-blue-600 group-hover:gap-2 transition-all">
                    {cta} 
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </div>
            )}
            {disabled && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    Planned Feature
                </span>
            )}
        </div>
    );

    if (disabled) return Content;
    return <Link href={href} className="block h-full">{Content}</Link>;
}
