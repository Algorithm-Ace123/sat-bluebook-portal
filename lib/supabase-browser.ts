// lib/supabase-browser.ts
"use client";

/**
 * Client for browser (client components)
 * Dynamically import to avoid bundling Node-specific APIs in server builds.
 */
export async function supabaseBrowser() {
    const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!URL || !KEY) {
        throw new Error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY. Ensure they are set in your environment.');
    }
    const { createBrowserClient } = await import("@supabase/ssr");
    return createBrowserClient(
        URL,
        KEY
    );
}
