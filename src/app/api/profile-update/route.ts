import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export async function POST(req: NextRequest) {
  try {
    const { id, profile, organisation_id, organisation } = await req.json();
    if (!id || !profile) return NextResponse.json({ error: 'Missing id or profile' }, { status: 400 });

    const { url, key } = getSupabaseConfig();
    const headers = supabaseHeaders(key);

    // Update innovator if provided
    if (organisation_id && organisation) {
      await fetch(`${url}/rest/v1/innovators?id=eq.${organisation_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          name: organisation.name,
          country: organisation.country,
          org_type: organisation.org_type,
          founded_year: organisation.founded_year,
          team_size: organisation.team_size,
          african_led: organisation.african_led,
          track_record_description: organisation.track_record_description,
        }),
      }).catch(() => {});
    }

    // Fetch current state for changelog
    const currentRes = await fetch(
      `${url}/rest/v1/innovations?id=eq.${id}&limit=1`,
      { headers, cache: 'no-store' }
    );
    const currentRows = currentRes.ok ? await currentRes.json() : [];
    const current = currentRows[0] || {};

    const body = {
      name: profile.name,
      theme: profile.theme,
      stage: profile.stage,
      evidence_status: profile.evidence_status,
      investment_thesis: profile.investment_thesis,
      problem_statement: profile.problem_statement,
      opportunity_statement: profile.opportunity_statement,
      model_steps: profile.model_steps,
      adoption_pathway_bullets: profile.adoption_pathway_bullets,
      evidence_stats: profile.evidence_stats,
      evidence_interpretation: profile.evidence_interpretation,
      cost_per_teacher_now: profile.cost_per_teacher_now,
      cost_per_teacher_scale: profile.cost_per_teacher_scale,
      marginal_cost_at_scale: profile.marginal_cost_at_scale,
      funding_ask_base: profile.funding_ask_base,
      funding_ask_duration: profile.funding_ask_duration,
      funding_covers: profile.funding_covers,
      ask_funder_outcome: profile.ask_funder_outcome,
      government_relationships: profile.government_relationships,
      quote: profile.quote,
      quote_attribution: profile.quote_attribution,
      pilot_scope: profile.pilot_scope,
      maturity_demonstrated: profile.maturity_demonstrated,
      maturity_to_validate: profile.maturity_to_validate,
      maturity_outlook: profile.maturity_outlook,
      ask_for_funders: profile.ask_for_funders,
      ask_for_governments: profile.ask_for_governments,
      confidence_flags: profile.confidence_flags,
      web_augmented_fields: profile.web_augmented_fields,
      status: profile.status || 'draft',
    };

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

    const res = await fetch(`${url}/rest/v1/innovations?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });

    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const [updated] = await res.json();

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
