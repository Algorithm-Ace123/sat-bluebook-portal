import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { access_token, refresh_token, expires_at } = body || {};

    // Diagnostics: log basic info (mask tokens)
    const mask = (t: string | undefined) => (t ? `${t.slice(0, 6)}...${t.slice(-6)}` : null);
    console.log(`[/api/auth/set-session] Received body: access_token=${mask(access_token)}, refresh_token=${!!refresh_token}, expires_at=${expires_at}`);
    const cookieStore = cookies();
    console.log(`[/api/auth/set-session] Incoming cookies: ${cookieStore.getAll().map(c => c.name + (c.name.includes('auth') ? '=***' : `=${c.value}`)).join(', ')}`);

    if (!access_token) {
      return NextResponse.json({ ok: false, error: 'Missing access_token' }, { status: 400 });
    }

    // Try to extract project ID from URL, fallback to 'supabase'
    const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1] || 'supabase';
    const sdkCookieName = `sb-${projectId}-auth-token`;

    const now = Math.floor(Date.now() / 1000);
    const maxAge = expires_at && typeof expires_at === 'number' ? Math.max(0, expires_at - now) : 60 * 60;

    const response = NextResponse.json({ ok: true });
    
    // Prevent edge caching to ensure cookies propagate correctly
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');

    console.log(`[/api/auth/set-session] Will set cookies: sb-access-token (maxAge=${maxAge})`);

    // Cookie options
    const options = {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      maxAge: maxAge
    };

    // 1. Set our legacy/marker cookies (easy for Middleware and client fallback)
    response.cookies.set('sb-access-token', access_token, options);
    if (refresh_token) {
      response.cookies.set('sb-refresh-token', refresh_token, { ...options, maxAge: 60 * 60 * 24 * 30 });
    }

    // 2. COOKIE STRATEGY: MINIMAL FOOTPRINT
    // We do NOT set the project-specific SDK cookie (sb-[project]-auth-token) here.
    // Why? It duplicates the access_token (JWT), doubling the header size.
    // If the JWT is ~2KB, setting it twice hits the 4KB Vercel limit, causing ALL cookies to drop.
    // Instead, we set ONLY 'sb-access-token' and 'sb-refresh-token'.
    // The lib/supabase.ts client is smart enough to intercept requests for the SDK cookie
    // and dynamically construct the expected JSON from these two raw cookies.

    console.log(`[/api/auth/set-session] Cookies set: sb-access-token (MaxAge: ${maxAge})`);

    return response;
  } catch (err: any) {
    console.error('set-session error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
