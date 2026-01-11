import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { access_token, refresh_token } = body || {};

    if (!access_token) {
      return NextResponse.json({ ok: false, error: 'Missing access_token' }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // This will automatically set the cookies using the format and names expected by @supabase/ssr
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || ''
    });

    if (error) {
      console.error('setSession error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log(`[/api/auth/set-session] Successfully set session via Supabase SDK`);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('set-session error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
