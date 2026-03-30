import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const { url, key } = getSupabaseConfig();

    const res = await fetch(
      `${url}/rest/v1/innovations?id=eq.${id}&limit=1`,
      { headers: supabaseHeaders(key), cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const rows = await res.json();
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const profile = rows[0];

    let organisation = null;
    if (profile.innovator_id) {
      const orgRes = await fetch(
        `${url}/rest/v1/innovators?id=eq.${profile.innovator_id}&limit=1`,
        { headers: supabaseHeaders(key), cache: 'no-store' }
      );
      if (orgRes.ok) {
        const orgs = await orgRes.json();
        if (orgs.length) organisation = orgs[0];
      }
    }

    return NextResponse.json({ profile, organisation });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
