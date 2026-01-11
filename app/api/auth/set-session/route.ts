import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { access_token, refresh_token, expires_at } = body || {};

    if (!access_token) {
      return NextResponse.json({ ok: false, error: 'Missing access_token' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const maxAge = expires_at && typeof expires_at === 'number' ? Math.max(0, expires_at - now) : 60 * 60;

    const response = NextResponse.json({ ok: true });

    // Cookie options
    const options = {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      maxAge: maxAge
    };

    // 1. Set our legacy/marker cookies (easy for Middleware to read)
    response.cookies.set('sb-access-token', access_token, options);
    if (refresh_token) {
      response.cookies.set('sb-refresh-token', refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
    }

    // 2. Set the SDK-style cookie manually as a fallback
    // This format satisfies the Supabase SDK parser
    const sdkCookieValue = JSON.stringify([access_token, refresh_token || null, null, null]);
    response.cookies.set('supabase-auth-token', sdkCookieValue, options);

    console.log(`[/api/auth/set-session] Cookies set for session (AT: ${access_token.substring(0, 10)}...)`);

    return response;
  } catch (err: any) {
    console.error('set-session error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
