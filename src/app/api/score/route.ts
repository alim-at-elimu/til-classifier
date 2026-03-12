import { NextRequest, NextResponse } from "next/server";
import {
  SYSTEM_PROMPT_CALL1,
  SYSTEM_PROMPT_CALL2,
  safeParseJSON,
  computeTotals,
  DIM_DEFS,
  injectRubricAnchors,
} from "@/lib/classifier-engine";

// Allow up to 10 minutes for Opus scoring (2 calls × large PDF)
export const maxDuration = 300;

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MAX_RETRIES = 3;

// Load .env.local manually as a fallback for Next.js env loading issues
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// Eagerly load key at module init — try multiple paths
function loadAnthropicKey(): string {
  // 1. Already in env
  const envKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (envKey) return envKey;

  // 2. Try reading .env.local from several candidate directories
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), ".."),
    resolve(process.cwd(), "../.."),
    // Absolute fallback for this project
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
        console.log(`[score] Loaded ANTHROPIC_API_KEY from ${envPath}`);
        return key;
      }
    } catch {}
  }
  return "";
}

// Cache at module level so it only runs once
const ANTHROPIC_KEY = loadAnthropicKey();
function getAnthropicKey(): string {
  return ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY?.trim() || "";
}

// Anthropic API response types
interface AnthropicContentBlock {
  type: string;
  text?: string;
}
interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
}
interface AnthropicErrorBody {
  error?: { type?: string; message?: string };
  type?: string;
  message?: string;
}
interface AnthropicResponse {
  content: AnthropicContentBlock[];
  usage?: AnthropicUsage;
}

