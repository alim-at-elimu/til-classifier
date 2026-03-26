import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export async function POST(req: NextRequest) {
  try {
    const { organisation } = await req.json();
    if (!organisation) return NextResponse.json({ error: 'No organisation provided' }, { status: 400 });

    const { url, key } = getSupabaseConfig();
    const res = await fetch(`${url}/rest/v1/organisations`, {
      method: 'POST',
      headers: { ...supabaseHeaders(key), Prefer: 'return=representation' },
      body: JSON.stringify({
        name: organisation.name,
        country: organisation.country,
        founded_year: organisation.founded_year,
        team_size: organisation.team_size,
        african_led: organisation.african_led,
      }),
    });

    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const [created] = await res.json();
    return NextResponse.json({ id: created.id, organisation: created });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
