import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Missing email or password' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON) {
      return NextResponse.json({ ok: false, error: 'Missing Supabase public envs on server' }, { status: 500 });
    }

    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
      },
      body: JSON.stringify({
        grant_type: 'password',
        email,
        password,
      }),
    });

    const json = await resp.json();

    // Return the supabase response but strip any sensitive bits if present
    return NextResponse.json({ ok: resp.ok, status: resp.status, body: json });
  } catch (err: any) {
    console.error('login-test error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