// Anthropic message content block (input)
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
    try {
      errBody = JSON.parse(rawErr);
    } catch {}

    const isConcurrency =
      errBody?.error?.type === "exceeded_limit" ||
      errBody?.type === "exceeded_limit";
    const isOverload = res.status === 529 || res.status === 503;

    if ((isConcurrency || isOverload) && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, (attempt + 1) * 8000));
      continue;
    }

    throw new Error(
      errBody?.error?.message ||
        errBody?.message ||
        rawErr.slice(0, 200) ||
        `API ${res.status}`
    );
  }

  if (!data) throw new Error("No response data from Claude API");

  const text = data.content
    .filter((b: AnthropicContentBlock) => b.type === "text")
    .map((b: AnthropicContentBlock) => b.text ?? "")
    .join("");

  return {
    text,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pdfBase64, costContext, annexNote, org, country, theme, model } = body;
    const selectedModel = model || "claude-opus-4-20250514";

    if (!pdfBase64) {
      return NextResponse.json(
        { error: "pdfBase64 is required" },
        { status: 400 }
      );
    }

    const apiKey = getAnthropicKey();
    console.log("ENV CHECK:", apiKey ? "key present" : "key MISSING", "cwd:", process.cwd());
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const costNote = costContext
      ? `COST TEMPLATE (extracted from XLSX — all four tabs):\n${costContext.slice(0, 6000)}`
      : `COST DATA: No separate cost template submitted. If cost data is embedded as an annex within the narrative PDF, assess from that material. Otherwise apply conservative scoring.`;

    const annexNoteText =
      annexNote ||
      "No annex files were submitted separately.";

    // ── Call 1: Gates + Dimensions 1-3 ──
    const call1Result = await callClaude(SYSTEM_PROMPT_CALL1, [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: pdfBase64,
        },
      },
      {
        type: "text",
        text: `Organisation: ${org || "(extract from document)"}\nCountry: ${country || "(extract from document)"}\nTheme: ${theme || "(extract from document)"}\n\n${costNote}\n\n${annexNoteText}\n\nEvaluate all three gates in sequence. If gates pass, score dimensions 1, 2, and 3. Score every sub-criterion independently. Output only valid JSON.`,
      },
    ], 20000, selectedModel);

    const call1 = safeParseJSON(call1Result.text);
    if (!call1) {
      return NextResponse.json(
        {
          error: "Call 1 JSON parse failed",
          rawText: call1Result.text.slice(0, 500),
        },
        { status: 500 }
      );
    }

    // ── Build Call 2 context exactly as the artifact does ──
    type SubScore = { score?: number };
    type DimScores = Record<string, SubScore>;
    type Call1Typed = {
      applicant?: { name?: string; country?: string; theme?: string | string[] };
      dimensions?: { government_depth?: DimScores; adoption_readiness?: DimScores; cost_realism?: DimScores };
      all_gates_passed?: boolean;
    };
    const c1 = call1 as Call1Typed;
    const extractedOrg = c1.applicant?.name || org || "(extract from document)";
    const extractedCountry = c1.applicant?.country || country || "(extract from document)";
    const rawTheme = c1.applicant?.theme;
    const extractedTheme = Array.isArray(rawTheme) ? rawTheme.join(", ") : (rawTheme || theme || "(extract from document)");

    const d1 = c1.dimensions;

    const scaledPartial = (() => {
      const gd = DIM_DEFS.government_depth.reduce((s: number, k: string) => s + (d1?.government_depth?.[k]?.score || 0), 0);
      const ar = DIM_DEFS.adoption_readiness.reduce((s: number, k: string) => s + (d1?.adoption_readiness?.[k]?.score || 0), 0);
      const cr = DIM_DEFS.cost_realism.reduce((s: number, k: string) => s + (d1?.cost_realism?.[k]?.score || 0), 0);
      return Math.round((gd / 20) * 20) + Math.round((ar / 15) * 20) + Math.round((cr / 15) * 20);
    })();

    const gateNote = c1.all_gates_passed
      ? ""
      : "\nNOTE: One or more gates scored 1 or 2 (gate failure flagged). Score all dimensions normally regardless. The gate failure is an advisory flag for the panel.";

    const partial = `Call 1 sub-criterion scores (raw):
Government Depth: ${DIM_DEFS.government_depth.map((k: string) => `${k}=${d1?.government_depth?.[k]?.score || 0}`).join(", ")}
Adoption Readiness: ${DIM_DEFS.adoption_readiness.map((k: string) => `${k}=${d1?.adoption_readiness?.[k]?.score || 0}`).join(", ")}
Cost Realism: ${DIM_DEFS.cost_realism.map((k: string) => `${k}=${d1?.cost_realism?.[k]?.score || 0}`).join(", ")}
call1_scaled_partial: ${scaledPartial} (already scaled /60 — do not recompute)${gateNote}`;

    // ── Call 2: Dimensions 4-5 + consistency + recommendation ──
    const call2Result = await callClaude(SYSTEM_PROMPT_CALL2, [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: pdfBase64,
        },
      },
      {
        type: "text",
        text: `Organisation: ${extractedOrg}\nCountry: ${extractedCountry}\nTheme: ${extractedTheme}\n\n${partial}\n\n${costNote}\n\n${annexNoteText}\n\nScore dimensions 4 and 5 independently. Write consistency notes and produce the final recommendation. Output only valid JSON.`,
      },
    ], 20000, selectedModel);

    const call2 = safeParseJSON(call2Result.text);
    if (!call2) {
      return NextResponse.json(
        {
          error: "Call 2 JSON parse failed",
          rawText: call2Result.text.slice(0, 500),
          call1,
        },
        { status: 500 }
      );
    }

    // Inject verbatim rubric anchors
    injectRubricAnchors(call1, call2);

    // Compute totals
    const totals = computeTotals(call1, call2);

    // Set overall_score on call2 as the artifact does
    if (totals) {
      call2.overall_score = totals.total;
    }

    return NextResponse.json({
      call1,
      call2,
      totals,
      tokens: {
        call1Input: call1Result.inputTokens,
        call1Output: call1Result.outputTokens,
        call2Input: call2Result.inputTokens,
        call2Output: call2Result.outputTokens,
        total:
          call1Result.inputTokens +
          call1Result.outputTokens +
          call2Result.inputTokens +
          call2Result.outputTokens,
      },
    });
  } catch (err: unknown) {
    console.error("Score route error:", err);
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : String(err)) || "Unknown error" },
      { status: 500 }
    );
  }
}