import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    const present = !!(data && data.user);
    return NextResponse.json({ ok: true, user: present });
  } catch (err: any) {
    console.error('[/api/auth/check] error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
