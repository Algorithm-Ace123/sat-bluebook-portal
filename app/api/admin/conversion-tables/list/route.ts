import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.from('conversion_tables').select('*').order('created_at', { ascending: false });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, tables: data });
  } catch (err: any) {
    console.error('list conversion tables error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
