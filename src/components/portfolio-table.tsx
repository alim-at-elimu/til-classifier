"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Shared constants for export ──
const DIM_DEFS: Record<string, string[]> = {
  government_depth: ["named_counterparts", "documented_engagement", "institutional_home", "government_delivery_roles"],
  adoption_readiness: ["transition_logic", "capacity_shift", "adoption_timeline"],
  cost_realism: ["pilot_unit_cost", "cost_ownership_trajectory", "steady_state_fiscal"],
  innovation_quality: ["problem_solution_fit", "operational_clarity", "pilot_learning_architecture", "team_timeline_realism"],
  evidence_strength: ["decision_useful_evidence", "government_decision_mechanisms", "learning_outcome_evidence_chain"],
};

const DIM_MAX: Record<string, number> = { government_depth: 20, adoption_readiness: 15, cost_realism: 15, innovation_quality: 20, evidence_strength: 15 };

const DIM_LABELS: Record<string, string> = {
  government_depth: "Government Depth", adoption_readiness: "Adoption Readiness", cost_realism: "Cost Realism",
  innovation_quality: "Innovation Quality", evidence_strength: "Evidence Strength",
};

const SUB_LABELS: Record<string, string> = {
  named_counterparts: "Named counterparts & roles", documented_engagement: "Documented engagement",
  institutional_home: "Institutional home", government_delivery_roles: "Government delivery roles",
  transition_logic: "Transition logic", capacity_shift: "Capacity shift plan", adoption_timeline: "Adoption timeline",
  pilot_unit_cost: "Pilot unit cost", cost_ownership_trajectory: "Cost ownership trajectory", steady_state_fiscal: "Steady-state fiscal",
  problem_solution_fit: "Problem-solution fit", operational_clarity: "Operational clarity",
  pilot_learning_architecture: "Learning architecture", team_timeline_realism: "Team & timeline realism",
  decision_useful_evidence: "Decision-useful evidence", government_decision_mechanisms: "Decision mechanisms",
  learning_outcome_evidence_chain: "Learning outcome chain",
};

const GATE_LABELS: Record<string, string> = {
  country_theme_fit: "Country & Theme", scale_duration_compliance: "Scale & Duration", public_system_embedding: "Public System Embedding",
};

export interface ProposalRow {
  id: string;
  org_name: string;
  country: string;
  theme: string[];
  status: string;
  raw_total: number | null;
  adjusted_total: number | null;
  adjusted_rec: string | null;
  recommendation: string | null;
  gates_passed: boolean | null;
  lead_reviewer_id: string | null;
  finalized_by: string | null;
  total_cost: number | null;
  cost_per_teacher: number | null;
  reviewed_count: number;
}

type SortKey = "org_name" | "country" | "theme" | "raw_total" | "recommendation" | "gates_passed";
type SortDir = "asc" | "desc";

const BAND_STYLE: Record<string, { bg: string; text: string }> = {
  Excellent: { bg: "bg-green-100", text: "text-green-800" },
  Good: { bg: "bg-blue-100", text: "text-blue-800" },
  Weak: { bg: "bg-amber-100", text: "text-amber-800" },
  Fail: { bg: "bg-red-100", text: "text-red-800" },
};

const BAND_ORDER: Record<string, number> = { Excellent: 4, Good: 3, Weak: 2, Fail: 1 };

const CANONICAL_THEMES = [
  "Theme 1 — Structured Pedagogy",
  "Theme 2 — Teacher Coaching and Mentoring",
  "Theme 3 — EdTech-Enabled Learning",
  "Theme 4 — Assessment for Learning",
] as const;

const THEME_SHORT: Record<string, string> = {
  "Theme 1 — Structured Pedagogy": "T1",
  "Theme 2 — Teacher Coaching and Mentoring": "T2",
  "Theme 3 — EdTech-Enabled Learning": "T3",
  "Theme 4 — Assessment for Learning": "T4",
};

