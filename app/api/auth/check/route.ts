import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET() {
  try {
    const cookieStore = (await import('next/headers')).cookies();
    const cookieNames = cookieStore.getAll().map(c => c.name).join(', ');
    const hasSdk = cookieStore.getAll().some(c => c.name.includes('-auth-token'));
    const hasLegacy = !!cookieStore.get('sb-access-token')?.value;
    console.log(`[/api/auth/check] Cookies seen: ${cookieNames}; hasSdk:${hasSdk}; hasLegacy:${hasLegacy}`);

    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    const present = !!(data && data.user);
    console.log(`[/api/auth/check] supabase.getUser -> present: ${present}, userId: ${data?.user?.id ?? 'none'}`);

    return NextResponse.json({ ok: true, user: present, cookies: { names: cookieNames, hasSdk, hasLegacy } });
  } catch (err: any) {
    console.error('[/api/auth/check] error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
