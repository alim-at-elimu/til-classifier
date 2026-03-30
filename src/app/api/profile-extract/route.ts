import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { emptyInnovation, emptyInnovator } from '@/lib/profile-types';
import { getAnthropicKey } from '@/lib/anthropic-key';

export const maxDuration = 300;

const HUMAN_ONLY_FIELDS = ['investment_thesis', 'maturity_to_validate', 'maturity_outlook', 'ask_for_funders', 'ask_for_governments', 'ask_funder_outcome', 'evidence_interpretation'];

const EXTRACTION_PROMPT = `You are an expert at extracting structured data from education innovator documents.

Extract data into a JSON object with TWO top-level keys: "innovator" and "innovation".

innovator fields:
- name (string): Organisation or innovator name
- country (string): Primary country of operation
- org_type (string): One of "NGO", "Social enterprise", "Government agency", "University", or "Other"
- founded_year (string): Year founded
- team_size (string): Number of team members
- african_led (boolean): Whether the organisation is African-led
- track_record_description (string): One sentence on years of operation and existing reach

innovation fields:
- name (string): Name of the specific innovation or programme
- theme (string, one of: "Individual Teacher Support", "Group Coaching and Peer Learning", "Closing the Data-to-Action Loop", "Finding and Spreading What Already Works")
- stage (string, one of: "Proof", "Pilot-ready", "Scaling")
- evidence_status (string, one of: "Established", "Promising", "Emerging")
- problem_statement (string): 1-2 sentences on the core problem addressed
- opportunity_statement (string): 1-2 sentences on the solution approach or opportunity
- model_steps (array of up to 4 strings): How the innovation works step by step
- adoption_pathway_bullets (array of up to 5 strings): What existing infrastructure it uses, what it does not require, what government systems it aligns with
- evidence_stats (array of up to 4 objects with { number, label, source }): Key evidence statistics
- cost_per_teacher_now (string): Current cost per teacher
- cost_per_teacher_scale (string): Projected cost per teacher at scale
- marginal_cost_at_scale (string): Marginal cost per additional teacher at scale
- funding_ask_base (string): Funding ask extracted from documents
- funding_ask_duration (string): Duration of the funding ask
- funding_covers (array of up to 5 strings): What the funding covers
- government_relationships (array of objects with { country, ministry, status, focal_point } where status is one of "Active MOU", "In pipeline", "Interest only" and focal_point is boolean)
- quote (string): A single direct quote from a government official or teacher found in the documents
- quote_attribution (string): Attribution for the quote
- pilot_scope (string): Number of schools, teachers, and duration of pilot
- maturity_demonstrated (string): 1-2 sentences on what has been proven
- confidence_flags (array of strings): Field names where extraction is uncertain or null. ALWAYS include: "investment_thesis", "maturity_to_validate", "maturity_outlook", "ask_for_funders", "ask_for_governments", "ask_funder_outcome", "evidence_interpretation".

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
      text: 'Now extract the structured data from all of the above documents. Return JSON with "innovator" and "innovation" keys.',
    });

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
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
    const orgData = parsed.innovator || parsed.organisation || parsed;
    const innData = parsed.innovation || parsed;

    const confidenceFlags: string[] = innData.confidence_flags || parsed.confidence_flags || [];
    for (const hf of HUMAN_ONLY_FIELDS) {
      if (!confidenceFlags.includes(hf)) confidenceFlags.push(hf);
    }

    const innovator = {
      ...emptyInnovator(),
      name: orgData.name || orgData.innovator_name || null,
      country: orgData.country || null,
      org_type: orgData.org_type || null,
      founded_year: orgData.founded_year || null,
      team_size: orgData.team_size || null,
      african_led: orgData.african_led ?? null,
      track_record_description: orgData.track_record_description || null,
    };

    const innovation = {
      ...emptyInnovation(),
      name: innData.name || innovator.name || null,
      theme: innData.theme || null,
      stage: innData.stage || null,
      evidence_status: innData.evidence_status || null,
      investment_thesis: null,
      problem_statement: innData.problem_statement || innData.insight || null,
      opportunity_statement: innData.opportunity_statement || null,
      model_steps: innData.model_steps || [],
      adoption_pathway_bullets: innData.adoption_pathway_bullets || [],
      evidence_stats: innData.evidence_stats || [],
      evidence_interpretation: null,
      cost_per_teacher_now: innData.cost_per_teacher_now || null,
      cost_per_teacher_scale: innData.cost_per_teacher_scale || null,
      marginal_cost_at_scale: innData.marginal_cost_at_scale || null,
      funding_ask_base: innData.funding_ask_base || innData.funding_gap || null,
      funding_ask_duration: innData.funding_ask_duration || null,
      funding_covers: innData.funding_covers || [],
      ask_funder_outcome: null,
      government_relationships: innData.government_relationships || [],
      quote: innData.quote || (innData.quotes && innData.quotes[0]?.text) || null,
      quote_attribution: innData.quote_attribution || (innData.quotes && innData.quotes[0]?.attribution) || null,
      pilot_scope: innData.pilot_scope || null,
      maturity_demonstrated: innData.maturity_demonstrated || null,
      maturity_to_validate: null,
      maturity_outlook: null,
      ask_for_funders: null,
      ask_for_governments: null,
      confidence_flags: confidenceFlags,
    };

    // Return both new names and legacy aliases for backward compat
    return NextResponse.json({ innovator, innovation, organisation: innovator, profile: innovation });
  } catch (err) {
    console.error('Profile extraction error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Extraction failed' },
      { status: 500 }
    );
  }
}
