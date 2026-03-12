"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Rubric structure ──
const DIM_DEFS: Record<string, string[]> = {
  government_depth: ["named_counterparts", "documented_engagement", "institutional_home", "government_delivery_roles"],
  adoption_readiness: ["transition_logic", "capacity_shift", "adoption_timeline"],
  cost_realism: ["pilot_unit_cost", "cost_ownership_trajectory", "steady_state_fiscal"],
  innovation_quality: ["problem_solution_fit", "operational_clarity", "pilot_learning_architecture", "team_timeline_realism"],
  evidence_strength: ["decision_useful_evidence", "government_decision_mechanisms", "learning_outcome_evidence_chain"],
};

const DIM_MAX: Record<string, number> = {
  government_depth: 20, adoption_readiness: 15, cost_realism: 15, innovation_quality: 20, evidence_strength: 15,
};

const DIM_LABELS: Record<string, string> = {
  government_depth: "Government Depth",
  adoption_readiness: "Adoption Readiness",
  cost_realism: "Cost Realism",
  innovation_quality: "Innovation Quality",
  evidence_strength: "Evidence Strength",
};

const SUB_LABELS: Record<string, string> = {
  named_counterparts: "Named counterparts & roles",
  documented_engagement: "Documented engagement",
  institutional_home: "Institutional home",
  government_delivery_roles: "Government delivery roles",
  transition_logic: "Transition logic",
  capacity_shift: "Capacity shift plan",
  adoption_timeline: "Adoption timeline",
  pilot_unit_cost: "Pilot unit cost",
  cost_ownership_trajectory: "Cost ownership trajectory",
  steady_state_fiscal: "Steady-state fiscal",
  problem_solution_fit: "Problem-solution fit",
  operational_clarity: "Operational clarity",
  pilot_learning_architecture: "Learning architecture",
  team_timeline_realism: "Team & timeline realism",
  decision_useful_evidence: "Decision-useful evidence",
  government_decision_mechanisms: "Decision mechanisms",
  learning_outcome_evidence_chain: "Learning outcome chain",
};

const GATE_LABELS: Record<string, string> = {
  country_theme_fit: "Country & Theme",
  scale_duration_compliance: "Scale & Duration",
  public_system_embedding: "Public System Embedding",
};

const SCORE_BG: Record<number, string> = { 1: "bg-red-500", 2: "bg-orange-400", 3: "bg-yellow-400", 4: "bg-green-500", 5: "bg-emerald-500" };
const SCORE_TEXT: Record<number, string> = { 1: "text-white", 2: "text-white", 3: "text-black", 4: "text-white", 5: "text-white" };
const BAND_STYLE: Record<string, string> = { Excellent: "bg-green-600 text-white", Good: "bg-blue-600 text-white", Weak: "bg-amber-500 text-white", Fail: "bg-red-600 text-white" };

// ── Scoring math ──
function getDimScaled(dimData: any, dimKey: string, latestOverrides: Record<string, number>): number {
  if (!dimData) return 0;
  const raw = DIM_DEFS[dimKey].reduce((sum, sub) => {
    const key = `${dimKey}.${sub}`;
    return sum + (latestOverrides[key] ?? dimData[sub]?.score ?? 0);
  }, 0);
  return Math.round((raw / DIM_MAX[dimKey]) * 20);
}

function computeTotals(call1: any, call2: any, latestOverrides: Record<string, number>) {
  if (!call1) return { dims: {} as Record<string, number>, total: 0, rec: "Fail" };
  const d1 = call1.dimensions;
  const d2 = call2?.dimensions;
  const dims: Record<string, number> = {
    government_depth: getDimScaled(d1?.government_depth, "government_depth", latestOverrides),
    adoption_readiness: getDimScaled(d1?.adoption_readiness, "adoption_readiness", latestOverrides),
    cost_realism: getDimScaled(d1?.cost_realism, "cost_realism", latestOverrides),
    innovation_quality: d2 ? getDimScaled(d2.innovation_quality, "innovation_quality", latestOverrides) : 0,
    evidence_strength: d2 ? getDimScaled(d2.evidence_strength, "evidence_strength", latestOverrides) : 0,
  };
  const total = Object.values(dims).reduce((s, v) => s + v, 0);
  let rec = "Fail";
  if (total >= 85) rec = "Excellent";
  else if (total >= 75) rec = "Good";
  else if (total >= 60) rec = "Weak";
  return { dims, total, rec };
}

