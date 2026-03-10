"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ── Dimension/sub-criterion definitions ──
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

const DIM_KEYS = Object.keys(DIM_DEFS);

const DIM_LABELS: Record<string, string> = {
  government_depth: "Government Depth",
  adoption_readiness: "Adoption Readiness",
  cost_realism: "Cost Realism",
  innovation_quality: "Innovation Quality",
  evidence_strength: "Evidence Strength",
};

const DIM_SHORT: Record<string, string> = {
  government_depth: "GovDepth",
  adoption_readiness: "Adoption",
  cost_realism: "Cost",
  innovation_quality: "Innovation",
  evidence_strength: "Evidence",
};

const SUB_LABELS: Record<string, string> = {
  named_counterparts: "Named Counterparts",
  documented_engagement: "Documented Engagement",
  institutional_home: "Institutional Home",
  government_delivery_roles: "Gov. Delivery Roles",
  transition_logic: "Transition Logic",
  capacity_shift: "Capacity Shift",
  adoption_timeline: "Adoption Timeline",
  pilot_unit_cost: "Pilot Unit Cost",
  cost_ownership_trajectory: "Cost Ownership Trajectory",
  steady_state_fiscal: "Steady-State Fiscal",
  problem_solution_fit: "Problem-Solution Fit",
  operational_clarity: "Operational Clarity",
  pilot_learning_architecture: "Pilot Learning Architecture",
  team_timeline_realism: "Team/Timeline Realism",
  decision_useful_evidence: "Decision-Useful Evidence",
  government_decision_mechanisms: "Gov. Decision Mechanisms",
  learning_outcome_evidence_chain: "Learning Outcome Chain",
};

const GATE_LABELS: Record<string, string> = {
  country_theme_fit: "Country & Theme Fit",
  scale_duration_compliance: "Scale & Duration",
  public_system_embedding: "Public System Embedding",
};

const BANDS = ["Excellent", "Good", "Weak", "Fail"] as const;
const BAND_COLORS: Record<string, string> = {
  Excellent: "bg-green-600",
  Good: "bg-blue-600",
  Weak: "bg-yellow-500",
  Fail: "bg-red-600",
};

// ── Types ──
interface ProposalRow { id: string; org_name: string; country: string; theme: string; }
interface ResultRow { proposal_id: string; call1_json: any; call2_json: any; gates_passed: boolean; raw_total: number; recommendation: string; }
interface OverrideRow { proposal_id: string; sub_criterion_key: string; original_score: number; override_score: number; created_at: string; }
interface Enriched { proposal: ProposalRow; result: ResultRow; }

// ── Helpers ──
function getSubScore(result: ResultRow, dimKey: string, subKey: string): number | null {
  const call = dimKey === "innovation_quality" || dimKey === "evidence_strength" ? "call2_json" : "call1_json";
  return result[call]?.dimensions?.[dimKey]?.[subKey]?.score ?? null;
}

function getGate(result: ResultRow, gateKey: string): { pass: boolean; score: number } | null {
  return result.call1_json?.gates?.[gateKey] ?? null;
}

function scoreColor(score: number): string {
  if (score >= 4) return "bg-green-600 text-white";
  if (score >= 3) return "bg-yellow-400 text-black";
  return "bg-red-600 text-white";
}

function barColor(score: number): string {
  if (score >= 4) return "bg-green-500";
  if (score >= 3) return "bg-yellow-400";
  return "bg-red-500";
}

function getDimScaled(result: ResultRow, dimKey: string, overrides: Record<string, Record<string, number>>): number {
  const subs = DIM_DEFS[dimKey];
  const po = overrides[result.proposal_id] || {};
  let raw = 0;
  for (const sub of subs) {
    raw += po[`${dimKey}.${sub}`] ?? getSubScore(result, dimKey, sub) ?? 0;
  }
  return Math.round((raw / DIM_MAX[dimKey]) * 20);
}

function getAdjustedTotal(result: ResultRow, overrides: Record<string, Record<string, number>>): { total: number; rec: string } {
  let total = 0;
  for (const dk of DIM_KEYS) total += getDimScaled(result, dk, overrides);
  let rec = "Fail";
  if (total >= 85) rec = "Excellent";
  else if (total >= 75) rec = "Good";
  else if (total >= 60) rec = "Weak";
  return { total, rec };
}

