import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(
      `${url}/rest/v1/innovations?select=id,innovator_id,name,theme,stage,status,created_at,confidence_flags,web_augmented_fields,innovators(name,country)&order=created_at.desc`,
      { headers: supabaseHeaders(key), cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const profiles = await res.json();
    return NextResponse.json({ profiles });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
