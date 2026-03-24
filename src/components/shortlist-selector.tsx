"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { computeAdjustedTotals } from "@/lib/scoring-utils";
import type { CallJson } from "@/lib/scoring-utils";

interface ProposalRow {
  id: string;
  org_name: string;
  country: string;
  theme: string[];
  classifier_results: { raw_total: number; recommendation: string; call1_json: CallJson; call2_json: CallJson | null }[];
}

type ReviewStatus = "green" | "amber" | "red";

interface ReviewStatuses {
  q1: ReviewStatus;
  q2: ReviewStatus;
  q3: ReviewStatus;
  q4: ReviewStatus;
  q5: ReviewStatus;
}

interface ShortlistProposal {
  id: string;
  name: string;
  country: string;
  themes: string[];
  totalScore: number;
  recommendation: string;
  reviewStatuses: ReviewStatuses | null;
  reviewedAt: string | null;
}

interface BatchOption {
  id: string;
  name: string;
  created_at: string;
}

interface ShortlistSelectorProps {
  onRunReview: (selectedIds: string[]) => void;
  disabled: boolean;
  batchId: string | null;
  onBatchChange: (batchId: string | null) => void;
  refreshKey?: number;
}

type SortColumn = "name" | "country" | "totalScore" | "recommendation";
type SortDirection = "asc" | "desc";

const BAND_ORDER: Record<string, number> = { Excellent: 4, Good: 3, Weak: 2, Fail: 1 };

function bandColor(rec: string): string {
  switch (rec) {
    case "Excellent": return "text-green-600 dark:text-green-400";
    case "Good": return "text-blue-600 dark:text-blue-400";
    case "Weak": return "text-amber-600 dark:text-amber-400";
    case "Fail": return "text-red-600 dark:text-red-400";
    default: return "text-gray-500";
  }
}

const Q_LABELS: { key: keyof ReviewStatuses; short: string; full: string }[] = [
  { key: "q1", short: "ICP", full: "In-Country Presence" },
  { key: "q2", short: "IE", full: "Innovation Evidence" },
  { key: "q3", short: "CA", full: "Cost & Affordability" },
  { key: "q4", short: "FLN", full: "FLN Track Record" },
  { key: "q5", short: "FF", full: "Financial Flexibility" },
];

const DOT_COLOR: Record<ReviewStatus, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

function SortIcon({ column, current, direction }: { column: SortColumn; current: SortColumn | null; direction: SortDirection }) {
  if (current !== column) return <span className="text-gray-300 dark:text-gray-600 ml-1">↕</span>;
  return <span className="ml-1">{direction === "asc" ? "▲" : "▼"}</span>;
}

