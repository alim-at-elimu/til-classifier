import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export async function POST(req: NextRequest) {
  try {
    const { organisation } = await req.json();
    if (!organisation) return NextResponse.json({ error: 'No organisation provided' }, { status: 400 });

    const { url, key } = getSupabaseConfig();

    // Check for existing innovator with same name+country
    if (organisation.name && organisation.country) {
      const checkRes = await fetch(
        `${url}/rest/v1/innovators?name=eq.${encodeURIComponent(organisation.name)}&country=eq.${encodeURIComponent(organisation.country)}&limit=1`,
        { headers: supabaseHeaders(key), cache: 'no-store' }
      );
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing.length > 0) return NextResponse.json({ id: existing[0].id, organisation: existing[0] });
      }
    }

    const res = await fetch(`${url}/rest/v1/innovators`, {
      method: 'POST',
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
    const [created] = await res.json();
    return NextResponse.json({ id: created.id, organisation: created });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
