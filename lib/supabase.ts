// lib/supabase.ts
import { cookies } from "next/headers";

/**
 * Client for server (server components + route handlers)
 * Dynamically imports @supabase/ssr to avoid bundling Node-only APIs into Edge runtime.
 */
export async function supabaseServer() {
    const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!URL || !KEY) {
        throw new Error(`Missing required env vars:${!URL ? ' NEXT_PUBLIC_SUPABASE_URL' : ''}${!KEY ? ', NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''}. Add them to Vercel and run ` + "`npm run check:env`.");
    }

    const { createServerClient } = await import("@supabase/ssr");
    const cookieStore = cookies();
    console.log(`[supabaseServer] Initializing with cookies: ${cookieStore.getAll().map(c => c.name).join(", ")}`);

    return createServerClient(
        URL,
        KEY,
        {
            cookies: {
                get(name: string) {
                    const cookie = cookieStore.get(name);
                    let val = cookie?.value;

                    // Fallback logic for when the SDK asks for a project-specific cookie name
                    // that we didn't explicitly set, or if it's looking for chunks.
                    if (!val && (name.includes("auth-token") || name.includes("session"))) {
                        // Check for our manually set tokens
                        val = cookieStore.get("supabase-auth-token")?.value ??
                            cookieStore.get("sb-access-token")?.value;

                        if (val) {
                            console.log(`[supabaseServer] FALLBACK FOUND for ${name} using ${val.includes("[") ? "SDK-styled" : "Raw"} token`);
                            // If it's a raw token, wrap it to satisfy the SDK parser
                            if (!val.startsWith("{") && !val.startsWith("[")) {
                                const refreshToken = cookieStore.get("sb-refresh-token")?.value || null;
                                val = JSON.stringify([val, refreshToken, null, null]);
                            }
                        }
                    }

                    console.log(`[supabaseServer] get cookie: ${name}, found: ${!!val}`);
                    return val;
                },
                set(name: string, value: string, options: any) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: any) {
                    try {
                        cookieStore.set({ name, value: "", ...options });
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                }
            }
        }
    );
} 