// ── Export HTML ──
function generateExportHTML(proposal: any, call1: any, call2: any, totals: any, latestOverrides: Record<string, number>, overrideHistory: OverrideRecord[]) {
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
    gatesHTML += `
      <div style="border:1px solid ${passed ? "#bbf7d0" : "#fecaca"};border-radius:6px;padding:8px 10px;margin-bottom:6px;background:${passed ? "#f0fdf4" : "#fef2f2"}">
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

      dimsHTML += `
        <tr style="border-top:1px solid #f3f4f6">
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

// ── Types ──
interface OverrideRecord {
  id: string;
  panelist_id: string;
  panelist_name: string;
  sub_criterion_key: string;
  original_score: number;
  override_score: number;
  rationale: string;
  created_at: string;
}

interface ScoreCardProps {
  proposalId: string;
  panelistId: string | null;
  panelistName: string | null;
  onBack: () => void;
}

export function ScoreCard({ proposalId, panelistId, panelistName, onBack }: ScoreCardProps) {
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<any>(null);
  const [call1, setCall1] = useState<any>(null);
  const [call2, setCall2] = useState<any>(null);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [expandedGate, setExpandedGate] = useState<string | null>(null);
  const [overrideHistory, setOverrideHistory] = useState<OverrideRecord[]>([]);
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [editScore, setEditScore] = useState("");
  const [editRationale, setEditRationale] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [propRes, crRes, ovRes] = await Promise.all([
        supabase.from("proposals").select("id, org_name, country, theme, status").eq("id", proposalId).single(),
        supabase.from("classifier_results").select("call1_json, call2_json, gates_passed, raw_total, recommendation").eq("proposal_id", proposalId).single(),
        supabase.from("panel_overrides").select("id, panelist_id, sub_criterion_key, original_score, override_score, rationale, created_at, panelists(name)").eq("proposal_id", proposalId).order("created_at", { ascending: true }),
      ]);
      if (propRes.data) setProposal(propRes.data);
      if (crRes.data) { setCall1(crRes.data.call1_json); setCall2(crRes.data.call2_json); }
      if (ovRes.data) {
        setOverrideHistory(ovRes.data.map((o: any) => ({ ...o, panelist_name: o.panelists?.name || "Unknown" })));
      }
      setLoading(false);
    }
    load();
  }, [proposalId]);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Loading...</div>;
  if (!proposal || !call1) return <div className="text-sm text-red-500">No data found.</div>;

  const isLocked = proposal.status === "finalized";
  const gates = call1.gates || {};
  const allGatesPassed = call1.all_gates_passed !== false;
  const consistencyNotes: string[] = call2?.consistency_notes || [];
  const recommendation: string = call2?.recommendation || "";
  const summary: string = call2?.summary || "";

  const latestOverrides: Record<string, number> = {};
  for (const o of overrideHistory) latestOverrides[o.sub_criterion_key] = o.override_score;

  const totals = computeTotals(call1, call2, latestOverrides);
  const bandClass = BAND_STYLE[totals.rec] || "bg-gray-500 text-white";

  function getSubData(dimKey: string, subKey: string): any {
    const src = dimKey === "innovation_quality" || dimKey === "evidence_strength" ? call2?.dimensions : call1?.dimensions;
    return src?.[dimKey]?.[subKey] || null;
  }

  function getHistoryForSub(key: string): OverrideRecord[] {
    return overrideHistory.filter((o) => o.sub_criterion_key === key);
  }

  function startEdit(subKey: string) {
    if (isLocked) return;
    if (!panelistId) { alert("Select your name first."); return; }
    setEditingSub(subKey);
    setExpandedSub(subKey);
    setEditScore("");
    setEditRationale("");
  }

  async function submitOverride(dimKey: string, subKey: string) {
    const key = `${dimKey}.${subKey}`;
    const data = getSubData(dimKey, subKey);
    const aiScore = data?.score ?? 0;
    const scoreVal = parseInt(editScore, 10);
    if (!scoreVal || scoreVal < 1 || scoreVal > 5) { alert("Select a score."); return; }
    if (!editRationale.trim()) { alert("Rationale is required."); return; }
    if (!panelistId) return;

    setSaving(true);
    const { data: inserted, error } = await supabase
      .from("panel_overrides")
      .insert({ proposal_id: proposalId, panelist_id: panelistId, sub_criterion_key: key, original_score: aiScore, override_score: scoreVal, rationale: editRationale.trim() })
      .select("id, panelist_id, sub_criterion_key, original_score, override_score, rationale, created_at")
      .single();

    if (error) { alert("Failed to save: " + error.message); setSaving(false); return; }
    if (inserted) setOverrideHistory((prev) => [...prev, { ...inserted, panelist_name: panelistName || "You" }]);
    setEditingSub(null);
    setEditScore("");
    setEditRationale("");
    setSaving(false);
  }

  async function confirmSubCriterion(dimKey: string, subKey: string) {
    const key = `${dimKey}.${subKey}`;
    if (!panelistId) { alert("Select your name first."); return; }
    if (isLocked) return;
    const data = getSubData(dimKey, subKey);
    const aiScore = data?.score ?? 0;

    setSaving(true);
    const { data: inserted, error } = await supabase
      .from("panel_overrides")
      .insert({ proposal_id: proposalId, panelist_id: panelistId, sub_criterion_key: key, original_score: aiScore, override_score: aiScore, rationale: "" })
      .select("id, panelist_id, sub_criterion_key, original_score, override_score, rationale, created_at")
      .single();

    if (error) { alert("Failed to save: " + error.message); setSaving(false); return; }
    if (inserted) setOverrideHistory((prev) => [...prev, { ...inserted, panelist_name: panelistName || "You" }]);
    setSaving(false);
  }

  function handleExport() {
    const html = generateExportHTML(proposal, call1, call2, totals, latestOverrides, overrideHistory);
    const safeName = proposal.org_name.replace(/[^a-zA-Z0-9]/g, "_");
    downloadHTML(html, `TIL_Assessment_${safeName}.html`);
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-black">← Back to portfolio</button>
        <button onClick={handleExport} className="text-xs bg-black text-white rounded px-3 py-1.5 font-medium hover:bg-gray-800">Export Report</button>
      </div>

      {/* Header */}
      <div className="rounded border border-gray-200 bg-white p-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold leading-tight">{proposal.org_name}</h2>
            <div className="text-xs text-gray-500 mt-0.5">{proposal.country} · {Array.isArray(proposal.theme) ? proposal.theme.join(", ") : proposal.theme}</div>
            {isLocked && <span className="inline-block mt-1 text-xs font-semibold bg-gray-200 text-gray-600 rounded px-1.5 py-0.5">🔒 Locked</span>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-3xl font-black tabular-nums leading-none">{totals.total}</div>
              <div className="text-xs text-gray-400">/100</div>
            </div>
            <span className={`px-3 py-1.5 rounded text-xs font-bold ${bandClass}`}>{totals.rec}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          {Object.entries(DIM_LABELS).map(([dk, label]) => {
            const s = totals.dims[dk] ?? 0;
            return (
              <div key={dk} className="flex-1 text-center">
                <div className={`text-base font-bold tabular-nums ${s >= 16 ? "text-green-600" : s >= 12 ? "text-yellow-600" : "text-red-500"}`}>{s}</div>
                <div className="text-xs text-gray-400 leading-tight">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Recommendation + Notes */}
      <div className="space-y-2 mb-4">
        {(recommendation || summary) && (
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2.5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">AI Recommendation</h3>
            <div className="text-xs text-gray-700 leading-relaxed">{recommendation || summary}</div>
          </div>
        )}
        {consistencyNotes.length > 0 && (
          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2.5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Consistency Notes</h3>
            <div className="space-y-1">
              {consistencyNotes.map((note, i) => <div key={i} className="text-xs text-gray-600 leading-relaxed">{note}</div>)}
            </div>
          </div>
        )}
      </div>

      {/* Gates */}
      <div className="mb-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Hard Gates</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(GATE_LABELS).map(([gateKey, gateLabel]) => {
            const gate = gates[gateKey];
            if (!gate) return null;
            const passed = gate.pass !== false && gate.score >= 3;
            const isExp = expandedGate === gateKey;
            return (
              <div key={gateKey} className="rounded border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedGate(isExp ? null : gateKey)}
                  className={`w-full flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium ${passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"} hover:opacity-80`}
                >
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold flex-shrink-0 ${SCORE_BG[gate.score]} ${SCORE_TEXT[gate.score]}`}>{gate.score}</span>
                  <span className="flex-1 text-left">{gateLabel}</span>
                  <span className="text-gray-400 text-xs">{isExp ? "▲" : "▼"}</span>
                </button>
                {isExp && (
                  <div className="px-2.5 py-2 bg-white space-y-1 border-t border-gray-100">
                    {gate.extract && <div className="text-xs"><span className="font-semibold text-gray-600">Extract: </span><span className="italic text-gray-500">"{gate.extract}"</span></div>}
                    {gate.interpretation && <div className="text-xs"><span className="font-semibold text-gray-600">Interpretation: </span><span className="text-gray-500">{gate.interpretation}</span></div>}
                    {gate.rubric_anchor && <div className="text-xs bg-gray-50 rounded px-2 py-1 mt-0.5"><span className="font-semibold text-gray-600">Rubric ({gate.score}): </span><span className="text-gray-500">{gate.rubric_anchor}</span></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!allGatesPassed && <div className="mt-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">GATE FAILURE — dimension scores are advisory only.</div>}
      </div>

      {/* Score table */}
      <div className="rounded border border-gray-200 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 pl-2.5 w-8"></th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">Sub-criterion</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider py-2 w-16">{isLocked ? "" : "Edit"}</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(DIM_DEFS).map(([dimKey, subs]) => {
              const dimScore = totals.dims[dimKey] ?? 0;
              return subs.map((subKey, i) => {
                const data = getSubData(dimKey, subKey);
                const aiScore = data?.score ?? 0;
                const overrideKey = `${dimKey}.${subKey}`;
                const currentScore = latestOverrides[overrideKey] ?? aiScore;
                const hasOverride = latestOverrides[overrideKey] !== undefined;
                const isExp = expandedSub === overrideKey;
                const isFirst = i === 0;
                const isLast = i === subs.length - 1;
                const hasBorderline = data?.borderline && typeof data.borderline === "string";
                const hasPanelVerify = data?.panel_verify && typeof data.panel_verify === "string";
                const history = getHistoryForSub(overrideKey);
                const isReviewed = history.length > 0;
                const isEditing = editingSub === overrideKey;

                return (
                  <tr key={overrideKey}>
                    <td colSpan={3} className="p-0">
                      {isFirst && (
                        <div className="bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-600 border-t border-gray-200 flex justify-between items-center">
                          <span>{DIM_LABELS[dimKey]}</span>
                          <span className={`text-sm tabular-nums font-bold ${dimScore >= 16 ? "text-green-600" : dimScore >= 12 ? "text-yellow-600" : "text-red-500"}`}>
                            {dimScore}<span className="text-xs text-gray-400 font-normal">/20</span>
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex items-center px-2.5 py-1.5 cursor-pointer hover:bg-blue-50 transition-colors ${isLast && !isExp ? "border-b border-gray-100" : ""}`}
                        onClick={() => setExpandedSub(isExp ? null : overrideKey)}
                      >
                        <div className="w-7 flex-shrink-0">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${SCORE_BG[currentScore]} ${SCORE_TEXT[currentScore]} ${hasOverride ? "ring-2 ring-purple-400" : ""}`}>
                            {currentScore}
                          </span>
                        </div>
                        <div className="flex-1 text-xs text-gray-700 flex items-center gap-1 pl-1">
                          {SUB_LABELS[subKey] || subKey}
                          {hasBorderline && <span className="bg-amber-100 text-amber-700 rounded px-1 py-0.5 text-xs font-bold leading-none">B</span>}
                          {hasPanelVerify && <span className="bg-purple-100 text-purple-700 rounded px-1 py-0.5 text-xs font-bold leading-none">P</span>}
                          {hasOverride && <span className="text-gray-400 line-through ml-1">{aiScore}</span>}
                          {history.length > 0 && <span className="text-purple-400 text-xs">({history.length})</span>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isReviewed && <span className="text-green-600 text-xs font-medium">✓</span>}
                          {!isLocked && !isReviewed && (
                            <button onClick={(e) => { e.stopPropagation(); confirmSubCriterion(dimKey, subKey); }} className="text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded px-1.5 py-0.5" title="Confirm (no change)">✓</button>
                          )}
                          {!isLocked && (
                            <button onClick={(e) => { e.stopPropagation(); startEdit(overrideKey); }} className="text-xs text-gray-400 hover:text-black hover:bg-gray-100 rounded px-2 py-0.5">Edit</button>
                          )}
                        </div>
                      </div>

                      {isExp && data && (
                        <div className={`bg-slate-50 border-l-4 border-blue-400 px-3 py-2.5 space-y-2 ${isLast ? "border-b border-gray-100" : ""}`}>
                          {data.extract && <div className="text-xs leading-relaxed"><span className="font-semibold text-gray-600">Extract: </span><span className="italic text-gray-500">"{data.extract}"</span></div>}
                          {data.interpretation && <div className="text-xs leading-relaxed"><span className="font-semibold text-gray-600">Interpretation: </span><span className="text-gray-500">{data.interpretation}</span></div>}
                          {data.rubric_anchor && (
                            <div className="rounded bg-white border border-gray-200 px-2.5 py-1.5">
                              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Rubric level {aiScore}</div>
                              <div className="text-xs text-gray-500 leading-relaxed">{data.rubric_anchor}</div>
                            </div>
                          )}
                          {hasBorderline && (
                            <div className="rounded bg-amber-50 border border-amber-200 px-2.5 py-2 space-y-1.5">
                              <div className="text-xs font-semibold text-amber-700">Borderline: {data.borderline}</div>
                              {data.borderline_rubric_low && (
                                <div className="rounded bg-white border border-amber-100 px-2.5 py-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[aiScore]} ${SCORE_TEXT[aiScore]}`}>{aiScore}</span>
                                    <span className="text-xs font-semibold text-gray-600">Lower level (awarded)</span>
                                  </div>
                                  <div className="text-xs text-gray-500 ml-6">{data.borderline_rubric_low}</div>
                                </div>
                              )}
                              {data.borderline_rubric_high && (
                                <div className="rounded bg-white border border-amber-100 px-2.5 py-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[Math.min(aiScore + 1, 5)]} ${SCORE_TEXT[Math.min(aiScore + 1, 5)]}`}>{aiScore + 1}</span>
                                    <span className="text-xs font-semibold text-gray-600">Higher level (not awarded)</span>
                                  </div>
                                  <div className="text-xs text-gray-500 ml-6">{data.borderline_rubric_high}</div>
                                </div>
                              )}
                            </div>
                          )}
                          {hasPanelVerify && (
                            <div className="text-xs rounded bg-purple-50 border border-purple-200 px-2.5 py-1.5">
                              <span className="font-semibold text-purple-700">Panel verify: </span>{data.panel_verify}
                            </div>
                          )}
                          {history.length > 0 && (
                            <div className="pt-1.5 border-t border-gray-200">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Override history</div>
                              <div className="space-y-1">
                                {history.map((h) => (
                                  <div key={h.id} className="text-xs bg-white border border-gray-200 rounded px-2.5 py-1.5 flex items-start gap-1.5">
                                    <span className="flex-shrink-0 flex items-center gap-0.5">
                                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[h.original_score]} ${SCORE_TEXT[h.original_score]}`}>{h.original_score}</span>
                                      <span className="text-gray-300">→</span>
                                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[h.override_score]} ${SCORE_TEXT[h.override_score]}`}>{h.override_score}</span>
                                    </span>
                                    <span className="flex-1 text-gray-600 leading-relaxed">
                                      <span className="font-semibold text-gray-800">{h.panelist_name}</span>: {h.rationale}
                                      <span className="text-gray-400 ml-1">{new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {isEditing && !isLocked && (
                            <div className="pt-1.5 border-t border-gray-200">
                              <div className="bg-white rounded border border-blue-300 px-3 py-2.5 shadow-sm">
                                <div className="text-xs font-semibold text-gray-700 mb-2">Override score</div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs text-gray-500">Score:</span>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((v) => (
                                      <button
                                        key={v}
                                        onClick={() => setEditScore(String(v))}
                                        className={`w-7 h-7 rounded text-xs font-bold transition-all ${editScore === String(v) ? `${SCORE_BG[v]} ${SCORE_TEXT[v]} ring-2 ring-blue-400 scale-110` : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                                      >{v}</button>
                                    ))}
                                  </div>
                                </div>
                                <textarea
                                  placeholder="Rationale (required)"
                                  value={editRationale}
                                  onChange={(e) => setEditRationale(e.target.value)}
                                  rows={2}
                                  className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent mb-2"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => submitOverride(dimKey, subKey)}
                                    disabled={saving || !editScore || !editRationale.trim()}
                                    className="text-xs bg-black text-white rounded px-3 py-1 font-medium hover:bg-gray-800 disabled:opacity-30"
                                  >{saving ? "Saving..." : "Save"}</button>
                                  <button onClick={() => { setEditingSub(null); setEditScore(""); setEditRationale(""); }} className="text-xs text-gray-400 hover:text-black px-2 py-1">Cancel</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}