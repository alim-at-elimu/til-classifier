"use client";

import { useEffect, useState } from "react";
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
  theme: string;
  status: string;
  raw_total: number | null;
  recommendation: string | null;
  gates_passed: boolean | null;
  lead_reviewer_id: string | null;
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

interface Panelist {
  id: string;
  name: string;
}

interface PortfolioTableProps {
  onSelectProposal: (id: string) => void;
  panelistId: string | null;
  panelistName: string | null;
}

// ── Export helpers ──
function getDimScaled(dimData: any, dimKey: string, overrides: Record<string, number>): number {
  if (!dimData) return 0;
  const raw = DIM_DEFS[dimKey].reduce((sum, sub) => {
    const key = `${dimKey}.${sub}`;
    return sum + (overrides[key] ?? dimData[sub]?.score ?? 0);
  }, 0);
  return Math.round((raw / DIM_MAX[dimKey]) * 20);
}

function computeTotals(call1: any, call2: any, overrides: Record<string, number>) {
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

function generateExportHTML(proposal: any, call1: any, call2: any, totals: any, latestOverrides: Record<string, number>, overrideHistory: any[]) {
  const gates = call1.gates || {};
  const consistencyNotes: string[] = call2?.consistency_notes || [];
  const recommendation: string = call2?.recommendation || "";
  const summary: string = call2?.summary || "";

  function getSubData(dimKey: string, subKey: string): any {
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
      const history = overrideHistory.filter((o: any) => o.sub_criterion_key === key);

      let detail = "";
      if (data?.interpretation) detail += `<div style="font-size:10px;color:#6b7280;margin:2px 0"><b>Interpretation:</b> ${data.interpretation}</div>`;
      if (data?.extract) detail += `<div style="font-size:10px;color:#9ca3af;margin:2px 0;font-style:italic">"${data.extract}"</div>`;
      if (data?.rubric_anchor) detail += `<div style="font-size:10px;color:#9ca3af;margin:2px 0"><b>Rubric (${aiScore}):</b> ${data.rubric_anchor}</div>`;

      let overrideHTML = "";
      if (history.length > 0) {
        overrideHTML = history.map((h: any) =>
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
      <div style="font-size:11px;color:#6b7280;margin-top:2px">${proposal.country} · ${proposal.theme}</div>
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

export function PortfolioTable({ onSelectProposal, panelistId, panelistName }: PortfolioTableProps) {
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [panelists, setPanelists] = useState<Panelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("raw_total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [unlockConfirm, setUnlockConfirm] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [propRes, panRes] = await Promise.all([
      supabase
        .from("proposals")
        .select("id, org_name, country, theme, status, lead_reviewer_id, classifier_results(raw_total, recommendation, gates_passed)")
        .in("status", ["scored", "in_review", "finalized"]),
      supabase.from("panelists").select("id, name").order("name"),
    ]);

    if (panRes.data) setPanelists(panRes.data);

    if (propRes.data) {
      const rows: ProposalRow[] = propRes.data.map((p: any) => {
        const cr = Array.isArray(p.classifier_results) ? p.classifier_results[0] : p.classifier_results;
        return {
          id: p.id, org_name: p.org_name || "Unknown", country: p.country || "",
          theme: p.theme || "", status: p.status, raw_total: cr?.raw_total ?? null,
          recommendation: cr?.recommendation ?? null, gates_passed: cr?.gates_passed ?? null,
          lead_reviewer_id: p.lead_reviewer_id,
        };
      });
      setProposals(rows);
    }
    setLoading(false);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "raw_total" ? "desc" : "asc"); }
  }

  const sorted = [...proposals].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "org_name": case "country": case "theme":
        cmp = (a[sortKey] || "").localeCompare(b[sortKey] || ""); break;
      case "raw_total":
        cmp = (a.raw_total ?? 0) - (b.raw_total ?? 0); break;
      case "recommendation":
        cmp = (BAND_ORDER[a.recommendation || ""] ?? 0) - (BAND_ORDER[b.recommendation || ""] ?? 0); break;
      case "gates_passed":
        cmp = (a.gates_passed ? 1 : 0) - (b.gates_passed ? 1 : 0); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function isBorderline(score: number | null): boolean {
    return score !== null && score >= 75 && score <= 84;
  }

  function getReviewerName(reviewerId: string | null): string | null {
    if (!reviewerId) return null;
    const p = panelists.find((pan) => pan.id === reviewerId);
    return p?.name || null;
  }

  async function handleAssignReviewers() {
    if (panelists.length === 0) return;
    setAssigning(true);

    const borderline = proposals.filter((p) => isBorderline(p.raw_total) && !p.lead_reviewer_id);
    let idx = Math.floor(Math.random() * panelists.length);

    for (const p of borderline) {
      const assignee = panelists[idx % panelists.length];
      idx++;

      const { error } = await supabase
        .from("proposals")
        .update({ lead_reviewer_id: assignee.id })
        .eq("id", p.id);

      if (!error) {
        setProposals((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, lead_reviewer_id: assignee.id } : pr));
      }
    }
    setAssigning(false);
  }

  async function handleLock(proposalId: string) {
    await supabase.from("proposals").update({ status: "finalized" }).eq("id", proposalId);
    setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status: "finalized" } : p)));
  }

  async function handleUnlock(proposalId: string) {
    await supabase.from("proposals").update({ status: "scored" }).eq("id", proposalId);
    setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status: "scored" } : p)));
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

      const resultMap = new Map((crRes.data || []).map((r: any) => [r.proposal_id, r]));
      const overrideMap = new Map<string, any[]>();
      for (const o of (ovRes.data || [])) {
        const arr = overrideMap.get(o.proposal_id) || [];
        arr.push({ ...o, panelist_name: (o as any).panelists?.name || "Unknown" });
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

  function SortHeader({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) {
    const active = sortKey === sortKeyName;
    return (
      <th
        className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-black select-none"
        onClick={() => handleSort(sortKeyName)}
      >
        {label} {active ? (sortDir === "asc" ? "↑" : "↓") : ""}
      </th>
    );
  }

  if (loading) return <div className="text-sm text-gray-500">Loading proposals...</div>;
  if (proposals.length === 0) return <div className="text-sm text-gray-500">No scored proposals found. Run a batch first.</div>;

  const borderlineCount = proposals.filter((p) => isBorderline(p.raw_total)).length;
  const unassignedBorderline = proposals.filter((p) => isBorderline(p.raw_total) && !p.lead_reviewer_id).length;

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400">{proposals.length} proposal{proposals.length !== 1 ? "s" : ""}</div>
          {borderlineCount > 0 && (
            <div className="text-xs text-orange-600">{borderlineCount} for review (75-84)</div>
          )}
          <div className="text-xs text-gray-300">|</div>
          {[...new Set(proposals.map((p) => p.theme))].sort().map((t) => {
            const short = t.match(/^Theme \d+/)?.[0] || t;
            const desc = t.replace(/^Theme \d+\s*[—–-]\s*/, "");
            return <div key={t} className="text-xs text-gray-400"><span className="text-gray-600 font-medium">{short}:</span> {desc}</div>;
          })}
        </div>
      <div className="flex items-center gap-2">
          {unassignedBorderline > 0 && (
            <button
              onClick={handleAssignReviewers}
              disabled={assigning}
              className="text-xs bg-orange-500 text-white rounded px-3 py-1.5 font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {assigning ? "Assigning..." : `Assign Reviewers (${unassignedBorderline})`}
            </button>
          )}
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="text-xs bg-black text-white rounded px-3 py-1.5 font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export All Reports"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-gray-200">
         <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader label="Organisation" sortKeyName="org_name" />
              <SortHeader label="Country" sortKeyName="country" />
              <SortHeader label="Theme" sortKeyName="theme" />
              <SortHeader label="Gates" sortKeyName="gates_passed" />
              <SortHeader label="Score" sortKeyName="raw_total" />
              <SortHeader label="Band" sortKeyName="recommendation" />
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Review</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((p) => {
              const band = BAND_STYLE[p.recommendation || ""] || { bg: "bg-gray-100", text: "text-gray-600" };
              const isLocked = p.status === "finalized";
              const borderline = isBorderline(p.raw_total);
              const reviewerName = getReviewerName(p.lead_reviewer_id);
              return (
                <tr
                  key={p.id}
                  className={`hover:bg-blue-50 cursor-pointer transition-colors ${isLocked ? "bg-gray-50" : ""}`}
                  onClick={() => onSelectProposal(p.id)}
                >
                  <td className="px-3 py-2.5 font-medium">{p.org_name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{p.country}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{p.theme.match(/^Theme \d+/)?.[0] || p.theme}</td>
                  <td className="px-3 py-2.5">
                    {p.gates_passed === null ? "—" : p.gates_passed ? (
                      <span className="text-green-600 font-semibold text-xs">PASS</span>
                    ) : (
                      <span className="text-red-600 font-semibold text-xs">FAIL</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-bold tabular-nums">{p.raw_total ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${band.bg} ${band.text}`}>
                      {p.recommendation || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {borderline ? (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700">Review</span>
                        {reviewerName && <span className="text-xs text-gray-500">{reviewerName}</span>}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    {isLocked ? (
                      <button onClick={() => setUnlockConfirm(p.id)} className="text-xs text-gray-400 hover:text-black" title="Locked">🔒</button>
                    ) : (
                      <button onClick={() => handleLock(p.id)} className="text-xs text-gray-300 hover:text-black" title="Click to lock">🔓</button>
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
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-bold mb-2">Unlock this proposal?</h3>
            <p className="text-xs text-gray-500 mb-4">
              This will allow edits again. Confirming as <span className="font-semibold text-black">{panelistName || "Unknown"}</span>.
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleUnlock(unlockConfirm)} className="text-xs bg-black text-white rounded px-4 py-1.5 font-medium hover:bg-gray-800">Unlock</button>
              <button onClick={() => setUnlockConfirm(null)} className="text-xs text-gray-500 hover:text-black px-4 py-1.5">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}