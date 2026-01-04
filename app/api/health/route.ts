import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    // Simple call to ensure client initializes; don't rely on cookies
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, hasUser: !!data.user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
