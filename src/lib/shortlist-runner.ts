import { supabase } from "@/lib/supabase";
import { downloadPdfAsBase64, extractCostContext } from "@/lib/gdrive-download";
import { computeAdjustedTotals } from "@/lib/scoring-utils";
import type { CallJson } from "@/lib/scoring-utils";

export interface ShortlistProgress {
  total: number;
  completed: number;
  current: string;
  phase: "downloading" | "reviewing" | "saving" | "done" | "error";
  errors: { proposalId: string; name: string; error: string }[];
}

export interface ShortlistReviewResult {
  reviewId: string;
  proposalId: string;
  orgName: string;
  country: string;
  totalScore: number;
  modelUsed: string;
  review: Record<string, unknown>;
}

interface ProposalRow {
  id: string;
  org_name: string;
  country: string;
  proposal_file_id: string;
  budget_file_id: string | null;
  classifier_results: { raw_total: number }[];
}

export async function runShortlistReview(
  proposalIds: string[],
  getAccessToken: () => string,
  onProgress: (progress: ShortlistProgress) => void,
  adjustedScores?: Map<string, number>
): Promise<ShortlistReviewResult[]> {
  const results: ShortlistReviewResult[] = [];
  const errors: ShortlistProgress["errors"] = [];

  // Fetch proposal metadata
  const { data: proposals, error: fetchErr } = await supabase
    .from("proposals")
    .select("id, org_name, country, proposal_file_id, budget_file_id, classifier_results(raw_total)")
    .in("id", proposalIds);

  if (fetchErr || !proposals) {
    throw new Error(`Failed to fetch proposals: ${fetchErr?.message || "no data"}`);
  }

  const total = proposals.length;

  for (let i = 0; i < proposals.length; i++) {
    const p = proposals[i] as unknown as ProposalRow;
    const name = p.org_name || "Unknown";

    try {
      // Phase 1: Download PDF
      onProgress({ total, completed: i, current: name, phase: "downloading", errors });
      const pdfBase64 = await downloadPdfAsBase64(p.proposal_file_id, getAccessToken);

      // Phase 1b: Extract budget context if available
      let budgetContext: string | undefined;
      if (p.budget_file_id) {
        try {
          budgetContext = await extractCostContext(p.budget_file_id, getAccessToken);
        } catch (e) {
          console.warn(`Budget extraction failed for ${name}:`, e);
        }
      }

      // Also pull any budget data from classifier_results call1_json if available
      if (!budgetContext) {
        const { data: crData } = await supabase
          .from("classifier_results")
          .select("call1_json")
          .eq("proposal_id", p.id)
          .limit(1)
          .single();

        if (crData?.call1_json?.pilot_financials) {
          const pf = crData.call1_json.pilot_financials;
          budgetContext = `PILOT FINANCIALS (from prior AI extraction):\n${JSON.stringify(pf, null, 2)}`;
        }
      }

      // Phase 2: Call shortlist-review API
      onProgress({ total, completed: i, current: name, phase: "reviewing", errors });
      const res = await fetch("/api/shortlist-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64, budgetContext }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errBody.error || `API returned ${res.status}`);
      }

      const apiResult = await res.json();

      // Phase 3: Save to Supabase
      onProgress({ total, completed: i, current: name, phase: "saving", errors });
      const { data: insertedRow, error: insertErr } = await supabase.from("shortlist_reviews").insert({
        proposal_id: p.id,
        model_used: apiResult.model,
        review_json: apiResult.review,
      }).select("id").single();

      if (insertErr || !insertedRow) {
        throw new Error(`DB insert failed: ${insertErr?.message || "no data returned"}`);
      }

      const totalScore = adjustedScores?.get(p.id) ?? p.classifier_results?.[0]?.raw_total ?? 0;

      results.push({
        reviewId: insertedRow.id,
        proposalId: p.id,
        orgName: name,
        country: p.country,
        totalScore,
        modelUsed: apiResult.model,
        review: apiResult.review,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Shortlist review failed for ${name}:`, msg);
      errors.push({ proposalId: p.id, name, error: msg });
    }
  }

  onProgress({ total, completed: total, current: "", phase: "done", errors });
  return results;
}

interface ShortlistReviewRow {
  id: string;
  proposal_id: string;
  review_json: Record<string, unknown>;
  model_used: string;
  created_at: string;
  proposals: {
    org_name: string;
    country: string;
    classifier_results: { raw_total: number; call1_json: CallJson; call2_json: CallJson | null }[];
  };
}

export async function loadShortlistReviews(batchId: string): Promise<ShortlistReviewResult[]> {
  // Get proposal IDs for this batch
  const { data: batchProposals } = await supabase
    .from("proposals")
    .select("id")
    .eq("batch_id", batchId)
    .eq("status", "scored");

  if (!batchProposals || batchProposals.length === 0) return [];

  const proposalIds = batchProposals.map((p) => p.id);

  // Load reviews with proposal data
  const { data: reviews, error } = await supabase
    .from("shortlist_reviews")
    .select("id, proposal_id, review_json, model_used, created_at, proposals(org_name, country, classifier_results(raw_total, call1_json, call2_json))")
    .in("proposal_id", proposalIds)
    .order("created_at", { ascending: false });

  if (error || !reviews) return [];

  // Fetch overrides for adjusted scores
  const { data: overrides } = await supabase
    .from("panel_overrides")
    .select("proposal_id, sub_criterion_key, override_score")
    .in("proposal_id", proposalIds);

  const overrideScoreMap = new Map<string, Record<string, number>>();
  for (const o of (overrides || [])) {
    const scores = overrideScoreMap.get(o.proposal_id) || {};
    scores[o.sub_criterion_key] = o.override_score;
    overrideScoreMap.set(o.proposal_id, scores);
  }

  // Deduplicate: keep only the latest review per proposal
  const seen = new Set<string>();
  const results: ShortlistReviewResult[] = [];

  for (const r of (reviews as unknown as ShortlistReviewRow[])) {
    if (seen.has(r.proposal_id)) continue;
    seen.add(r.proposal_id);

    const p = r.proposals;
    const cr = Array.isArray(p.classifier_results) ? p.classifier_results[0] : p.classifier_results;
    const propOverrides = overrideScoreMap.get(r.proposal_id) || {};
    const hasOverrides = Object.keys(propOverrides).length > 0;

    let totalScore = cr?.raw_total ?? 0;
    if (hasOverrides && cr?.call1_json) {
      const adjusted = computeAdjustedTotals(cr.call1_json, cr.call2_json, propOverrides);
      totalScore = adjusted.total;
    }

    results.push({
      reviewId: r.id,
      proposalId: r.proposal_id,
      orgName: p.org_name || "Unknown",
      country: p.country || "Unknown",
      totalScore,
      modelUsed: r.model_used,
      review: r.review_json,
    });
  }

  return results;
}
