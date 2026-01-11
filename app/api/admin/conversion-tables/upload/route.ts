import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { name, section, maxRaw, mapping } = await req.json();
    if (!name || !section || !mapping) {
      return NextResponse.json({ ok: false, error: 'Missing required fields: name, section, mapping' }, { status: 400 });
    }

    // Basic validation
    if (section !== 'RW' && section !== 'MATH') {
      return NextResponse.json({ ok: false, error: 'Invalid section. Must be RW or MATH.' }, { status: 400 });
    }

    // Expect mapping to be object { raw:number: score:number }
    const keys = Object.keys(mapping).map(k => Number(k)).filter(k => !Number.isNaN(k));
    if (keys.length === 0) {
      return NextResponse.json({ ok: false, error: 'Mapping must contain at least one raw->score entry' }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // Try to insert into conversion_tables table
    const { data, error } = await supabase
      .from('conversion_tables')
      .insert([{ name, section, max_raw: maxRaw || Math.max(...keys), mapping }])
      .select()
      .limit(1)
      .single();

    if (error) {
      // If table missing, return helpful message
      if (error.message && error.message.includes('does not exist')) {
        return NextResponse.json({ ok: false, error: 'Database table `conversion_tables` does not exist. Create it in Supabase with schema: id uuid primary key default gen_random_uuid(), name text, section text, max_raw int, mapping jsonb, created_at timestamptz default now(), created_by text' }, { status: 500 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, table: data });
  } catch (err: any) {
    console.error('upload conversion table error', err);
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
