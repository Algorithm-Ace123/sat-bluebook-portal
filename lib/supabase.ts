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
        throw new Error(`Missing required env vars:${!URL? ' NEXT_PUBLIC_SUPABASE_URL':''}${!KEY? ', NEXT_PUBLIC_SUPABASE_ANON_KEY':''}. Add them to Vercel and run ` + "`npm run check:env`.");
    }

    const { createServerClient } = await import("@supabase/ssr");
    const cookieStore = cookies();

    return createServerClient(
        URL,
        KEY,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
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
