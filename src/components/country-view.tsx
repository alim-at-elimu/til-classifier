"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Constants ──
const DIM_DEFS: Record<string, string[]> = {
  government_depth: ["named_counterparts", "documented_engagement", "institutional_home", "government_delivery_roles"],
  adoption_readiness: ["transition_logic", "capacity_shift", "adoption_timeline"],
  cost_realism: ["pilot_unit_cost", "cost_ownership_trajectory", "steady_state_fiscal"],
  innovation_quality: ["problem_solution_fit", "operational_clarity", "pilot_learning_architecture", "team_timeline_realism"],
  evidence_strength: ["decision_useful_evidence", "government_decision_mechanisms", "learning_outcome_evidence_chain"],
};

const DIM_MAX: Record<string, number> = {
  government_depth: 20, adoption_readiness: 15, cost_realism: 15,
  innovation_quality: 20, evidence_strength: 15,
};

const DIM_LABELS: Record<string, string> = {
  government_depth: "Gov Depth", adoption_readiness: "Adoption", cost_realism: "Cost",
  innovation_quality: "Innovation", evidence_strength: "Evidence",
};

const THEME_SHORT: Record<string, string> = {
  "Theme 1 — Structured Pedagogy": "T1 Pedagogy",
  "Theme 2 — Teacher Coaching and Mentoring": "T2 Coaching",
  "Theme 3 — EdTech-Enabled Learning": "T3 EdTech",
  "Theme 4 — Assessment for Learning": "T4 Assessment",
};

// ── Types ──
interface BatchOption { id: string; name: string; created_at: string; }

type SubCriterionScore = { score?: number };
type DimScores = Record<string, Record<string, SubCriterionScore>>;
type CallJson = { dimensions?: DimScores } & Record<string, unknown>;


interface InnovatorData {
  proposalId: string;
  orgName: string;
  country: string;
  themes: string[];
  adjustedTotal: number;
  band: string;
  gatesPassed: boolean;
  dimScores: Record<string, number>;
  totalCost: number | null;
  costPerTeacher: number | null;
}

interface PilotFinancials {
  cost_til?: number | null;
  cost_applicant?: number | null;
  cost_government_inkind?: number | null;
  total_teachers?: number | null;
}

interface CountryGroup {
  country: string;
  innovators: InnovatorData[];
  avgScore: number;
}

interface CountryViewProps {
  batchId: string | null;
  onBatchChange: (batchId: string | null) => void;
}

// ── Helpers ──
function getDimRaw(call1: CallJson, call2: CallJson, dimKey: string, overrides: Record<string, number>): number {
  const subs = DIM_DEFS[dimKey];
  const src = (dimKey === "innovation_quality" || dimKey === "evidence_strength")
    ? call2?.dimensions : call1?.dimensions;
  let total = 0;
  for (const sub of subs) {
    const key = `${dimKey}.${sub}`;
    total += overrides[key] ?? src?.[dimKey]?.[sub]?.score ?? 0;
  }
  return total;
}

function getDimScaled(call1: CallJson, call2: CallJson, dimKey: string, overrides: Record<string, number>): number {
  const raw = getDimRaw(call1, call2, dimKey, overrides);
  // Scale every dimension to /20, so 5 dims × 20 = 100 max total
  return Math.round((raw / DIM_MAX[dimKey]) * 20);
}

function computeAdjustedTotal(call1: CallJson, call2: CallJson, overrides: Record<string, number>): number {
  let total = 0;
  for (const dimKey of Object.keys(DIM_DEFS)) {
    total += getDimScaled(call1, call2, dimKey, overrides);
  }
  return total;
}

function bandForTotal(total: number): string {
  if (total >= 85) return "Excellent";
  if (total >= 75) return "Good";
  if (total >= 60) return "Weak";
  return "Fail";
}

const BAND_COLOR: Record<string, { bg: string; text: string }> = {
  Excellent: { bg: "bg-green-100", text: "text-green-800" },
  Good: { bg: "bg-blue-100", text: "text-blue-800" },
  Weak: { bg: "bg-amber-100", text: "text-amber-800" },
  Fail: { bg: "bg-red-100", text: "text-red-800" },
};