export function ShortlistSelector({ onRunReview, disabled, batchId, onBatchChange, refreshKey = 0 }: ShortlistSelectorProps) {
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [proposals, setProposals] = useState<ShortlistProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // Load batches on mount
  useEffect(() => {
    async function loadBatches() {
      const { data } = await supabase
        .from("batches")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });
      if (data) {
        setBatches(data);
        if (!batchId && data.length > 0) {
          onBatchChange(data[0].id);
        }
      }
    }
    loadBatches();
  }, [batchId, onBatchChange]);

  // Load proposals when batch changes or refreshKey bumps
  useEffect(() => {
    if (!batchId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      // Don't clear selection on refresh — only on batch change
      const { data, error } = await supabase
        .from("proposals")
        .select("id, org_name, country, theme, classifier_results(raw_total, recommendation, call1_json, call2_json)")
        .eq("batch_id", batchId)
        .eq("status", "scored")
        .order("org_name");

      if (cancelled) return;
      if (error || !data) {
        console.error("Failed to load proposals:", error?.message);
        setLoading(false);
        return;
      }

      // Fetch panel overrides to compute adjusted scores
      const proposalIds = (data as unknown as ProposalRow[]).map((p) => p.id);
      const { data: overrides } = await supabase
        .from("panel_overrides")
        .select("proposal_id, sub_criterion_key, override_score")
        .in("proposal_id", proposalIds);

      if (cancelled) return;

      const overrideScoreMap = new Map<string, Record<string, number>>();
      for (const o of (overrides || [])) {
        const scores = overrideScoreMap.get(o.proposal_id) || {};
        scores[o.sub_criterion_key] = o.override_score;
        overrideScoreMap.set(o.proposal_id, scores);
      }

      // Check which proposals have shortlist reviews — fetch review_json for statuses
      const { data: reviews } = await supabase
        .from("shortlist_reviews")
        .select("proposal_id, created_at, review_json")
        .in("proposal_id", proposalIds)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      const reviewMap = new Map<string, { createdAt: string; statuses: ReviewStatuses | null }>();
      for (const r of (reviews || [])) {
        if (!reviewMap.has(r.proposal_id)) {
          let statuses: ReviewStatuses | null = null;
          const rj = r.review_json as Record<string, { status?: ReviewStatus }> | null;
          if (rj && rj.q1 && rj.q2 && rj.q3 && rj.q4 && rj.q5) {
            statuses = {
              q1: rj.q1.status || "red",
              q2: rj.q2.status || "red",
              q3: rj.q3.status || "red",
              q4: rj.q4.status || "red",
              q5: rj.q5.status || "red",
            };
          }
          reviewMap.set(r.proposal_id, { createdAt: r.created_at, statuses });
        }
      }

      const rows = (data as unknown as ProposalRow[]).map((p) => {
        const cr = p.classifier_results?.[0];
        const propOverrides = overrideScoreMap.get(p.id) || {};
        const hasOverrides = Object.keys(propOverrides).length > 0;

        let totalScore = cr?.raw_total ?? 0;
        let recommendation = cr?.recommendation ?? "—";

        if (hasOverrides && cr?.call1_json) {
          const adjusted = computeAdjustedTotals(cr.call1_json, cr.call2_json, propOverrides);
          totalScore = adjusted.total;
          recommendation = adjusted.rec;
        }

        const rev = reviewMap.get(p.id);

        return {
          id: p.id,
          name: p.org_name || "Unknown",
          country: p.country || "Unknown",
          themes: p.theme || [],
          totalScore,
          recommendation,
          reviewStatuses: rev?.statuses ?? null,
          reviewedAt: rev?.createdAt ?? null,
        };
      });

      setProposals(rows);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [batchId, refreshKey]);

  // Clear selection when batch changes (not on refreshKey)
  useEffect(() => {
    setSelected(new Set());
  }, [batchId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return proposals;
    const q = search.toLowerCase();
    return proposals.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q)
    );
  }, [proposals, search]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "country":
          cmp = a.country.localeCompare(b.country);
          break;
        case "totalScore":
          cmp = a.totalScore - b.totalScore;
          break;
        case "recommendation":
          cmp = (BAND_ORDER[a.recommendation] ?? 0) - (BAND_ORDER[b.recommendation] ?? 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortCol, sortDir]);

  const allVisibleSelected = sorted.length > 0 && sorted.every((p) => selected.has(p.id));

  function handleSort(col: SortColumn) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function toggleAll() {
    if (allVisibleSelected) {
      const next = new Set(selected);
      sorted.forEach((p) => next.delete(p.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      sorted.forEach((p) => next.add(p.id));
      setSelected(next);
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  const thClass = "px-3 py-2 text-left font-medium select-none";
  const sortableThClass = `${thClass} cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400`;

  return (
    <div>
      {/* Batch selector */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch</label>
        <select
          value={batchId || ""}
          onChange={(e) => onBatchChange(e.target.value || null)}
          className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 min-w-[300px]"
        >
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{batches.length} batch{batches.length !== 1 ? "es" : ""}</span>
      </div>

      {/* Search filter */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Filter by name or country..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm flex-1 max-w-md"
        />
        <span className="text-sm text-gray-500">
          {sorted.length} proposal{sorted.length !== 1 ? "s" : ""} shown
        </span>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8">Loading proposals...</div>
      ) : proposals.length === 0 ? (
        <div className="text-sm text-gray-500 py-8">No scored proposals in this batch.</div>
      ) : (
        <>
          <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className={sortableThClass} onClick={() => handleSort("name")}>
                    Name<SortIcon column="name" current={sortCol} direction={sortDir} />
                  </th>
                  <th className={sortableThClass} onClick={() => handleSort("country")}>
                    Country<SortIcon column="country" current={sortCol} direction={sortDir} />
                  </th>
                  <th className={thClass}>Themes</th>
                  <th className={`${sortableThClass} text-right`} onClick={() => handleSort("totalScore")}>
                    Score<SortIcon column="totalScore" current={sortCol} direction={sortDir} />
                  </th>
                  <th className={sortableThClass} onClick={() => handleSort("recommendation")}>
                    Band<SortIcon column="recommendation" current={sortCol} direction={sortDir} />
                  </th>
                  <th className={`${thClass} text-center`}>Review Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer ${selected.has(p.id) ? "bg-blue-50 dark:bg-blue-950" : ""}`}
                    onClick={() => toggleOne(p.id)}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2">{p.country}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {p.themes.map((t) => t.replace(/^Theme \d+ — /, "")).join(", ")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.totalScore}</td>
                    <td className={`px-3 py-2 font-medium ${bandColor(p.recommendation)}`}>
                      {p.recommendation}
                    </td>
                    <td className="px-3 py-2">
                      {p.reviewStatuses ? (
                        <div
                          className="flex items-center justify-center gap-2"
                          title={`Reviewed ${p.reviewedAt ? new Date(p.reviewedAt).toLocaleString() : ""}`}
                        >
                          {Q_LABELS.map(({ key, short, full }) => (
                            <span
                              key={key}
                              className="inline-flex items-center gap-0.5"
                              title={`${full}: ${p.reviewStatuses![key]}`}
                            >
                              <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500">{short}</span>
                              <span className={`inline-block w-2 h-2 rounded-full ${DOT_COLOR[p.reviewStatuses![key]]}`} />
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-center block">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onRunReview(Array.from(selected))}
              disabled={selected.size === 0 || disabled}
              className="rounded bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run Shortlist Review ({selected.size} proposal{selected.size !== 1 ? "s" : ""})
            </button>
            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                className="text-sm text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear selection
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
