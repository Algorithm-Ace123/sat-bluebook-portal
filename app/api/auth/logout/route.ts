import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();

    // Also explicitly clear all possible cookies to be safe
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    allCookies.forEach(cookie => {
        if (cookie.name.includes("-auth-token") || cookie.name.startsWith("sb-")) {
            cookieStore.set({ name: cookie.name, value: '', path: '/', maxAge: 0 });
        }
    });

    // Explicit legacy clear
    cookieStore.set({ name: 'sb-access-token', value: '', path: '/', maxAge: 0 });
    cookieStore.set({ name: 'sb-refresh-token', value: '', path: '/', maxAge: 0 });
    cookieStore.set({ name: 'sb-session', value: '', path: '/', maxAge: 0 });

    return NextResponse.redirect(new URL("/login", req.url));
}
