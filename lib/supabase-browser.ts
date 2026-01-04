// lib/supabase-browser.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client for browser (client components)
 */
export function supabaseBrowser() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        // Prevent runtime crash in environments without env vars (e.g., preview)
        console.warn("Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Returning fallback browser client.");
        return {
            auth: {
                signInWithPassword: async (_: any) => ({ data: null, error: { message: "Supabase credentials are not configured." } })
            },
            from: (_: string) => ({ select: async () => ({ data: null, error: { message: "Supabase credentials are not configured." } }) })
        } as any;
    }

    return createBrowserClient(url, key);
}
