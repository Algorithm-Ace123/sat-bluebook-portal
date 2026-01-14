import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { access_token, refresh_token } = body || {};

    if (!access_token) {
      return NextResponse.json({ ok: false, error: 'Missing access_token' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https?:\/\/([^.]+)/)?.[1] || 'supabase';
    const sdkCookieName = `sb-${projectId}-auth-token`;

    const now = Math.floor(Date.now() / 1000);
    const maxAge = 60 * 60 * 24 * 30; // 30 days as reasonable fallback

    const response = NextResponse.json({ ok: true });

    const options = {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      maxAge
    };

    // Set both the raw access token (legacy) and a project-specific SDK cookie
    response.cookies.set('sb-access-token', access_token, options);
    response.cookies.set(sdkCookieName, JSON.stringify([access_token, refresh_token || '', null, null]), options);

    console.log(`[/api/auth/force-sdk-cookie] Set cookies: sb-access-token, ${sdkCookieName}`);

    return response;
  } catch (err: any) {
    console.error('[/api/auth/force-sdk-cookie] error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
