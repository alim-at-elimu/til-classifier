import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 600;

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MAX_RETRIES = 3;

import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

function loadAnthropicKey(): string {
  const envKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (envKey) return envKey;

  const candidates = [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "../.."),
    "C:/Users/ladha/til-classifier",
  ];

  for (const dir of candidates) {
    try {
      const envPath = join(dir, ".env.local");
      if (!existsSync(envPath)) continue;
      const content = readFileSync(envPath, "utf-8");
      const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
      if (match) {
        const key = match[1].trim().replace(/\r$/, "");
        process.env.ANTHROPIC_API_KEY = key;
        return key;
      }
    } catch {}
  }
  return "";
}

const ANTHROPIC_KEY = loadAnthropicKey();
function getAnthropicKey(): string {
  return ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY?.trim() || "";
}

const SYSTEM_PROMPT = `You are reviewing a teacher professional development proposal submitted to the Teaching Innovation Lab (TIL), a Gates Foundation-funded program testing innovations across nine African countries. Your task is not to evaluate or score. Your task is to answer five specific questions factually and descriptively, based on what the proposal actually says. Be conservative. Do not interpret or infer beyond what is written. Where the proposal is silent, say so plainly.

For each of the five questions, return the following three fields.
answer: 1-2 short paragraphs of factual, descriptive prose. Be concise. Every sentence must carry information. If a point can be made in one sentence, do not use two. Write what the proposal says. Embed verbatim quotes where they anchor a claim or clarify something that would otherwise require interpretation. Do not use hedging language like "this suggests" or "this indicates." State what is there.
questions: an array of specific, direct questions that would give a clearer picture of this topic. Generate questions regardless of status. Even a well-evidenced answer may have angles worth probing. There is no minimum or maximum number.
status: one of "green", "amber", or "red", as a conservative read on whether the answer is sufficient, partial, or absent.

Q1. in_country_presence
Is this organization or consortia currently implementing work inside the public school system in the country where they have applied? Assess the proposal as a whole. If any member of a consortia is actively operating in-country within government schools, that is sufficient. Flag clearly if the only operational track record cited is in a different country. Green means active in-country school system presence, regardless of which partner carries it. Amber means there is presence in the country but it is unclear whether it is inside the public school system or parallel to it. Red means the operational track record is built entirely in another country, or no current implementation is described.

Q2. innovation_evidence
Has the core innovation been tested and produced results? Include self-collected data, internal evaluations, and pilot reports, not only RCTs. Describe what was tested, in what context and country, what the results showed including any numbers cited, and what the overall evidence base amounts to. If the proposal references an innovation tested by a third party, assess the evidence for that specific technology or approach, not the implementing organization's general track record. Green means tested with outcome data, however imperfect. Amber means tested but results are directional only with no numbers, or the evidence is for a related but not identical version of the innovation. Red means no evidence of testing, or the innovation is explicitly described as new and untested.

Q3. cost_and_affordability
Using both the proposal narrative and the budget data provided, describe the cost structure of this innovation. What does it cost to deliver, at what scale, and what are the primary cost drivers? Then describe what the proposal says or implies about how those costs would be absorbed into government systems over time. We are trying to understand two things: what is the realistic per-teacher or per-child cost of this innovation, and is the financial lift required for government adoption small and incremental, or large and structural. Green means unit costs are stated with a credible pathway to government absorption. Amber means costs are described but the sustainability mechanism is vague or aspirational. Red means no cost information is present, or the cost model has no plausible pathway to government budget absorption.

Q4. fln_track_record
Describe this organization's actual implementation track record. What grades, what subjects, and what type of program have they predominantly delivered? We are not asking what they are proposing to do. We are asking what they have done. Flag clearly if the majority of their experience is in ECD, secondary, or vocational education, even if the proposal frames their work as FLN-relevant. Green means a clear, sustained track record in foundational literacy or numeracy in grades 1-4. Amber means some FLN work but the majority of experience sits in adjacent sectors. Red means no meaningful FLN track record and ECD or secondary is the primary base.

Q5. financial_flexibility
Describe what the proposal says about funding sources beyond the TIL grant. Does the organization reference any co-funding, unrestricted reserves, waived fees, or other contributions they would bring to this pilot? We are trying to understand whether this organization has any financial flexibility that would allow a viable pilot to proceed with partial TIL funding, and if so, what that looks like in practice. Green means explicit co-funding, fee waiver, or a named additional funder is referenced. Amber means there is general language about leveraging existing programs or resources but no specifics. Red means the proposal assumes full TIL funding with no indication of any additional contribution.

In addition to the five questions, return the following two top-level fields.
innovation_summary: Three short paragraphs of flowing prose, each no more than 4-5 sentences. First paragraph: who this organization is, what country they are working in, and what problem they are addressing. Second paragraph: what the core innovation is, where it has been tested before, and what evidence exists that it produces learning outcomes, quoting specific data points if present. Third paragraph: what would need to be true about government systems, cost, and capacity for this to reach scale without sustained donor subsidy.
outreach_email: A short, direct email to the innovator, under 400 words. Open with one sentence acknowledging their proposal by name. Then work through the questions generated across all five topics, grouped logically. For each, state specifically what we looked for and what we need. Frame each ask as a concrete request with a specific format where possible, such as a table, a one-page summary, or a referenced report. Close with a deadline of Friday of the current week and a note that responses will inform the final shortlist decision. Do not use filler phrases. Do not be apologetic. Tone is collegial and direct.

Return a single JSON object with these top-level fields: innovation_summary, q1, q2, q3, q4, q5, each containing answer, questions, and status, and outreach_email.

WRITING STYLE REQUIREMENTS — apply to all prose fields (answer, innovation_summary, outreach_email):

Do not define something by what it isn't before saying what it is. Say what it is directly.

Do not use defensive or negative framing. Cut preamble that establishes what something is not before stating what it is.

Do not use "actually" as emphasis. "The evidence shows" not "What the evidence actually shows."

Do not throat-clear before data. Deliver the data directly. Do not tell the reader to be impressed before showing them why.

Do not use performative adjectives or intensifiers: "stark," "unforgiving," "considerable," "significant," "notable." If the evidence is strong, the reader will feel it. Do not announce it.

Vary paragraph structure. Do not repeat the same architecture (topic sentence, evidence sentence, implication sentence, transition) in every paragraph. Let the content dictate the shape.

Do not use emotive language disguised as analysis: "eliminates noise," "the consequences are not abstract," "transforming the landscape." Let facts carry the argument.

Do not use em dashes. Use commas, colons, or restructure the sentence.

Do not restate the same claim in different words across sections. Make the point once and trust the reader.

Do not add punchlines or taglines after strong statements. If the paragraph lands, trust it. Do not add a one-liner telling the reader how to feel.

Do not use dramatic sentence fragments. Connect thoughts with conjunctions rather than full stops before "And" or "But."

Lean towards flowing prose. No bullet points in answer fields. Prefer direct, concrete, factual content. Vary sentence length and paragraph architecture. Let evidence carry the argument.`;

