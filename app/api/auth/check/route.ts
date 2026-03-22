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

    const response = NextResponse.json({ ok: true, user: present, cookies: { names: cookieNames, hasSdk, hasLegacy } });
    // Prevent edge caching to ensure we always check fresh cookies
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    return response;
  } catch (err: any) {
    console.error('[/api/auth/check] error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
