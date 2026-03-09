import { NextRequest, NextResponse } from "next/server";
import {
  SYSTEM_PROMPT_CALL1,
  SYSTEM_PROMPT_CALL2,
  safeParseJSON,
  computeTotals,
} from "@/lib/classifier-engine";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MAX_RETRIES = 3;

async function callClaude(
  system: string,
  content: any[],
  maxTok: number = 8000
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  let data: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
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
    let errBody: any = {};
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

  const text = data.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
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
    const { pdfBase64, costContext, annexNote, org, country, theme } = body;

    if (!pdfBase64) {
      return NextResponse.json(
        { error: "pdfBase64 is required" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
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

    // Call 1: Gates + Dimensions 1-3
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
        text: `Organisation: ${org || "(extract from document)"}\nCountry: ${country || "(extract from document)"}\nTheme: ${theme || "(extract from document)"}\n\n${costNote}\n\n${annexNoteText}\n\nEvaluate all three gates in sequence. If gates pass, score dimensions 1, 2, and 3. Score every sub-criterion independently.`,
      },
    ]);

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

    // Build Call 2 context from Call 1
    const call1Summary = JSON.stringify(
      {
        applicant: call1.applicant,
        gates: call1.gates,
        all_gates_passed: call1.all_gates_passed,
        dimensions: call1.dimensions,
        call1_partial_raw: call1.call1_partial_raw,
      },
      null,
      2
    );

    // Call 2: Dimensions 4-5 + consistency + recommendation
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
        text: `CALL 1 RESULTS (for context — do not re-score these dimensions):\n${call1Summary}\n\n${costNote}\n\n${annexNoteText}\n\nScore dimensions 4 and 5. Write consistency notes and the recommendation. The call1_scaled_partial for threshold calculation is provided in the Call 1 results above.`,
      },
    ]);

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

    // Compute totals
    const totals = computeTotals(call1, call2);

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
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}