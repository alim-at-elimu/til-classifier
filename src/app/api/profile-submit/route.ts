import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { profile, organisation_id } = await req.json();
    if (!profile || !organisation_id) {
      return NextResponse.json({ error: 'Missing profile or organisation_id' }, { status: 400 });
    }

    const { url, key } = getSupabaseConfig();

    const body = {
      organisation_id,
      theme: profile.theme,
      insight: profile.insight,
      model_steps: profile.model_steps,
      evidence_stats: profile.evidence_stats,
      cost_per_teacher_now: profile.cost_per_teacher_now,
      cost_per_teacher_scale: profile.cost_per_teacher_scale,
      funding_gap: profile.funding_gap,
      government_relationships: profile.government_relationships,
      stage: profile.stage,
      quotes: profile.quotes || [],
      ask_funders: profile.ask_funders || null,
      ask_governments: profile.ask_governments || null,
      confidence_flags: profile.confidence_flags,
      web_augmented_fields: profile.web_augmented_fields,
      status: 'draft',
    };

    const res = await fetch(`${url}/rest/v1/innovator_profiles`, {
      method: 'POST',
      headers: { ...supabaseHeaders(key), Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });

    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const [saved] = await res.json();
    return NextResponse.json({ id: saved.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 });
  }
}
