"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShortlistReviewCard } from "@/components/shortlist-review-card";
import { computeAdjustedTotals } from "@/lib/scoring-utils";
import type { CallJson } from "@/lib/scoring-utils";

interface ReviewRow {
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

export default function ShortlistReviewPage() {
  const params = useParams();
  const reviewId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    orgName: string;
    country: string;
    totalScore: number;
    modelUsed: string;
    review: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    if (!reviewId) return;
    (async () => {
      const { data: row, error: fetchErr } = await supabase
        .from("shortlist_reviews")
        .select("id, proposal_id, review_json, model_used, created_at, proposals(org_name, country, classifier_results(raw_total, call1_json, call2_json))")
        .eq("id", reviewId)
        .single();

      if (fetchErr || !row) {
        setError(fetchErr?.message || "Review not found");
        setLoading(false);
        return;
      }

      const r = row as unknown as ReviewRow;
      const p = r.proposals;
      const cr = Array.isArray(p.classifier_results) ? p.classifier_results[0] : p.classifier_results;

      // Fetch overrides for adjusted score
      const { data: overrides } = await supabase
        .from("panel_overrides")
        .select("proposal_id, sub_criterion_key, override_score")
        .eq("proposal_id", r.proposal_id);

      const propOverrides: Record<string, number> = {};
      for (const o of (overrides || [])) {
        propOverrides[o.sub_criterion_key] = o.override_score;
      }

      let totalScore = cr?.raw_total ?? 0;
      if (Object.keys(propOverrides).length > 0 && cr?.call1_json) {
        const adjusted = computeAdjustedTotals(cr.call1_json, cr.call2_json, propOverrides);
        totalScore = adjusted.total;
      }

      setData({
        orgName: p.org_name || "Unknown",
        country: p.country || "Unknown",
        totalScore,
        modelUsed: r.model_used,
        review: r.review_json,
      });
      setLoading(false);
    })();
  }, [reviewId]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto p-10 font-mono bg-white dark:bg-gray-950 text-black dark:text-gray-100 min-h-screen">
        <div className="text-sm text-gray-400">Loading review...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="max-w-4xl mx-auto p-10 font-mono bg-white dark:bg-gray-950 text-black dark:text-gray-100 min-h-screen">
        <div className="text-sm text-red-500">{error || "Review not found"}</div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-10 font-mono bg-white dark:bg-gray-950 text-black dark:text-gray-100 min-h-screen">
      <ShortlistReviewCard
        proposalId={reviewId}
        orgName={data.orgName}
        country={data.country}
        totalScore={data.totalScore}
        modelUsed={data.modelUsed}
        review={data.review as never}
        defaultOpen
      />
    </main>
  );
}
