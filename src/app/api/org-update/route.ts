import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export async function POST(req: NextRequest) {
  try {
    const { id, organisation } = await req.json();
    if (!id || !organisation) return NextResponse.json({ error: 'Missing id or organisation' }, { status: 400 });

    const { url, key } = getSupabaseConfig();
    const res = await fetch(`${url}/rest/v1/innovators?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...supabaseHeaders(key), Prefer: 'return=representation' },
      body: JSON.stringify({
        name: organisation.name,
        country: organisation.country,
        org_type: organisation.org_type,
        founded_year: organisation.founded_year,
        team_size: organisation.team_size,
        african_led: organisation.african_led,
        track_record_description: organisation.track_record_description,
      }),
    });

    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const [updated] = await res.json();
    return NextResponse.json({ organisation: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