const THEME_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  "Theme 1 — Structured Pedagogy": { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200" },
  "Theme 2 — Teacher Coaching and Mentoring": { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200" },
  "Theme 3 — EdTech-Enabled Learning": { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200" },
  "Theme 4 — Assessment for Learning": { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" },
};

interface Panelist {
  id: string;
  name: string;
}

interface BatchOption {
  id: string;
  name: string;
  created_at: string;
}

// ── Typing for classifier JSON blobs ──
type DimData = Record<string, { score?: number; interpretation?: string; extract?: string; rubric_anchor?: string }> | undefined;

interface GateEntry {
  pass?: boolean;
  score: number;
  interpretation?: string;
}

interface CallJson {
  gates?: Record<string, GateEntry>;
  dimensions?: {
    government_depth?: DimData;
    adoption_readiness?: DimData;
    cost_realism?: DimData;
    innovation_quality?: DimData;
    evidence_strength?: DimData;
    [key: string]: DimData;
  };
  pilot_financials?: {
    cost_til?: number | null;
    cost_applicant?: number | null;
    cost_government_inkind?: number | null;
    total_teachers?: number | null;
  };
  consistency_notes?: string[];
  recommendation?: string;
  summary?: string;
}

interface OverrideHistoryEntry {
  proposal_id: string;
  sub_criterion_key: string;
  original_score: number;
  override_score: number;
  rationale: string;
  created_at: string;
  panelist_name: string;
}

interface ClassifierResultRow {
  proposal_id: string;
  call1_json: CallJson;
  call2_json: CallJson;
}

interface RawProposalRow {
  id: string;
  org_name: string | null;
  country: string | null;
  theme: string | string[] | null;
  status: string;
  lead_reviewer_id: string | null;
  finalized_by: string | null;
  classifier_results: {
    raw_total: number | null;
    recommendation: string | null;
    gates_passed: boolean | null;
    call1_json: CallJson;
    call2_json: CallJson | null;
  } | {
    raw_total: number | null;
    recommendation: string | null;
    gates_passed: boolean | null;
    call1_json: CallJson;
    call2_json: CallJson | null;
  }[] | null;
}

interface TotalsResult {
  dims: Record<string, number>;
  total: number;
  rec: string;
}

interface ExportProposal {
  org_name: string;
  country: string;
  theme: string | string[];
}

interface PortfolioTableProps {
  onSelectProposal: (id: string) => void;
  panelistId: string | null;
  panelistName: string | null;
  batchId: string | null;
  onBatchChange: (batchId: string | null) => void;
}

// ── Export helpers ──
function getDimScaled(dimData: DimData, dimKey: string, overrides: Record<string, number>): number {
  if (!dimData) return 0;
  const raw = DIM_DEFS[dimKey].reduce((sum, sub) => {
    const key = `${dimKey}.${sub}`;
    return sum + (overrides[key] ?? dimData[sub]?.score ?? 0);
  }, 0);
  return Math.round((raw / DIM_MAX[dimKey]) * 20);
}

function computeTotals(call1: CallJson | null | undefined, call2: CallJson | null | undefined, overrides: Record<string, number>): TotalsResult {
  if (!call1) return { dims: {} as Record<string, number>, total: 0, rec: "Fail" };
  const d1 = call1.dimensions;
  const d2 = call2?.dimensions;
  const dims: Record<string, number> = {
    government_depth: getDimScaled(d1?.government_depth, "government_depth", overrides),
    adoption_readiness: getDimScaled(d1?.adoption_readiness, "adoption_readiness", overrides),
    cost_realism: getDimScaled(d1?.cost_realism, "cost_realism", overrides),
    innovation_quality: d2 ? getDimScaled(d2.innovation_quality, "innovation_quality", overrides) : 0,
    evidence_strength: d2 ? getDimScaled(d2.evidence_strength, "evidence_strength", overrides) : 0,
  };
  const total = Object.values(dims).reduce((s, v) => s + v, 0);
  let rec = "Fail";
  if (total >= 85) rec = "Excellent";
  else if (total >= 75) rec = "Good";
  else if (total >= 60) rec = "Weak";
  return { dims, total, rec };
}

function generateExportHTML(proposal: ExportProposal, call1: CallJson, call2: CallJson | null | undefined, totals: TotalsResult, latestOverrides: Record<string, number>, overrideHistory: OverrideHistoryEntry[]) {
  const gates = call1.gates || {};
  const consistencyNotes: string[] = call2?.consistency_notes || [];
  const recommendation: string = call2?.recommendation || "";
  const summary: string = call2?.summary || "";

  function getSubData(dimKey: string, subKey: string): { score?: number; interpretation?: string; extract?: string; rubric_anchor?: string } | null {
    const src = dimKey === "innovation_quality" || dimKey === "evidence_strength" ? call2?.dimensions : call1?.dimensions;
    return src?.[dimKey]?.[subKey] || null;
  }

  const scoreBg = (s: number) => ({ 1: "#ef4444", 2: "#fb923c", 3: "#facc15", 4: "#22c55e", 5: "#10b981" }[s] || "#9ca3af");
  const scoreFg = (s: number) => s === 3 ? "#000" : "#fff";
  const bandBg = (b: string) => ({ Excellent: "#16a34a", Good: "#2563eb", Weak: "#f59e0b", Fail: "#dc2626" }[b] || "#6b7280");
  const dimColor = (s: number) => s >= 16 ? "#16a34a" : s >= 12 ? "#ca8a04" : "#ef4444";

  let gatesHTML = "";
  for (const [gk, gl] of Object.entries(GATE_LABELS)) {
    const g = gates[gk];
    if (!g) continue;
    const passed = g.pass !== false && g.score >= 3;
    gatesHTML += `<div style="border:1px solid ${passed ? "#bbf7d0" : "#fecaca"};border-radius:6px;padding:8px 10px;margin-bottom:6px;background:${passed ? "#f0fdf4" : "#fef2f2"}">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:4px;font-size:11px;font-weight:700;background:${scoreBg(g.score)};color:${scoreFg(g.score)}">${g.score}</span>
        <span style="font-size:11px;font-weight:600;color:${passed ? "#15803d" : "#dc2626"}">${gl}</span>
      </div>
      ${g.interpretation ? `<div style="font-size:10px;color:#6b7280;margin-left:26px">${g.interpretation}</div>` : ""}
    </div>`;
  }

  let dimsHTML = "";
  for (const [dimKey, subs] of Object.entries(DIM_DEFS)) {
    const dimScore = totals.dims[dimKey] ?? 0;
    dimsHTML += `<tr><td colspan="3" style="background:#f3f4f6;padding:6px 10px;font-size:11px;font-weight:700;color:#4b5563;border-top:1px solid #e5e7eb"><div style="display:flex;justify-content:space-between"><span>${DIM_LABELS[dimKey]}</span><span style="color:${dimColor(dimScore)}">${dimScore}/20</span></div></td></tr>`;
    for (const subKey of subs) {
      const data = getSubData(dimKey, subKey);
      const aiScore = data?.score ?? 0;
      const key = `${dimKey}.${subKey}`;
      const currentScore = latestOverrides[key] ?? aiScore;
      const hasOverride = latestOverrides[key] !== undefined;
      const history = overrideHistory.filter((o) => o.sub_criterion_key === key);

      let detail = "";
      if (data?.interpretation) detail += `<div style="font-size:10px;color:#6b7280;margin:2px 0"><b>Interpretation:</b> ${data.interpretation}</div>`;
      if (data?.extract) detail += `<div style="font-size:10px;color:#9ca3af;margin:2px 0;font-style:italic">"${data.extract}"</div>`;
      if (data?.rubric_anchor) detail += `<div style="font-size:10px;color:#9ca3af;margin:2px 0"><b>Rubric (${aiScore}):</b> ${data.rubric_anchor}</div>`;

      let overrideHTML = "";
      if (history.length > 0) {
        overrideHTML = history.map((h) =>
          `<div style="font-size:10px;color:#7c3aed;margin:2px 0">Override: ${h.original_score} → ${h.override_score} by ${h.panelist_name}: ${h.rationale}</div>`
        ).join("");
      }

      dimsHTML += `<tr style="border-top:1px solid #f3f4f6">
        <td style="padding:5px 10px;width:28px;vertical-align:top">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:4px;font-size:10px;font-weight:700;background:${scoreBg(currentScore)};color:${scoreFg(currentScore)}${hasOverride ? ";box-shadow:0 0 0 2px #a78bfa" : ""}">${currentScore}</span>
        </td>
        <td style="padding:5px 8px;font-size:11px;color:#374151;vertical-align:top">
          ${SUB_LABELS[subKey] || subKey}${hasOverride ? `<span style="color:#9ca3af;text-decoration:line-through;margin-left:4px;font-size:10px">${aiScore}</span>` : ""}
        </td>
        <td style="padding:5px 10px;vertical-align:top">${detail}${overrideHTML}</td>
      </tr>`;
    }
  }

  let notesHTML = "";
  if (consistencyNotes.length > 0) {
    notesHTML = `<div style="margin-top:12px;padding:8px 10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px">
      <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Consistency Notes</div>
      ${consistencyNotes.map((n) => `<div style="font-size:10px;color:#4b5563;margin-bottom:3px">${n}</div>`).join("")}
    </div>`;
  }

  const dimBarHTML = Object.entries(DIM_LABELS).map(([dk, label]) => {
    const s = totals.dims[dk] ?? 0;
    return `<div style="flex:1;text-align:center"><div style="font-size:16px;font-weight:700;color:${dimColor(s)}">${s}</div><div style="font-size:9px;color:#9ca3af">${label}</div></div>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${proposal.org_name} — TIL RFP Assessment</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:#111; max-width:800px; margin:0 auto; padding:24px; font-size:12px; }
  table { width:100%; border-collapse:collapse; }
  @media print { body { padding:12px; } }
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:12px; border-bottom:2px solid #111; margin-bottom:12px; }
</style>
</head><body>
  <div class="header">
    <div>
      <div style="font-size:18px;font-weight:800">${proposal.org_name}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px">${proposal.country} · ${Array.isArray(proposal.theme) ? proposal.theme.join(", ") : proposal.theme}</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <div style="text-align:right"><div style="font-size:28px;font-weight:900;line-height:1">${totals.total}</div><div style="font-size:9px;color:#9ca3af">/100</div></div>
      <span style="padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;color:#fff;background:${bandBg(totals.rec)}">${totals.rec}</span>
    </div>
  </div>
  <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #e5e7eb;margin-bottom:12px">${dimBarHTML}</div>
  ${(recommendation || summary) ? `<div style="padding:8px 10px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px">AI Recommendation</div><div style="font-size:11px;color:#374151;line-height:1.5">${recommendation || summary}</div></div>` : ""}
  <div style="margin-bottom:12px">
    <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Hard Gates</div>
    ${gatesHTML}
  </div>
  <table style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:8px">${dimsHTML}</table>
  ${notesHTML}
  <div style="margin-top:16px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center">
    TIL RFP Classifier v3.4 · Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · Elimu-Soko
  </div>
</body></html>`;
}

function SortHeader({ label, sortKeyName, activeSortKey, sortDir, onSort }: {
  label: string;
  sortKeyName: SortKey;
  activeSortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = activeSortKey === sortKeyName;
  return (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-black dark:hover:text-white select-none"
      onClick={() => onSort(sortKeyName)}
    >
      {label} {active ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );
}

function downloadHTML(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PortfolioTable({ onSelectProposal, panelistId, panelistName, batchId, onBatchChange }: PortfolioTableProps) {
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [panelists, setPanelists] = useState<Panelist[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("raw_total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [unlockConfirm, setUnlockConfirm] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [filterTheme, setFilterTheme] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    let query = supabase
      .from("proposals")
      .select("id, org_name, country, theme, status, lead_reviewer_id, finalized_by, classifier_results(raw_total, recommendation, gates_passed, call1_json, call2_json)")
      .in("status", ["scored", "in_review", "finalized"]);

    if (batchId) {
      query = query.eq("batch_id", batchId);
    }

    const [propRes, panRes] = await Promise.all([
      query,
      supabase.from("panelists").select("id, name").order("name"),
    ]);

    if (panRes.data) setPanelists(panRes.data);

    if (propRes.data) {
      // Fetch override counts for review progress
      const proposalIds = (propRes.data as RawProposalRow[]).map((p) => p.id);
      const { data: overrides } = await supabase
        .from("panel_overrides")
        .select("proposal_id, sub_criterion_key, override_score")
        .in("proposal_id", proposalIds);

      // Count distinct sub_criterion_keys per proposal + build override maps
      const reviewedMap = new Map<string, Set<string>>();
      const overrideScoreMap = new Map<string, Record<string, number>>();
      for (const o of (overrides || [])) {
        const set = reviewedMap.get(o.proposal_id) || new Set();
        set.add(o.sub_criterion_key);
        reviewedMap.set(o.proposal_id, set);
        // Track latest override score per sub-criterion per proposal
        const scores = overrideScoreMap.get(o.proposal_id) || {};
        scores[o.sub_criterion_key] = o.override_score;
        overrideScoreMap.set(o.proposal_id, scores);
      }

      const rows: ProposalRow[] = (propRes.data as RawProposalRow[]).map((p) => {
        const cr = Array.isArray(p.classifier_results) ? p.classifier_results[0] : p.classifier_results;
        const pf = cr?.call1_json?.pilot_financials;
        let totalCost: number | null = null;
        let costPerTeacher: number | null = null;
        if (pf && (pf.cost_til != null || pf.cost_applicant != null || pf.cost_government_inkind != null)) {
          totalCost = (pf.cost_til ?? 0) + (pf.cost_applicant ?? 0) + (pf.cost_government_inkind ?? 0);
          if (pf.total_teachers && pf.total_teachers > 0) {
            costPerTeacher = Math.round(totalCost! / pf.total_teachers);
          }
        }
        // Compute adjusted totals using overrides
        const propOverrides = overrideScoreMap.get(p.id) || {};
        const hasOverrides = Object.keys(propOverrides).length > 0;
        let adjustedTotal: number | null = null;
        let adjustedRec: string | null = null;
        if (hasOverrides && cr?.call1_json) {
          const adjusted = computeTotals(cr.call1_json, cr.call2_json, propOverrides);
          adjustedTotal = adjusted.total;
          adjustedRec = adjusted.rec;
        }
        return {
          id: p.id, org_name: p.org_name || "Unknown", country: p.country || "",
          theme: Array.isArray(p.theme) ? p.theme : (p.theme ? [p.theme] : []), status: p.status, raw_total: cr?.raw_total ?? null,
          adjusted_total: adjustedTotal,
          adjusted_rec: adjustedRec,
          recommendation: cr?.recommendation ?? null, gates_passed: cr?.gates_passed ?? null,
          lead_reviewer_id: p.lead_reviewer_id,
          finalized_by: p.finalized_by,
          total_cost: totalCost,
          cost_per_teacher: costPerTeacher,
          reviewed_count: reviewedMap.get(p.id)?.size || 0,
        };
      });
      setProposals(rows);
    }
    setLoading(false);
  }, [batchId]);

  // Load batches on mount
  useEffect(() => {
    async function loadBatches() {
      const { data } = await supabase
        .from("batches")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });
      if (data) {
        setBatches(data);
        // Auto-select the most recent batch if none selected
        if (!batchId && data.length > 0) {
          onBatchChange(data[0].id);
        }
      }
    }
    loadBatches();
  }, [batchId, onBatchChange]);

  // Reload proposals when batchId changes
  useEffect(() => {
    if (!batchId) return;
    void (async () => { await loadData(); })();
  }, [batchId, loadData]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "raw_total" ? "desc" : "asc"); }
  }

  const sorted = [...proposals].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "org_name": case "country":
        cmp = (a[sortKey] || "").localeCompare(b[sortKey] || ""); break;
      case "theme":
        cmp = a.theme.join(", ").localeCompare(b.theme.join(", ")); break;
      case "raw_total":
        cmp = (a.adjusted_total ?? a.raw_total ?? 0) - (b.adjusted_total ?? b.raw_total ?? 0); break;
      case "recommendation":
        cmp = (BAND_ORDER[a.adjusted_rec || a.recommendation || ""] ?? 0) - (BAND_ORDER[b.adjusted_rec || b.recommendation || ""] ?? 0); break;
      case "gates_passed":
        cmp = (a.gates_passed ? 1 : 0) - (b.gates_passed ? 1 : 0); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const displayed = filterTheme ? sorted.filter((p) => p.theme.includes(filterTheme)) : sorted;

  const TOTAL_SUB_CRITERIA = 17;

  function getInitials(reviewerId: string | null): string | null {
    if (!reviewerId) return null;
    const p = panelists.find((pan) => pan.id === reviewerId);
    if (!p?.name) return null;
    return p.name.split(/\s+/).map((w) => w[0]).join("").toUpperCase();
  }

  async function handleLock(proposalId: string) {
    if (!panelistId) { alert("Select your name first."); return; }
    const p = proposals.find((pr) => pr.id === proposalId);
    if (p && p.reviewed_count < TOTAL_SUB_CRITERIA) {
      alert(`${p.reviewed_count}/${TOTAL_SUB_CRITERIA} sub-criteria confirmed. All ${TOTAL_SUB_CRITERIA} must be confirmed or overridden before locking.`);
      return;
    }
    await supabase.from("proposals").update({ status: "finalized", finalized_by: panelistId }).eq("id", proposalId);
    setProposals((prev) => prev.map((pr) => (pr.id === proposalId ? { ...pr, status: "finalized", finalized_by: panelistId } : pr)));
  }

  async function handleUnlock(proposalId: string) {
    await supabase.from("proposals").update({ status: "scored", finalized_by: null }).eq("id", proposalId);
    setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status: "scored", finalized_by: null } : p)));
    setUnlockConfirm(null);
  }

  async function handleExportAll() {
    setExporting(true);
    try {
      const ids = proposals.map((p) => p.id);
      const [crRes, ovRes] = await Promise.all([
        supabase.from("classifier_results").select("proposal_id, call1_json, call2_json").in("proposal_id", ids),
        supabase.from("panel_overrides").select("proposal_id, sub_criterion_key, original_score, override_score, rationale, created_at, panelists(name)").in("proposal_id", ids).order("created_at", { ascending: true }),
      ]);

      const resultMap = new Map((crRes.data || []).map((r: ClassifierResultRow) => [r.proposal_id, r]));
      const overrideMap = new Map<string, OverrideHistoryEntry[]>();
      for (const o of (ovRes.data || [])) {
        const arr = overrideMap.get(o.proposal_id) || [];
        arr.push({ ...o, panelist_name: (o.panelists as { name?: string } | null)?.name || "Unknown" });
        overrideMap.set(o.proposal_id, arr);
      }

      for (const p of proposals) {
        const cr = resultMap.get(p.id);
        if (!cr) continue;
        const history = overrideMap.get(p.id) || [];
        const latestOverrides: Record<string, number> = {};
        for (const o of history) latestOverrides[o.sub_criterion_key] = o.override_score;
        const totals = computeTotals(cr.call1_json, cr.call2_json, latestOverrides);
        const html = generateExportHTML(
          { org_name: p.org_name, country: p.country, theme: p.theme },
          cr.call1_json, cr.call2_json, totals, latestOverrides, history
        );
        downloadHTML(html, `TIL_Assessment_${p.org_name.replace(/[^a-zA-Z0-9]/g, "_")}.html`);
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err) {
      console.error("Export error:", err);
    }
    setExporting(false);
  }

  if (loading) return <div className="text-sm text-gray-500 dark:text-gray-400">Loading proposals...</div>;
  if (proposals.length === 0) return <div className="text-sm text-gray-500 dark:text-gray-400">No scored proposals found. Run a batch first.</div>;

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
        <span className="text-xs text-gray-400 dark:text-gray-400">{batches.length} batch{batches.length !== 1 ? "es" : ""}</span>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400 dark:text-gray-400">{displayed.length} of {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}</div>
          <div className="text-xs text-gray-300 dark:text-gray-600">|</div>
          {/* Theme filter tabs */}
          <button
            onClick={() => setFilterTheme(null)}
            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${!filterTheme ? "bg-gray-900 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
          >
            All
          </button>
          {CANONICAL_THEMES.map((t) => {
            const count = proposals.filter((p) => p.theme.includes(t)).length;
            if (count === 0) return null;
            const colors = THEME_COLORS[t];
            const isActive = filterTheme === t;
            return (
              <button
                key={t}
                onClick={() => setFilterTheme(isActive ? null : t)}
                title={t}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${isActive ? `${colors.bg} ${colors.text} ring-1 ${colors.ring}` : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
              >
                {THEME_SHORT[t]} <span className="text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="text-xs bg-black text-white rounded px-3 py-1.5 font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export All Reports"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
         <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <SortHeader label="Organisation" sortKeyName="org_name" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Country" sortKeyName="country" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Theme" sortKeyName="theme" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Gates" sortKeyName="gates_passed" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Score" sortKeyName="raw_total" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Band" sortKeyName="recommendation" activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total(K)</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">$/Tchr</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reviewed</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {displayed.map((p) => {
              const isLocked = p.status === "finalized";
              const allReviewed = p.reviewed_count >= TOTAL_SUB_CRITERIA;
              return (
                <tr
                  key={p.id}
                  className={`hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer transition-colors ${isLocked ? "bg-gray-50 dark:bg-gray-800" : ""}`}
                  onClick={() => onSelectProposal(p.id)}
                >
                  <td className="px-3 py-2.5 font-medium">{p.org_name}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{p.country}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      {p.theme.map((t) => {
                        const colors = THEME_COLORS[t];
                        const short = THEME_SHORT[t] || t.match(/^Theme \d+/)?.[0] || t;
                        return colors ? (
                          <span key={t} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors.bg} ${colors.text} cursor-default`} title={t}>{short}</span>
                        ) : (
                          <span key={t} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-default" title={t}>{short}</span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {p.gates_passed === null ? "—" : p.gates_passed ? (
                      <span className="text-green-600 font-semibold text-xs">PASS</span>
                    ) : (
                      <span className="text-red-600 font-semibold text-xs">FAIL</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-bold tabular-nums">
                    {p.adjusted_total != null ? (
                      <span title={`AI: ${p.raw_total}`}>
                        {p.adjusted_total}
                        {p.adjusted_total !== p.raw_total && <span className="text-xs text-gray-400 line-through ml-1 font-normal">{p.raw_total}</span>}
                      </span>
                    ) : (p.raw_total ?? "—")}
                  </td>
                  <td className="px-3 py-2.5">
                    {(() => {
                      const displayRec = p.adjusted_rec || p.recommendation;
                      const displayBand = BAND_STYLE[displayRec || ""] || { bg: "bg-gray-100", text: "text-gray-600" };
                      const changed = p.adjusted_rec && p.adjusted_rec !== p.recommendation;
                      return (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${displayBand.bg} ${displayBand.text}`} title={changed ? `AI: ${p.recommendation}` : undefined}>
                          {displayRec || "—"}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                    {p.total_cost != null ? `$${Math.round(p.total_cost / 1000)}K` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                    {p.cost_per_teacher != null ? `$${p.cost_per_teacher.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-semibold tabular-nums ${allReviewed ? "text-green-600" : "text-red-500"}`}>
                      {p.reviewed_count}/{TOTAL_SUB_CRITERIA}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    {isLocked ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-xs text-green-700 font-medium">Locked{getInitials(p.finalized_by) ? ` by ${getInitials(p.finalized_by)}` : ""}</span>
                        <button onClick={() => setUnlockConfirm(p.id)} className="text-xs text-gray-400 hover:text-black dark:hover:text-white" title="Unlock">🔓</button>
                      </div>
                    ) : (
                      <button onClick={() => handleLock(p.id)} className={`text-xs ${allReviewed ? "text-green-600 hover:text-green-800" : "text-gray-300 hover:text-black dark:hover:text-white"}`} title={allReviewed ? "Lock review" : `${p.reviewed_count}/${TOTAL_SUB_CRITERIA} confirmed — all must be confirmed to lock`}>
                        {allReviewed ? "☑" : "☐"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unlock confirmation modal */}
      {unlockConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-bold mb-2">Unlock this proposal?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              This will allow edits again. Confirming as <span className="font-semibold text-black">{panelistName || "Unknown"}</span>.
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleUnlock(unlockConfirm)} className="text-xs bg-black text-white rounded px-4 py-1.5 font-medium hover:bg-gray-800">Unlock</button>
              <button onClick={() => setUnlockConfirm(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white px-4 py-1.5">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}