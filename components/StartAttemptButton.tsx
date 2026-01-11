"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function StartAttemptButton({
    assignmentId,
    label = "Resume Mock Exam",
    className
}: {
    assignmentId: string,
    label?: string,
    className?: string
}) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleStart() {
        try {
            setLoading(true);
            const supabase = await supabaseBrowser();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                // If not logged in client-side, force re-login
                router.push("/login?next=/student");
                return;
            }

            // Call API with explicit Bearer token to bypass cookie issues
            const res = await fetch("/api/attempts/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ assignmentId })
            });

            if (res.redirected) {
                // Should not happen with JSON switch, but just in case
                window.location.href = res.url;
                return;
            }

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || "Failed to start attempt");
            }

            if (json.attemptId) {
                router.push(`/test/${json.attemptId}`);
            } else if (json.url) {
                router.push(json.url);
            }

        } catch (err: any) {
            console.error("Failed to start attempt:", err);
            alert("Error starting test: " + err.message);
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleStart}
            disabled={loading}
            className={className || "inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white px-8 py-4 font-bold hover:bg-blue-700 transition shadow-xl shadow-blue-200 w-full md:w-auto active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"}
        >
            {loading ? (
                <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                </>
            ) : (
                <>
                    {label}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7M3 12h18" /></svg>
                </>
            )}
        </button>
    );
}