function bandForTotal(total: number): string {
  if (total >= 85) return "Excellent";
  if (total >= 75) return "Good";
  if (total >= 60) return "Weak";
  return "Fail";
}

function medianOf(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stdevOf(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? null : num / denom;
}

function corrColor(r: number | null): string {
  if (r === null) return "bg-gray-100 text-gray-400";
  const abs = Math.abs(r);
  if (abs >= 0.7) return r > 0 ? "bg-green-200 text-green-900" : "bg-red-200 text-red-900";
  if (abs >= 0.4) return r > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

// ── Tooltip ──
function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleEnter(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
    setShow(true);
  }

  return (
    <div className="relative w-full" onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="fixed z-50 pointer-events-none" style={{ left: pos.x, top: pos.y - 8, transform: "translate(-50%, -100%)" }}>
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs whitespace-nowrap">{content}</div>
        </div>
      )}
    </div>
  );
}

// ── Sort header helper ──
function SortHeader({ label, sortKey, currentSort, onSort }: {
  label: string; sortKey: string;
  currentSort: { key: string; dir: "asc" | "desc" };
  onSort: (key: string) => void;
}) {
  const active = currentSort.key === sortKey;
  const arrow = active ? (currentSort.dir === "desc" ? " ↓" : " ↑") : "";
  return (
    <th
      className="text-center px-2 py-2 font-medium text-gray-600 cursor-pointer hover:text-black select-none"
      onClick={() => onSort(sortKey)}
    >
      {label}{arrow}
    </th>
  );
}

