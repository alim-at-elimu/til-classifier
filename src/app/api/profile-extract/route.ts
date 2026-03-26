import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { emptyProfile, emptyOrganisation } from '@/lib/profile-types';
import { getAnthropicKey } from '@/lib/anthropic-key';

export const maxDuration = 300;

const EXTRACTION_PROMPT = `You are an expert at extracting structured data from education innovator documents.

Extract data into a JSON object with TWO top-level keys: "organisation" and "innovation".

organisation fields:
- name (string): Organisation or innovator name
- country (string): Primary country of operation
- founded_year (string): Year founded
- team_size (string): Number of team members
- african_led (boolean): Whether the organisation is African-led

innovation fields:
- theme (string, one of: "Individual Teacher Support", "Group Coaching and Peer Learning", "Closing the Data-to-Action Loop", "Finding and Spreading What Already Works")
- insight (string): 2-3 sentences describing what the innovator saw that others missed
- model_steps (array of up to 4 strings): How the innovation works, step by step
- evidence_stats (array of up to 3 objects with { number, label, source }): Key evidence statistics
- cost_per_teacher_now (string): Current cost per teacher
- cost_per_teacher_scale (string): Projected cost per teacher at scale
- funding_gap (string): Funding gap amount or description
- government_relationships (array of objects with { country, ministry, status } where status is one of: "Active MOU", "In pipeline", "Interest only")
- stage (string, one of: "Proof", "Pilot-ready", "Scaling")
- quotes (array of objects with { text, attribution }): Direct quotes from government officials or teachers found in the documents. Only include quotes actually present in the documents.
- confidence_flags (array of strings): Field names where extraction is uncertain or the field is null

For any field that cannot be extracted with confidence, return null and add it to confidence_flags.
Return ONLY valid JSON. No markdown, no commentary.`;

export async function POST(req: NextRequest) {
  try {
    const { files } = await req.json();
    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: getAnthropicKey() });
    const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

    for (const file of files) {
      if (file.type === 'pdf' && file.base64) {
        contentBlocks.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: file.base64 },
        });
        contentBlocks.push({ type: 'text', text: `[Above is the PDF document: ${file.name}]` });
      } else if (file.textContent) {
        contentBlocks.push({
          type: 'text',
          text: `--- File: ${file.name} (XLSX converted to CSV) ---\n${file.textContent}`,
        });
      }
    }

    contentBlocks.push({
      type: 'text',
      text: 'Now extract the structured data from all of the above documents. Return JSON with "organisation" and "innovation" keys.',
    });

    const response = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4096,
      system: EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No text in Claude response' }, { status: 500 });
    }

    let rawJson = textBlock.text.trim();
    if (rawJson.startsWith('```')) {
      rawJson = rawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(rawJson);

    // Handle both old flat format and new split format
    const orgData = parsed.organisation || parsed;
    const innData = parsed.innovation || parsed;

    // Convert legacy quote/quote_attribution to quotes array
    let quotes = innData.quotes || [];
    if (quotes.length === 0 && innData.quote) {
      quotes = [{ text: innData.quote, attribution: innData.quote_attribution || '' }];
    }

    const organisation = {
      ...emptyOrganisation(),
      name: orgData.name || orgData.innovator_name || null,
      country: orgData.country || null,
      founded_year: orgData.founded_year || null,
      team_size: orgData.team_size || null,
      african_led: orgData.african_led ?? null,
    };

    const profile = {
      ...emptyProfile(),
      theme: innData.theme || null,
      insight: innData.insight || null,
      model_steps: innData.model_steps || [],
      evidence_stats: innData.evidence_stats || [],
      cost_per_teacher_now: innData.cost_per_teacher_now || null,
      cost_per_teacher_scale: innData.cost_per_teacher_scale || null,
      funding_gap: innData.funding_gap || null,
      government_relationships: innData.government_relationships || [],
      stage: innData.stage || null,
      quotes,
      confidence_flags: innData.confidence_flags || parsed.confidence_flags || [],
    };

    return NextResponse.json({ organisation, profile });
  } catch (err) {
    console.error('Profile extraction error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Extraction failed' },
      { status: 500 }
    );
  }
}
