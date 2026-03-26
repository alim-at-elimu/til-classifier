import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export async function POST(req: NextRequest) {
  try {
    const { id, profile } = await req.json();
    if (!id || !profile) return NextResponse.json({ error: 'Missing id or profile' }, { status: 400 });

    const { url, key } = getSupabaseConfig();
    const headers = supabaseHeaders(key);

    // 1. Fetch current state for changelog diff
    const currentRes = await fetch(
      `${url}/rest/v1/innovator_profiles?id=eq.${id}&limit=1`,
      { headers, cache: 'no-store' }
    );
    const currentRows = currentRes.ok ? await currentRes.json() : [];
    const current = currentRows[0] || {};

    // 2. Build update body (innovation-level fields only)
    const body = {
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
      status: profile.status || 'draft',
    };

    // 3. Compute changelog entries
    const changelogEntries: { profile_id: string; field_name: string; old_value: unknown; new_value: unknown }[] = [];
    for (const [field, newVal] of Object.entries(body)) {
      const oldVal = current[field];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changelogEntries.push({
          profile_id: id,
          field_name: field,
          old_value: oldVal !== undefined ? oldVal : null,
          new_value: newVal !== undefined ? newVal : null,
        });
      }
    }

    // 4. PATCH the profile
    const res = await fetch(`${url}/rest/v1/innovator_profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });

    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const [updated] = await res.json();

    // 5. Insert changelog entries (non-blocking)
    if (changelogEntries.length > 0) {
      await fetch(`${url}/rest/v1/profile_changelog`, {
        method: 'POST',
        headers,
        body: JSON.stringify(changelogEntries),
      }).catch(() => {});
    }

    return NextResponse.json({ profile: updated, changes: changelogEntries.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Update failed' }, { status: 500 });
  }
}