interface AnthropicContentBlock {
  type: string;
  text?: string;
}
interface AnthropicResponse {
  content: AnthropicContentBlock[];
  usage?: { input_tokens?: number; output_tokens?: number };
}
interface AnthropicErrorBody {
  error?: { type?: string; message?: string };
  type?: string;
  message?: string;
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: string; media_type: string; data: string } };

async function callClaude(
  system: string,
  content: ContentBlock[],
  maxTok: number = 16000,
  model: string = "claude-opus-4-20250514"
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  let data: AnthropicResponse | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getAnthropicKey(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTok,
        system,
        messages: [{ role: "user", content }],
      }),
    });

    if (res.ok) {
      data = await res.json();
      break;
    }

    const rawErr = await res.text();
    let errBody: AnthropicErrorBody = {};
    try { errBody = JSON.parse(rawErr); } catch {}

    const isConcurrency = errBody?.error?.type === "exceeded_limit" || errBody?.type === "exceeded_limit";
    const isOverload = res.status === 529 || res.status === 503;

    if ((isConcurrency || isOverload) && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, (attempt + 1) * 8000));
      continue;
    }

    throw new Error(errBody?.error?.message || errBody?.message || rawErr.slice(0, 200) || `API ${res.status}`);
  }

  if (!data) throw new Error("No response data from Claude API");

  const text = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");

  return {
    text,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

function safeParseJSON(text: string): Record<string, unknown> | null {
  // Strip markdown fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON object in the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pdfBase64, budgetContext, model } = body;
    const selectedModel = model || "claude-opus-4-20250514";

    if (!pdfBase64) {
      return NextResponse.json({ error: "pdfBase64 is required" }, { status: 400 });
    }

    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const contentBlocks: ContentBlock[] = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
      },
    ];

    if (budgetContext) {
      contentBlocks.push({
        type: "text",
        text: `BUDGET DATA (extracted from cost template):\n${budgetContext}`,
      });
    }

    contentBlocks.push({
      type: "text",
      text: "Review this proposal. Answer all five questions and produce the innovation summary and outreach email. Return only valid JSON.",
    });

    const result = await callClaude(SYSTEM_PROMPT, contentBlocks, 16000, selectedModel);
    const parsed = safeParseJSON(result.text);

    if (!parsed) {
      return NextResponse.json(
        { error: "JSON parse failed", rawText: result.text.slice(0, 500) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      review: parsed,
      model: selectedModel,
      tokens: {
        input: result.inputTokens,
        output: result.outputTokens,
        total: result.inputTokens + result.outputTokens,
      },
    });
  } catch (err: unknown) {
    console.error("Shortlist review route error:", err);
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : String(err)) || "Unknown error" },
      { status: 500 }
    );
  }
}
