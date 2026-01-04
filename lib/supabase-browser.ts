// lib/supabase-browser.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client for browser (client components)
 */
export function supabaseBrowser() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
