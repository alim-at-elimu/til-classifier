import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get('profile_id');
  if (!profileId) return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 });

  try {
    const { url, key } = getSupabaseConfig();
    const res = await fetch(
      `${url}/rest/v1/profile_changelog?profile_id=eq.${profileId}&order=changed_at.desc&limit=100`,
      { headers: supabaseHeaders(key), cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const entries = await res.json();
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
