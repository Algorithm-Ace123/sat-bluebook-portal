import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { access_token, refresh_token, expires_at, session } = body || {};
    if (!access_token) {
      return NextResponse.json({ ok: false, error: 'Missing access_token' }, { status: 400 });
    }

    // Compute maxAge/expires
    const now = Math.floor(Date.now() / 1000);
    const maxAge = expires_at && typeof expires_at === 'number' ? Math.max(0, expires_at - now) : 60 * 60; // default 1h

    const cookieStore = cookies();

    // Set tokens so middleware and server can detect authenticated users
    cookieStore.set({
      name: 'sb-access-token',
      value: access_token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
      maxAge,
    });

    if (refresh_token) {
      cookieStore.set({
        name: 'sb-refresh-token',
        value: refresh_token,
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: true,
        // Keep refresh tokens longer
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    // Also set a session marker cookie (not httpOnly) so client-side code can detect logged-in state if needed
    if (session) {
      cookieStore.set({
        name: 'sb-session',
        value: JSON.stringify(session),
        httpOnly: false,
        path: '/',
        sameSite: 'lax',
        secure: true,
        maxAge,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('set-session error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
