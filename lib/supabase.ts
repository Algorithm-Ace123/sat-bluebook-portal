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

                    if (!val && name.includes("auth-token")) {
                        const rawVal = cookieStore.get("sb-access-token")?.value;
                        if (rawVal) {
                            // Supabase SSR expects the auth-token cookie to be a JSON-stringified array or object.
                            // If our manual cookie is a raw JWT, we wrap it to satisfy the parser.
                            if (!rawVal.startsWith("{") && !rawVal.startsWith("[")) {
                                console.log(`[supabaseServer] Wrapping raw sb-access-token for ${name}`);
                                const refreshToken = cookieStore.get("sb-refresh-token")?.value || null;
                                val = JSON.stringify([rawVal, refreshToken, null, null]);
                            } else {
                                val = rawVal;
                            }
                        }
                    }

                    if (!val && name.includes("session")) {
                        val = cookieStore.get("sb-session")?.value;
                        if (val) {
                            console.log(`[supabaseServer] Fallback: using sb-session for ${name}`);
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
