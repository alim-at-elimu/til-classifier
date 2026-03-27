import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(
      `${url}/rest/v1/innovators?select=id,name,country,org_type,founded_year,team_size,african_led,track_record_description,created_at&order=name.asc`,
      { headers: supabaseHeaders(key), cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const innovators = await res.json();

    const countRes = await fetch(
      `${url}/rest/v1/innovations?select=innovator_id&order=innovator_id`,
      { headers: supabaseHeaders(key), cache: 'no-store' }
    );
    const countMap: Record<string, number> = {};
    if (countRes.ok) {
      const rows = await countRes.json();
      for (const r of rows) {
        countMap[r.innovator_id] = (countMap[r.innovator_id] || 0) + 1;
      }
    }

    const result = innovators.map((o: Record<string, unknown>) => ({
      ...o,
      innovation_count: countMap[o.id as string] || 0,
    }));

    return NextResponse.json({ organisations: result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
