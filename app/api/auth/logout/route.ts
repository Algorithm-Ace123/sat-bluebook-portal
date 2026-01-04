import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase";
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();

    // Also explicitly clear auth cookies
    const cookieStore = cookies();
    const clear = (name: string) => cookieStore.set({ name, value: '', path: '/', maxAge: 0 });
    clear('sb-access-token');
    clear('sb-refresh-token');
    clear('sb-session');

    return NextResponse.redirect(new URL("/login", req.url));
}
