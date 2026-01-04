// lib/supabase-browser.ts
"use client";

/**
 * Client for browser (client components)
 * Dynamically import to avoid bundling Node-specific APIs in server builds.
 */
export async function supabaseBrowser() {
    const { createBrowserClient } = await import("@supabase/ssr");
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
