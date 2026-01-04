// lib/supabase.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";


/**
 * Client for server (server components + route handlers)
 */
export function supabaseServer() {
    const cookieStore = cookies();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // If env vars are missing (e.g., in a preview environment without secrets),
    // return a safe fallback client that treats the user as unauthenticated
    // and prevents runtime crashes when server pages are executed.
    if (!url || !key) {
        console.warn(
            "Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Returning fallback client."
        );
        return {
            auth: {
                getUser: async () => ({ data: { user: null } })
            },
            // Minimal `from` helper used by server pages; returns a no-op that yields null data
            from: (_: string) => ({ select: async () => ({ data: null, error: null }) })
        } as any;
    }

    return createServerClient(
        url,
        key,
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