const BAND_HTML_BG: Record<string, string> = {
  Excellent: "#16a34a", Good: "#2563eb", Weak: "#f59e0b", Fail: "#dc2626",
};

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

function generateExportHTML(groups: CountryGroup[], batchName: string): string {
  const rows = groups.map((g) => {
    const innovatorRows = g.innovators.map((inv, i) => {
      const bandBg = BAND_HTML_BG[inv.band] || "#6b7280";
      const themes = inv.themes.map((t) => THEME_SHORT[t] || t).join(", ");
      const dimCells = Object.keys(DIM_DEFS).map((dk) => {
        const s = inv.dimScores[dk];
        const color = s >= 16 ? "#16a34a" : s >= 12 ? "#ca8a04" : "#ef4444";
        return `<td style="padding:6px 10px;text-align:center;color:${color};font-weight:600">${s}/20</td>`;
      }).join("");
      return `<tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:6px 10px;text-align:center">${i + 1}</td>
        <td style="padding:6px 10px;font-weight:600">${inv.orgName}</td>
        <td style="padding:6px 10px;font-size:11px">${themes}</td>
        ${dimCells}
        <td style="padding:6px 10px;text-align:center;font-weight:700">${inv.adjustedTotal}/100</td>
        <td style="padding:6px 10px;text-align:center"><span style="background:${bandBg};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${inv.band}</span></td>
        <td style="padding:6px 10px;text-align:center">${inv.gatesPassed ? "✓ Pass" : "✗ Fail"}</td>
        <td style="padding:6px 10px;text-align:right;font-family:monospace;font-size:11px;color:#4b5563">${inv.totalCost != null ? `$${Math.round(inv.totalCost / 1000)}K` : "—"}</td>
        <td style="padding:6px 10px;text-align:right;font-family:monospace;font-size:11px;color:#4b5563">${inv.costPerTeacher != null ? `$${inv.costPerTeacher.toLocaleString()}` : "—"}</td>
      </tr>`;
    }).join("");

    const dimHeaders = Object.keys(DIM_DEFS).map((dk) =>
      `<th style="padding:6px 10px;text-align:center;font-size:11px;font-weight:600;background:#f3f4f6">${DIM_LABELS[dk]}</th>`
    ).join("");

    return `<div style="page-break-before:auto;margin-bottom:32px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:12px">
        <h2 style="margin:0 0 4px 0;font-size:18px">${g.country}</h2>
        <span style="font-size:13px;color:#64748b">${g.innovators.length} applicant${g.innovators.length !== 1 ? "s" : ""} · Avg score: ${g.avgScore}/100</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e5e7eb">
        <thead>
          <tr style="background:#f9fafb;border-bottom:2px solid #d1d5db">
            <th style="padding:6px 10px;text-align:center;width:40px">#</th>
            <th style="padding:6px 10px;text-align:left">Innovator</th>
            <th style="padding:6px 10px;text-align:left">Theme</th>
            ${dimHeaders}
            <th style="padding:6px 10px;text-align:center">Total</th>
            <th style="padding:6px 10px;text-align:center">Band</th>
            <th style="padding:6px 10px;text-align:center">Gates</th>
            <th style="padding:6px 10px;text-align:right;font-size:11px;font-weight:600;background:#f3f4f6">Pilot Cost</th>
            <th style="padding:6px 10px;text-align:right;font-size:11px;font-weight:600;background:#f3f4f6">$/Teacher</th>
          </tr>
        </thead>
        <tbody>${innovatorRows}</tbody>
      </table>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Country View — ${batchName}</title>
<style>
  body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; max-width: 1100px; margin: 0 auto; padding: 32px 20px; font-size: 12px; color: #1e293b; }
  @media print { div { page-break-inside: avoid; } }
</style>
</head><body>
<h1 style="font-size:22px;margin-bottom:4px">Country View</h1>
<p style="color:#64748b;margin-bottom:24px">${batchName} · Generated ${new Date().toLocaleDateString()}</p>
${rows}
<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#94a3b8">
  TIL RFP Classifier · Country View · ${batchName}
</div>
</body></html>`;
}

interface ClassifierResultRow {
  proposal_id: string;
  call1_json: CallJson;
  call2_json: CallJson;
  gates_passed: boolean | null;
  raw_total: number | null;
  recommendation: string | null;
}

// ── Component ──
export function CountryView({ batchId, onBatchChange }: CountryViewProps) {
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [groups, setGroups] = useState<CountryGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // Load batches
  useEffect(() => {
    async function loadBatches() {
      const { data } = await supabase.from("batches").select("id, name, created_at").order("created_at", { ascending: false });
      if (data) {
        setBatches(data);
        if (!batchId && data.length > 0) onBatchChange(data[0].id);
      }
    }
    loadBatches();
  }, [batchId, onBatchChange]);

  // Load data when batch changes
  useEffect(() => {
    async function loadData() {
      if (!batchId) { setGroups([]); return; }
      setLoading(true);

      // Fetch proposals for this batch
      const { data: proposals } = await supabase
        .from("proposals")
        .select("id, org_name, country, theme, status")
        .eq("batch_id", batchId)
        .in("status", ["scored", "in_review", "finalized"]);

      if (!proposals || proposals.length === 0) { setGroups([]); setLoading(false); return; }

      const proposalIds = proposals.map((p) => p.id);

      // Fetch results and overrides in parallel
      const [crRes, ovRes] = await Promise.all([
        supabase.from("classifier_results")
          .select("proposal_id, call1_json, call2_json, gates_passed, raw_total, recommendation")
          .in("proposal_id", proposalIds),
        supabase.from("panel_overrides")
          .select("proposal_id, sub_criterion_key, original_score, override_score, created_at")
          .in("proposal_id", proposalIds)
          .order("created_at", { ascending: true }),
      ]);

      const resultMap = new Map((crRes.data as ClassifierResultRow[] || []).map((r) => [r.proposal_id, r]));

      // Build latest overrides per proposal
      const overrideMap = new Map<string, Record<string, number>>();
      for (const o of (ovRes.data || [])) {
        const map = overrideMap.get(o.proposal_id) || {};
        map[o.sub_criterion_key] = o.override_score;
        overrideMap.set(o.proposal_id, map);
      }

      // Build innovator data
      const innovators: InnovatorData[] = [];
      for (const p of proposals) {
        const cr = resultMap.get(p.id);
        if (!cr) continue;
        const overrides = overrideMap.get(p.id) || {};
        const adjustedTotal = computeAdjustedTotal(cr.call1_json, cr.call2_json, overrides);
        const band = bandForTotal(adjustedTotal);

        const dimScores: Record<string, number> = {};
        for (const dimKey of Object.keys(DIM_DEFS)) {
          dimScores[dimKey] = getDimScaled(cr.call1_json, cr.call2_json, dimKey, overrides);
        }

        // Extract pilot financials
        const pf = (cr.call1_json as Record<string, unknown>)?.pilot_financials as PilotFinancials | undefined;
        let totalCost: number | null = null;
        let costPerTeacher: number | null = null;
        if (pf && (pf.cost_til != null || pf.cost_applicant != null || pf.cost_government_inkind != null)) {
          totalCost = (pf.cost_til ?? 0) + (pf.cost_applicant ?? 0) + (pf.cost_government_inkind ?? 0);
          if (pf.total_teachers && pf.total_teachers > 0) {
            costPerTeacher = Math.round(totalCost / pf.total_teachers);
          }
        }

        innovators.push({
          proposalId: p.id,
          orgName: p.org_name || "Unknown",
          country: p.country || "Unknown",
          themes: Array.isArray(p.theme) ? p.theme : (p.theme ? [p.theme] : []),
          adjustedTotal,
          band,
          gatesPassed: cr.gates_passed ?? false,
          dimScores,
          totalCost,
          costPerTeacher,
        });
      }

      // Group by country
      const countryMap = new Map<string, InnovatorData[]>();
      for (const inv of innovators) {
        const arr = countryMap.get(inv.country) || [];
        arr.push(inv);
        countryMap.set(inv.country, arr);
      }

      // Sort innovators within each country by score desc, then sort countries alphabetically
      const newGroups: CountryGroup[] = [];
      for (const [country, invs] of countryMap.entries()) {
        invs.sort((a, b) => b.adjustedTotal - a.adjustedTotal);
        const avg = Math.round(invs.reduce((s, i) => s + i.adjustedTotal, 0) / invs.length);
        newGroups.push({ country, innovators: invs, avgScore: avg });
      }
      newGroups.sort((a, b) => a.country.localeCompare(b.country));

      setGroups(newGroups);
      setLoading(false);
    }
    loadData();
  }, [batchId]);

  const batchName = batches.find((b) => b.id === batchId)?.name || "Batch";

  function handleExport() {
    const html = generateExportHTML(groups, batchName);
    const safeName = batchName.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "-");
    downloadHTML(html, `Country-View-${safeName}.html`);
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Batch:</label>
          <select
            value={batchId || ""}
            onChange={(e) => onBatchChange(e.target.value || null)}
            className="rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-1.5 text-sm"
          >
            <option value="">Select batch...</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        {groups.length > 0 && (
          <button
            onClick={handleExport}
            className="rounded bg-gray-800 dark:bg-gray-200 dark:text-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:hover:bg-gray-300"
          >
            Export HTML
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && <p className="text-sm text-gray-400">Loading...</p>}

      {/* Empty state */}
      {!loading && batchId && groups.length === 0 && (
        <p className="text-sm text-gray-400">No scored proposals in this batch.</p>
      )}

      {/* Country cards */}
      {groups.map((g) => (
        <div key={g.country} className="mb-8">
          {/* Country header */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-5 py-3 mb-3">
            <h2 className="text-lg font-bold">{g.country}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {g.innovators.length} applicant{g.innovators.length !== 1 ? "s" : ""} · Avg score: {g.avgScore}/100
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="px-3 py-2 text-center w-10">#</th>
                  <th className="px-3 py-2 text-left">Innovator</th>
                  <th className="px-3 py-2 text-left">Theme</th>
                  {Object.keys(DIM_DEFS).map((dk) => (
                    <th key={dk} className="px-3 py-2 text-center text-xs font-semibold">{DIM_LABELS[dk]}</th>
                  ))}
                  <th className="px-3 py-2 text-center">Total</th>
                  <th className="px-3 py-2 text-center">Band</th>
                  <th className="px-3 py-2 text-center">Gates</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Pilot Cost</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">$/Teacher</th>
                </tr>
              </thead>
              <tbody>
                {g.innovators.map((inv, i) => {
                  const bc = BAND_COLOR[inv.band] || { bg: "bg-gray-100", text: "text-gray-800" };
                  return (
                    <tr key={inv.proposalId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-3 py-2 text-center text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold">{inv.orgName}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {inv.themes.map((t) => THEME_SHORT[t] || t).join(", ")}
                      </td>
                      {Object.keys(DIM_DEFS).map((dk) => {
                        const s = inv.dimScores[dk];
                        const color = s >= 16 ? "text-green-600" : s >= 12 ? "text-yellow-600" : "text-red-500";
                        return (
                          <td key={dk} className={`px-3 py-2 text-center font-semibold ${color}`}>
                            {s}/20
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-bold">{inv.adjustedTotal}/100</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bc.bg} ${bc.text}`}>
                          {inv.band}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {inv.gatesPassed
                          ? <span className="text-green-600 font-medium">Pass</span>
                          : <span className="text-red-500 font-medium">Fail</span>
                        }
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                        {inv.totalCost != null ? `$${Math.round(inv.totalCost / 1000)}K` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                        {inv.costPerTeacher != null ? `$${inv.costPerTeacher.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
