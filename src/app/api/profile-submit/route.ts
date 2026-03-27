import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, supabaseHeaders } from '@/lib/supabase-config';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { profile, organisation_id, organisation } = await req.json();
    if (!profile) return NextResponse.json({ error: 'Missing profile' }, { status: 400 });

    const { url, key } = getSupabaseConfig();
    let innovatorId = organisation_id;

    // Upsert innovator if org data provided
    if (organisation && !innovatorId) {
      // Check for existing
      if (organisation.name && organisation.country) {
        const checkRes = await fetch(
          `${url}/rest/v1/innovators?name=eq.${encodeURIComponent(organisation.name)}&country=eq.${encodeURIComponent(organisation.country || '')}&limit=1`,
          { headers: supabaseHeaders(key), cache: 'no-store' }
        );
        if (checkRes.ok) {
          const existing = await checkRes.json();
          if (existing.length > 0) innovatorId = existing[0].id;
        }
      }
      if (!innovatorId) {
        const orgRes = await fetch(`${url}/rest/v1/innovators`, {
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
        if (orgRes.ok) {
          const [created] = await orgRes.json();
          innovatorId = created.id;
        }
      }
    }

    // Also update innovator with any new org fields
    if (innovatorId && organisation) {
      await fetch(`${url}/rest/v1/innovators?id=eq.${innovatorId}`, {
        method: 'PATCH',
        headers: supabaseHeaders(key),
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

    if (!innovatorId) return NextResponse.json({ error: 'No innovator_id resolved' }, { status: 400 });

    const body = {
      innovator_id: innovatorId,
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
      status: 'draft',
    };

    const res = await fetch(`${url}/rest/v1/innovations`, {
      method: 'POST',
      headers: { ...supabaseHeaders(key), Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });

    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const [saved] = await res.json();
    return NextResponse.json({ id: saved.id, innovator_id: innovatorId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Save failed' }, { status: 500 });
  }
}
