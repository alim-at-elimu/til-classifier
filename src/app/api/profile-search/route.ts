import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Organisation, InnovatorProfile } from '@/lib/profile-types';
import { getAnthropicKey } from '@/lib/anthropic-key';

export const maxDuration = 300;

const AUGMENTATION_PROMPT = `You are augmenting an education innovator profile with web search results.

You receive an organisation object and an innovation profile. Search the web and fill in null/empty fields.

Rules:
1. Only fill fields that are currently null or empty.
2. Return JSON with three keys:
   - "org_updates": object with updated organisation fields only
   - "innovation_updates": object with updated innovation fields only
   - "web_augmented_fields": array of field names filled from web
3. Do NOT change fields that already have values.
4. NEVER fill quotes from web sources. Quotes must come only from submitted documents.
5. For government_relationships: do NOT duplicate existing entries.
6. Return ONLY valid JSON.`;

export async function POST(req: NextRequest) {
  try {
    const { organisation, profile } = (await req.json()) as {
      organisation: Organisation;
      profile: InnovatorProfile;
    };

    if (!organisation || !profile) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const orgName = organisation.name;
    if (!orgName) {
      return NextResponse.json({ organisation, profile });
    }

    const client = new Anthropic({ apiKey: getAnthropicKey() });

    // Find null fields
    const nullOrgFields: string[] = [];
    for (const [k, v] of Object.entries(organisation)) {
      if (k === 'id') continue;
      if (v === null || v === undefined) nullOrgFields.push(k);
    }

    const nullInnoFields: string[] = [];
    const scalarKeys = ['theme', 'insight', 'cost_per_teacher_now', 'cost_per_teacher_scale', 'funding_gap', 'stage'] as const;
    for (const k of scalarKeys) {
      if (profile[k] === null || profile[k] === undefined) nullInnoFields.push(k);
    }
    if (profile.model_steps.length === 0) nullInnoFields.push('model_steps');
    if (profile.evidence_stats.length === 0) nullInnoFields.push('evidence_stats');
    if (profile.government_relationships.length === 0) nullInnoFields.push('government_relationships');

    if (nullOrgFields.length === 0 && nullInnoFields.length === 0) {
      return NextResponse.json({ organisation, profile });
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4096,
      system: AUGMENTATION_PROMPT,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [{
        role: 'user',
        content: `Organisation: ${JSON.stringify(organisation)}
Innovation profile: ${JSON.stringify(profile)}
Null org fields: ${nullOrgFields.join(', ')}
Null innovation fields: ${nullInnoFields.join(', ')}

Search for "${orgName}" ${organisation.country || ''} education and augment. Return JSON.`,
      }],
    });

    const textBlocks = response.content.filter((b) => b.type === 'text');
    const lastText = textBlocks[textBlocks.length - 1];
    if (!lastText || lastText.type !== 'text') {
      return NextResponse.json({ organisation, profile });
    }

    let rawJson = lastText.text.trim();
    if (rawJson.startsWith('```')) {
      rawJson = rawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      const parsed = JSON.parse(rawJson);
      const orgUpdates = parsed.org_updates || {};
      const innoUpdates = parsed.innovation_updates || {};
      const webFields: string[] = parsed.web_augmented_fields || [];

      // Apply org updates
      const augOrg = { ...organisation };
      for (const [k, v] of Object.entries(orgUpdates)) {
        if (k in augOrg && v !== null) {
          (augOrg as Record<string, unknown>)[k] = v;
        }
      }

      // Apply innovation updates (with dedup for arrays)
      const augProfile = { ...profile };
      for (const [k, v] of Object.entries(innoUpdates)) {
        if (k === 'quotes') continue; // Never from web
        if (k === 'government_relationships' && Array.isArray(v)) {
          const existing = new Set(
            profile.government_relationships.map((g) => `${g.country}::${g.ministry}`.toLowerCase())
          );
          const newRels = (v as InnovatorProfile['government_relationships']).filter(
            (g) => !existing.has(`${g.country}::${g.ministry}`.toLowerCase())
          );
          if (newRels.length > 0) {
            augProfile.government_relationships = [...profile.government_relationships, ...newRels];
          }
        } else if (k === 'model_steps' && profile.model_steps.length > 0) {
          continue;
        } else if (k === 'evidence_stats' && profile.evidence_stats.length > 0) {
          continue;
        } else if (k in augProfile && v !== null) {
          (augProfile as Record<string, unknown>)[k] = v;
        }
      }

      augProfile.web_augmented_fields = [...new Set([...profile.web_augmented_fields, ...webFields])];

      return NextResponse.json({ organisation: augOrg, profile: augProfile });
    } catch {
      return NextResponse.json({ organisation, profile });
    }
  } catch (err) {
    console.error('Profile search error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      { status: 500 }
    );
  }
}
