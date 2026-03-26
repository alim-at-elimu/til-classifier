import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(
      `${url}/rest/v1/organisations?select=id,name,country,founded_year,team_size,african_led,created_at&order=name.asc`,
      { headers: supabaseHeaders(key), cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const organisations = await res.json();

    // Get innovation counts per org
    const countRes = await fetch(
      `${url}/rest/v1/innovator_profiles?select=organisation_id&order=organisation_id`,
      { headers: supabaseHeaders(key), cache: 'no-store' }
    );
    const countMap: Record<string, number> = {};
    if (countRes.ok) {
      const rows = await countRes.json();
      for (const r of rows) {
        countMap[r.organisation_id] = (countMap[r.organisation_id] || 0) + 1;
      }
    }

    const orgsWithCounts = organisations.map((o: Record<string, unknown>) => ({
      ...o,
      innovation_count: countMap[o.id as string] || 0,
    }));

    return NextResponse.json({ organisations: orgsWithCounts });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
