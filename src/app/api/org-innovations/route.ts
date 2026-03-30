import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('org_id');
  if (!orgId) return NextResponse.json({ error: 'Missing org_id' }, { status: 400 });

  try {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(
      `${url}/rest/v1/innovations?innovator_id=eq.${orgId}&select=id,name,theme,stage,status,created_at,confidence_flags,web_augmented_fields&order=created_at.desc`,
      { headers: supabaseHeaders(key), cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const innovations = await res.json();
    return NextResponse.json({ innovations });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