// ── Main ──
export function AnalyticsDashboard() {
  const [data, setData] = useState<Enriched[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterTheme, setFilterTheme] = useState("all");
  const [aiPanelSort, setAiPanelSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "total", dir: "desc" });
  const [countrySort, setCountrySort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "country", dir: "asc" });

  useEffect(() => {
    async function load() {
      const [propRes, crRes, ovRes] = await Promise.all([
        supabase.from("proposals").select("id, org_name, country, theme").in("status", ["scored", "in_review", "finalized"]),
        supabase.from("classifier_results").select("proposal_id, call1_json, call2_json, gates_passed, raw_total, recommendation"),
        supabase.from("panel_overrides").select("proposal_id, sub_criterion_key, original_score, override_score, created_at").order("created_at", { ascending: true }),
      ]);
      const proposals = propRes.data || [];
      const results = crRes.data || [];
      setOverrides(ovRes.data || []);
      if (proposals.length === 0) { setLoading(false); return; }
      const rm = new Map(results.map((r) => [r.proposal_id, r]));
      setData(proposals.filter((p) => rm.has(p.id)).map((p) => ({ proposal: p, result: rm.get(p.id)! })));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Loading analytics...</div>;
  if (data.length === 0) return <div className="text-sm text-gray-400 py-12 text-center">No scored proposals found.</div>;

  // ── Filters ──
  const countries = [...new Set(data.map((d) => d.proposal.country))].sort();
  const themes = [...new Set(data.map((d) => d.proposal.theme))].sort();
  const filtered = data.filter((d) => {
    if (filterCountry !== "all" && d.proposal.country !== filterCountry) return false;
    if (filterTheme !== "all" && d.proposal.theme !== filterTheme) return false;
    return true;
  });

  // ── Latest override lookup ──
  const latestOverrides: Record<string, Record<string, number>> = {};
  for (const o of overrides) {
    if (!latestOverrides[o.proposal_id]) latestOverrides[o.proposal_id] = {};
    latestOverrides[o.proposal_id][o.sub_criterion_key] = o.override_score;
  }
  const nameMap = new Map(data.map((d) => [d.proposal.id, d.proposal.org_name]));

  // ── Band distribution ──
  const bandCounts: Record<string, number> = { Excellent: 0, Good: 0, Weak: 0, Fail: 0 };
  const bandMembers: Record<string, string[]> = { Excellent: [], Good: [], Weak: [], Fail: [] };
  filtered.forEach((d) => {
    const b = d.result.recommendation;
    if (b in bandCounts) { bandCounts[b]++; bandMembers[b].push(d.proposal.org_name); }
  });

  // ── Gates ──
  const gateKeys = ["country_theme_fit", "scale_duration_compliance", "public_system_embedding"];
  const gateCounts: Record<string, { pass: number; fail: number }> = {};
  gateKeys.forEach((gk) => {
    gateCounts[gk] = { pass: 0, fail: 0 };
    filtered.forEach((d) => {
      const g = getGate(d.result, gk);
      if (g) { if (g.pass) gateCounts[gk].pass++; else gateCounts[gk].fail++; }
    });
  });

  // ── Sub-criterion stats ──
  const subStats: { dimKey: string; subKey: string; avg: number; min: number; max: number; med: number; sd: number; count: number }[] = [];
  Object.entries(DIM_DEFS).forEach(([dimKey, subs]) => {
    subs.forEach((subKey) => {
      const scores: number[] = [];
      filtered.forEach((d) => { const s = getSubScore(d.result, dimKey, subKey); if (s !== null) scores.push(s); });
      subStats.push({
        dimKey, subKey,
        avg: scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0,
        min: scores.length > 0 ? Math.min(...scores) : 0,
        max: scores.length > 0 ? Math.max(...scores) : 0,
        med: medianOf(scores), sd: stdevOf(scores), count: scores.length,
      });
    });
  });

  // ── Override frequency ──
  const filteredIds = new Set(filtered.map((d) => d.proposal.id));
  const overridesByKey: Record<string, { orgName: string; original: number; override: number }[]> = {};
  for (const o of overrides) {
    if (!filteredIds.has(o.proposal_id)) continue;
    if (!overridesByKey[o.sub_criterion_key]) overridesByKey[o.sub_criterion_key] = [];
    overridesByKey[o.sub_criterion_key].push({ orgName: nameMap.get(o.proposal_id) || "Unknown", original: o.original_score, override: o.override_score });
  }
  const overrideFreqSorted = Object.entries(overridesByKey).sort((a, b) => b[1].length - a[1].length);
  const maxOverrideCount = overrideFreqSorted.length > 0 ? overrideFreqSorted[0][1].length : 1;

  // ── Band movement ──
  const bandMovements: { name: string; aiBand: string; adjBand: string; aiTotal: number; adjTotal: number }[] = [];
  for (const d of filtered) {
    const aiTotal = DIM_KEYS.reduce((s, dk) => s + getDimScaled(d.result, dk, {}), 0);
    const adjTotal = getAdjustedTotal(d.result, latestOverrides).total;
    const aiBand = bandForTotal(aiTotal);
    const adjBand = bandForTotal(adjTotal);
    if (aiBand !== adjBand) {
      bandMovements.push({ name: d.proposal.org_name, aiBand, adjBand, aiTotal, adjTotal });
    }
  }

  // ── Correlation matrix ──
  const dimScoreArrays: Record<string, number[]> = {};
  for (const dk of DIM_KEYS) {
    dimScoreArrays[dk] = filtered.map((d) => getDimScaled(d.result, dk, latestOverrides));
  }

  // ── Country patterns ──
  const countryGroups: Record<string, Enriched[]> = {};
  for (const d of filtered) { const c = d.proposal.country; if (!countryGroups[c]) countryGroups[c] = []; countryGroups[c].push(d); }
  const countryPatterns: { country: string; count: number; dims: Record<string, number> }[] = [];
  for (const [country, items] of Object.entries(countryGroups)) {
    const dims: Record<string, number> = {};
    for (const dk of DIM_KEYS) {
      let t = 0; for (const d of items) t += getDimScaled(d.result, dk, latestOverrides);
      dims[dk] = Math.round((t / items.length) * 10) / 10;
    }
    countryPatterns.push({ country, count: items.length, dims });
  }

  // ── Sort helpers ──
  function toggleSort(current: { key: string; dir: "asc" | "desc" }, key: string, setter: (v: { key: string; dir: "asc" | "desc" }) => void) {
    if (current.key === key) setter({ key, dir: current.dir === "desc" ? "asc" : "desc" });
    else setter({ key, dir: "desc" });
  }

  function sortedAiPanel() {
    const arr = [...filtered];
    const { key, dir } = aiPanelSort;
    arr.sort((a, b) => {
      let va: number, vb: number;
      if (key === "total") {
        va = getAdjustedTotal(a.result, latestOverrides).total;
        vb = getAdjustedTotal(b.result, latestOverrides).total;
      } else {
        va = getDimScaled(a.result, key, latestOverrides);
        vb = getDimScaled(b.result, key, latestOverrides);
      }
      return dir === "desc" ? vb - va : va - vb;
    });
    return arr;
  }

  function sortedCountry() {
    const arr = [...countryPatterns];
    const { key, dir } = countrySort;
    arr.sort((a, b) => {
      if (key === "country") return dir === "asc" ? a.country.localeCompare(b.country) : b.country.localeCompare(a.country);
      if (key === "n") return dir === "desc" ? b.count - a.count : a.count - b.count;
      const va = a.dims[key] ?? 0, vb = b.dims[key] ?? 0;
      return dir === "desc" ? vb - va : va - vb;
    });
    return arr;
  }

  const maxBar = Math.max(filtered.length, 1);

  return (
    <div className="space-y-10">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium">Filters:</div>
        <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1">
          <option value="all">All countries ({data.length})</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterTheme} onChange={(e) => setFilterTheme(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1">
          <option value="all">All themes</option>
          {themes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="text-xs text-gray-400">{filtered.length} proposal{filtered.length !== 1 ? "s" : ""}</div>
      </div>

      {/* 1. Score Distribution */}
      <section>
        <h2 className="text-sm font-bold mb-3">Score Distribution</h2>
        <div className="border border-gray-200 rounded p-4 max-w-md">
          <div className="space-y-2">
            {BANDS.map((band) => (
              <Tooltip key={band} content={bandMembers[band].length > 0 ? <div>{bandMembers[band].map((n, i) => <div key={i}>{n}</div>)}</div> : <div>No proposals</div>}>
                <div className="flex items-center gap-2 cursor-default">
                  <div className="text-xs w-20">{band}</div>
                  <div className="flex-1 bg-gray-100 rounded h-5 relative">
                    <div className={`h-5 rounded ${BAND_COLORS[band]}`} style={{ width: `${(bandCounts[band] / maxBar) * 100}%` }} />
                  </div>
                  <div className="text-xs font-medium w-6 text-right">{bandCounts[band]}</div>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Gate Pass/Fail */}
      <section>
        <h2 className="text-sm font-bold mb-3">Gate Pass/Fail Rates</h2>
        <div className="border border-gray-200 rounded p-4">
          <div className="space-y-3">
            {gateKeys.map((gk) => {
              const { pass, fail } = gateCounts[gk];
              const total = pass + fail;
              const pct = total > 0 ? (pass / total) * 100 : 0;
              return (
                <div key={gk} className="flex items-center gap-3">
                  <div className="text-xs w-44">{GATE_LABELS[gk]}</div>
                  <div className="flex-1 bg-gray-100 rounded h-5 relative overflow-hidden">
                    <div className="h-5 bg-green-600 rounded-l" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs w-20 text-right">
                    <span className="text-green-700">{pass}</span>
                    {fail > 0 && <span className="text-red-600 ml-1">{fail}F</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Sub-Criterion Heat Map */}
      <section>
        <h2 className="text-sm font-bold mb-3">Sub-Criterion Heat Map (portfolio averages)</h2>
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 font-medium text-gray-600">Dimension</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Sub-criterion</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 w-16">Avg</th>
                <th className="px-3 py-2 w-48"></th>
              </tr>
            </thead>
            <tbody>
              {subStats.map(({ dimKey, subKey, avg, min, max, med, sd }, i) => {
                const isFirst = i === 0 || subStats[i - 1].dimKey !== dimKey;
                const span = DIM_DEFS[dimKey].length;
                return (
                  <tr key={`${dimKey}.${subKey}`} className="border-t border-gray-100">
                    {isFirst && <td className="px-3 py-2 font-medium text-gray-700 align-top" rowSpan={span}>{DIM_LABELS[dimKey]}</td>}
                    <td className="px-3 py-2 text-gray-600">{SUB_LABELS[subKey] || subKey}</td>
                    <td className="px-3 py-2 text-center">
                      <Tooltip content={<div>Min {min} · Med {med.toFixed(1)} · Max {max} · SD {sd.toFixed(1)}</div>}>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium cursor-default ${scoreColor(avg)}`}>{avg.toFixed(1)}</span>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2">
                      <div className="bg-gray-100 rounded h-3 w-full">
                        <div className={`h-3 rounded ${barColor(avg)}`} style={{ width: `${(avg / 5) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 mt-2">Hover on average for min/max/median/SD. Based on {filtered.length} proposal{filtered.length !== 1 ? "s" : ""}.</div>
      </section>

      {/* 4. Override Frequency */}
      <section>
        <h2 className="text-sm font-bold mb-3">Override Frequency by Sub-Criterion</h2>
        {overrideFreqSorted.length === 0 ? (
          <div className="border border-gray-200 rounded p-4 text-xs text-gray-400">No overrides recorded yet.</div>
        ) : (
          <div className="border border-gray-200 rounded p-4">
            <div className="text-xs text-gray-500 mb-3">Sub-criteria most frequently overridden by the panel</div>
            <div className="space-y-2">
              {overrideFreqSorted.map(([key, items]) => {
                const parts = key.split(".");
                return (
                  <Tooltip key={key} content={<div className="space-y-1">{items.map((it, i) => <div key={i}>{it.orgName}: {it.original} → {it.override}</div>)}</div>}>
                    <div className="flex items-center gap-2 cursor-default">
                      <div className="text-xs w-72"><span className="text-gray-400">{DIM_LABELS[parts[0]] || parts[0]} ›</span> {SUB_LABELS[parts[1]] || parts[1]}</div>
                      <div className="flex-1 bg-gray-100 rounded h-4">
                        <div className="h-4 rounded bg-purple-500" style={{ width: `${(items.length / maxOverrideCount) * 100}%` }} />
                      </div>
                      <div className="text-xs font-medium w-6 text-right">{items.length}</div>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 5. Band Movement Tracker */}
      <section>
        <h2 className="text-sm font-bold mb-3">Band Movements (AI → Panel-Adjusted)</h2>
        {bandMovements.length === 0 ? (
          <div className="border border-gray-200 rounded p-4 text-xs text-gray-400">No band changes from panel overrides.</div>
        ) : (
          <div className="border border-gray-200 rounded p-4">
            <div className="space-y-2">
              {bandMovements.map((bm, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className="w-48 font-medium text-gray-700">{bm.name}</div>
                  <span className={`px-2 py-0.5 rounded font-medium ${BAND_COLORS[bm.aiBand]} text-white`}>{bm.aiBand} ({bm.aiTotal})</span>
                  <span className="text-gray-400">→</span>
                  <span className={`px-2 py-0.5 rounded font-medium ${BAND_COLORS[bm.adjBand]} text-white`}>{bm.adjBand} ({bm.adjTotal})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 6. AI vs Panel-Adjusted Scores */}
      <section>
        <h2 className="text-sm font-bold mb-3">AI vs. Panel-Adjusted Scores</h2>
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:text-black select-none" onClick={() => toggleSort(aiPanelSort, "name", setAiPanelSort)}>
                  Proposal{aiPanelSort.key === "name" ? (aiPanelSort.dir === "desc" ? " ↓" : " ↑") : ""}
                </th>
                {DIM_KEYS.map((dk) => (
                  <SortHeader key={dk} label={DIM_LABELS[dk]} sortKey={dk} currentSort={aiPanelSort} onSort={(k) => toggleSort(aiPanelSort, k, setAiPanelSort)} />
                ))}
                <SortHeader label="Total" sortKey="total" currentSort={aiPanelSort} onSort={(k) => toggleSort(aiPanelSort, k, setAiPanelSort)} />
              </tr>
            </thead>
            <tbody>
              {sortedAiPanel().map((d) => {
                const aiTotal = DIM_KEYS.reduce((s, dk) => s + getDimScaled(d.result, dk, {}), 0);
                const adj = getAdjustedTotal(d.result, latestOverrides);
                const totalDiff = adj.total - aiTotal;
                return (
                  <tr key={d.proposal.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-700">{d.proposal.org_name}</td>
                    {DIM_KEYS.map((dk) => {
                      const ai = getDimScaled(d.result, dk, {});
                      const adjusted = getDimScaled(d.result, dk, latestOverrides);
                      const diff = adjusted - ai;
                      return (
                        <td key={dk} className="text-center px-2 py-2 tabular-nums">
                          {ai}{diff !== 0 && <span className={`ml-1 font-bold ${diff > 0 ? "text-green-600" : "text-red-600"}`}>→ {adjusted}</span>}
                        </td>
                      );
                    })}
                    <td className="text-center px-2 py-2 tabular-nums font-bold">
                      {aiTotal}{totalDiff !== 0 && <span className={`ml-1 font-bold ${totalDiff > 0 ? "text-green-600" : "text-red-600"}`}>→ {adj.total}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-400 mt-2">Click column headers to sort. Arrows show panel-adjusted scores. All dimension scores /20.</div>
      </section>

      {/* 7. Dimension Correlation Matrix */}
      <section>
        <h2 className="text-sm font-bold mb-3">Dimension Correlation Matrix</h2>
        {filtered.length < 3 ? (
          <div className="border border-gray-200 rounded p-4 text-xs text-gray-400">Requires at least 3 proposals for meaningful correlations.</div>
        ) : (
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600"></th>
                  {DIM_KEYS.map((dk) => <th key={dk} className="text-center px-2 py-2 font-medium text-gray-600">{DIM_SHORT[dk]}</th>)}
                </tr>
              </thead>
              <tbody>
                {DIM_KEYS.map((rowKey) => (
                  <tr key={rowKey} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-700">{DIM_SHORT[rowKey]}</td>
                    {DIM_KEYS.map((colKey) => {
                      if (rowKey === colKey) return <td key={colKey} className="text-center px-2 py-2 bg-gray-50 text-gray-300">1.00</td>;
                      const r = pearson(dimScoreArrays[rowKey], dimScoreArrays[colKey]);
                      return (
                        <td key={colKey} className="text-center px-2 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded font-medium ${corrColor(r)}`}>
                            {r !== null ? r.toFixed(2) : "n/a"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="text-xs text-gray-400 mt-2">Pearson correlation of panel-adjusted dimension scores. Green = positive, red = negative.</div>
      </section>

      {/* 8. Country-Level Patterns */}
      <section>
        <h2 className="text-sm font-bold mb-3">Country-Level Patterns</h2>
        {countryPatterns.length <= 1 ? (
          <div className="border border-gray-200 rounded p-4 text-xs text-gray-400">
            Cross-country comparison requires proposals from multiple countries.
          </div>
        ) : (
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-600 cursor-pointer hover:text-black select-none" onClick={() => toggleSort(countrySort, "country", setCountrySort)}>
                    Country{countrySort.key === "country" ? (countrySort.dir === "asc" ? " ↑" : " ↓") : ""}
                  </th>
                  <th className="text-center px-2 py-2 font-medium text-gray-600 cursor-pointer hover:text-black select-none" onClick={() => toggleSort(countrySort, "n", setCountrySort)}>
                    n{countrySort.key === "n" ? (countrySort.dir === "desc" ? " ↓" : " ↑") : ""}
                  </th>
                  {DIM_KEYS.map((dk) => (
                    <SortHeader key={dk} label={DIM_LABELS[dk]} sortKey={dk} currentSort={countrySort} onSort={(k) => toggleSort(countrySort, k, setCountrySort)} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCountry().map(({ country, count, dims }) => (
                  <tr key={country} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-700">{country}</td>
                    <td className="text-center px-2 py-2 text-gray-500">{count}</td>
                    {DIM_KEYS.map((dk) => {
                      const v = dims[dk];
                      return (
                        <td key={dk} className="text-center px-2 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded font-medium ${v >= 16 ? "bg-green-100 text-green-700" : v >= 12 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{v}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}