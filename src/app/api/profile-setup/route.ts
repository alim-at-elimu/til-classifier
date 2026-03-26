import { NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { url, key } = getSupabaseConfig();

    // Check if tables exist
    const checkRes = await fetch(
      `${url}/rest/v1/organisations?select=id&limit=0`,
      { headers: supabaseHeaders(key) }
    );

    if (checkRes.ok) {
      return NextResponse.json({ success: true, message: 'Tables exist' });
    }

    return NextResponse.json(
      { error: 'Tables not found. Run the migration SQL in the Supabase SQL Editor.' },
      { status: 422 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Setup failed' },
      { status: 500 }
    );
  }
}
