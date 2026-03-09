"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// --- Rubric structure ---

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

const SCORE_BG: Record<number, string> = {
  1: "bg-red-500", 2: "bg-orange-400", 3: "bg-yellow-400", 4: "bg-green-500", 5: "bg-emerald-500",
};

const SCORE_TEXT: Record<number, string> = {
  1: "text-white", 2: "text-white", 3: "text-black", 4: "text-white", 5: "text-white",
};

const BAND_STYLE: Record<string, string> = {
  Excellent: "bg-green-600 text-white",
  Good: "bg-lime-600 text-white",
  Weak: "bg-amber-500 text-white",
  Fail: "bg-red-600 text-white",
};

// --- Scoring math ---

function getDimScaled(dimData: any, dimKey: string, latestOverrides: Record<string, number>): number {
  if (!dimData) return 0;
  const raw = DIM_DEFS[dimKey].reduce((sum, sub) => {
    const key = `${dimKey}.${sub}`;
    const score = latestOverrides[key] ?? dimData[sub]?.score ?? 0;
    return sum + score;
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

// --- Types ---

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
  const [editScore, setEditScore] = useState<string>("");
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

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Loading score card...</div>;
  if (!proposal || !call1) return <div className="text-sm text-red-500">No data found.</div>;

  const isLocked = proposal.status === "finalized";
  const gates = call1.gates || {};
  const allGatesPassed = call1.all_gates_passed !== false;
  const consistencyNotes: string[] = call2?.consistency_notes || [];
  const recommendation: string = call2?.recommendation || "";
  const summary: string = call2?.summary || "";

  const latestOverrides: Record<string, number> = {};
  for (const o of overrideHistory) { latestOverrides[o.sub_criterion_key] = o.override_score; }

  const totals = computeTotals(call1, call2, latestOverrides);
  const bandClass = BAND_STYLE[totals.rec] || "bg-gray-500 text-white";

  function getSubData(dimKey: string, subKey: string): any {
    const source = dimKey === "innovation_quality" || dimKey === "evidence_strength" ? call2?.dimensions : call1?.dimensions;
    return source?.[dimKey]?.[subKey] || null;
  }

  function getHistoryForSub(key: string): OverrideRecord[] {
    return overrideHistory.filter((o) => o.sub_criterion_key === key);
  }

  function startEdit(subKey: string) {
    if (isLocked) return;
    if (!panelistId) { alert("Select your name at the top of the page before making overrides."); return; }
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
    if (inserted) { setOverrideHistory((prev) => [...prev, { ...inserted, panelist_name: panelistName || "You" }]); }
    setEditingSub(null);
    setEditScore("");
    setEditRationale("");
    setSaving(false);
  }

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-black mb-5 block">← Back to portfolio</button>

      {/* Header card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold leading-tight">{proposal.org_name}</h2>
            <div className="text-sm text-gray-500 mt-1">{proposal.country} · {proposal.theme}</div>
            {isLocked && (
              <div className="mt-2 inline-block text-xs font-semibold bg-gray-200 text-gray-600 rounded px-2 py-0.5">
                🔒 Locked
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-4xl font-black tabular-nums leading-none">{totals.total}</div>
              <div className="text-xs text-gray-400 mt-1">/100</div>
            </div>
            <span className={`px-4 py-2 rounded-lg text-sm font-bold ${bandClass}`}>{totals.rec}</span>
          </div>
        </div>

        {/* Dimension bar */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
          {Object.entries(DIM_LABELS).map(([dimKey, label]) => {
            const s = totals.dims[dimKey] ?? 0;
            return (
              <div key={dimKey} className="flex-1 text-center">
                <div className={`text-lg font-bold tabular-nums ${s >= 16 ? "text-green-600" : s >= 12 ? "text-yellow-600" : "text-red-500"}`}>{s}</div>
                <div className="text-xs text-gray-400 leading-tight mt-0.5">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Recommendation + Consistency Notes */}
      <div className="grid grid-cols-1 gap-3 mb-5">
        {(recommendation || summary) && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">AI Recommendation</h3>
            <div className="text-sm text-gray-700 leading-relaxed">{recommendation || summary}</div>
          </div>
        )}
        {consistencyNotes.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Consistency Notes</h3>
            <div className="space-y-1.5">
              {consistencyNotes.map((note, i) => (
                <div key={i} className="text-xs text-gray-600 leading-relaxed">{note}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gates */}
      <div className="mb-5">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Hard Gates</h3>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(GATE_LABELS).map(([gateKey, gateLabel]) => {
            const gate = gates[gateKey];
            if (!gate) return null;
            const passed = gate.pass !== false && gate.score >= 3;
            const isExpanded = expandedGate === gateKey;
            return (
              <div key={gateKey} className="rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedGate(isExpanded ? null : gateKey)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium ${
                    passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  } hover:opacity-80 transition-opacity`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${SCORE_BG[gate.score]} ${SCORE_TEXT[gate.score]}`}>
                    {gate.score}
                  </span>
                  <span className="flex-1 text-left">{gateLabel}</span>
                  <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                </button>
                {isExpanded && (
                  <div className="px-3 py-2.5 bg-white space-y-1.5 border-t border-gray-100">
                    {gate.extract && (
                      <div className="text-xs"><span className="font-semibold text-gray-600">Evidence: </span><span className="italic text-gray-500">"{gate.extract}"</span></div>
                    )}
                    {gate.interpretation && (
                      <div className="text-xs"><span className="font-semibold text-gray-600">Interpretation: </span><span className="text-gray-500">{gate.interpretation}</span></div>
                    )}
                    {gate.rubric_anchor && (
                      <div className="text-xs bg-gray-50 rounded px-2 py-1.5 mt-1">
                        <span className="font-semibold text-gray-600">Rubric ({gate.score}): </span><span className="text-gray-500">{gate.rubric_anchor}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!allGatesPassed && (
          <div className="mt-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            GATE FAILURE — dimension scores are advisory only.
          </div>
        )}
      </div>

      {/* Score table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden mb-5">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2.5 pl-3 w-8"></th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider py-2.5">Sub-criterion</th>
              <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider py-2.5 w-20">{isLocked ? "" : "Edit"}</th>
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
                const isExpanded = expandedSub === overrideKey;
                const isFirstInDim = i === 0;
                const isLastInDim = i === subs.length - 1;
                const hasBorderline = data?.borderline && typeof data.borderline === "string";
                const hasPanelVerify = data?.panel_verify && typeof data.panel_verify === "string";
                const history = getHistoryForSub(overrideKey);
                const isEditing = editingSub === overrideKey;

                return (
                  <tr key={overrideKey}>
                    <td colSpan={3} className="p-0">
                      {isFirstInDim && (
                        <div className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 border-t border-gray-200 flex justify-between items-center">
                          <span>{DIM_LABELS[dimKey]}</span>
                          <span className={`text-sm tabular-nums font-bold ${dimScore >= 16 ? "text-green-600" : dimScore >= 12 ? "text-yellow-600" : "text-red-500"}`}>
                            {dimScore}<span className="text-xs text-gray-400 font-normal">/20</span>
                          </span>
                        </div>
                      )}
                      <div
                        className={`flex items-center px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${isLastInDim && !isExpanded ? "border-b border-gray-100" : ""}`}
                        onClick={() => setExpandedSub(isExpanded ? null : overrideKey)}
                      >
                        <div className="w-8 flex-shrink-0">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${SCORE_BG[currentScore]} ${SCORE_TEXT[currentScore]} ${hasOverride ? "ring-2 ring-purple-400" : ""}`}>
                            {currentScore}
                          </span>
                        </div>
                        <div className="flex-1 text-xs text-gray-700 flex items-center gap-1.5 pl-1">
                          {SUB_LABELS[subKey] || subKey}
                          {hasBorderline && <span className="bg-amber-100 text-amber-700 rounded px-1 py-0.5 text-xs font-bold leading-none">B</span>}
                          {hasPanelVerify && <span className="bg-purple-100 text-purple-700 rounded px-1 py-0.5 text-xs font-bold leading-none">P</span>}
                          {hasOverride && <span className="text-gray-400 line-through ml-1">{aiScore}</span>}
                          {history.length > 0 && (
                            <span className="text-purple-400 text-xs">({history.length})</span>
                          )}
                        </div>
                        <div className="w-20 text-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {!isLocked && (
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(overrideKey); }}
                              className="text-xs text-gray-400 hover:text-black hover:bg-gray-100 rounded px-2.5 py-1 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && data && (
                        <div className={`bg-slate-50 border-l-4 border-blue-400 px-4 py-3 space-y-2.5 ${isLastInDim ? "border-b border-gray-100" : ""}`}>
                          {data.extract && (
                            <div className="text-xs leading-relaxed"><span className="font-semibold text-gray-600">Evidence: </span><span className="italic text-gray-500">"{data.extract}"</span></div>
                          )}
                          {data.interpretation && (
                            <div className="text-xs leading-relaxed"><span className="font-semibold text-gray-600">Interpretation: </span><span className="text-gray-500">{data.interpretation}</span></div>
                          )}
                          {data.rubric_anchor && (
                            <div className="rounded bg-white border border-gray-200 px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[aiScore]} ${SCORE_TEXT[aiScore]}`}>{aiScore}</span>
                                <span className="text-xs font-semibold text-gray-600">Awarded rubric level</span>
                              </div>
                              <div className="text-xs text-gray-500 leading-relaxed ml-7">{data.rubric_anchor}</div>
                            </div>
                          )}
                          {hasBorderline && (
                            <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-2">
                              <div className="text-xs font-semibold text-amber-700">Borderline: {data.borderline}</div>
                              {data.borderline_rubric_low && (
                                <div className="rounded bg-white border border-amber-100 px-3 py-1.5">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[aiScore]} ${SCORE_TEXT[aiScore]}`}>{aiScore}</span>
                                    <span className="text-xs font-semibold text-gray-600">Lower level (awarded)</span>
                                  </div>
                                  <div className="text-xs text-gray-500 ml-7">{data.borderline_rubric_low}</div>
                                </div>
                              )}
                              {data.borderline_rubric_high && (
                                <div className="rounded bg-white border border-amber-100 px-3 py-1.5">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[Math.min(aiScore + 1, 5)]} ${SCORE_TEXT[Math.min(aiScore + 1, 5)]}`}>{aiScore + 1}</span>
                                    <span className="text-xs font-semibold text-gray-600">Higher level (not awarded)</span>
                                  </div>
                                  <div className="text-xs text-gray-500 ml-7">{data.borderline_rubric_high}</div>
                                </div>
                              )}
                            </div>
                          )}
                          {hasPanelVerify && (
                            <div className="text-xs rounded bg-purple-50 border border-purple-200 px-3 py-2">
                              <span className="font-semibold text-purple-700">Panel verify: </span>{data.panel_verify}
                            </div>
                          )}

                          {/* Override history */}
                          {history.length > 0 && (
                            <div className="pt-2 border-t border-gray-200">
                              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Override history</div>
                              <div className="space-y-1">
                                {history.map((h) => (
                                  <div key={h.id} className="text-xs bg-white border border-gray-200 rounded px-3 py-2 flex items-start gap-2">
                                    <span className="flex-shrink-0 flex items-center gap-0.5">
                                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[h.original_score]} ${SCORE_TEXT[h.original_score]}`}>{h.original_score}</span>
                                      <span className="text-gray-300">→</span>
                                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[h.override_score]} ${SCORE_TEXT[h.override_score]}`}>{h.override_score}</span>
                                    </span>
                                    <span className="flex-1 text-gray-600 leading-relaxed">
                                      <span className="font-semibold text-gray-800">{h.panelist_name}</span>: {h.rationale}
                                      <span className="text-gray-400 ml-1.5">
                                        {new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Edit form */}
                          {isEditing && !isLocked && (
                            <div className="pt-2 border-t border-gray-200">
                              <div className="bg-white rounded-lg border border-blue-300 px-4 py-3 shadow-sm">
                                <div className="text-xs font-semibold text-gray-700 mb-2.5">Override score</div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-xs text-gray-500">Score:</span>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((v) => (
                                      <button
                                        key={v}
                                        onClick={() => setEditScore(String(v))}
                                        className={`w-8 h-8 rounded text-xs font-bold transition-all ${
                                          editScore === String(v)
                                            ? `${SCORE_BG[v]} ${SCORE_TEXT[v]} ring-2 ring-blue-400 scale-110`
                                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                        }`}
                                      >
                                        {v}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <textarea
                                  placeholder="Rationale (required)"
                                  value={editRationale}
                                  onChange={(e) => setEditRationale(e.target.value)}
                                  rows={2}
                                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent mb-3"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => submitOverride(dimKey, subKey)}
                                    disabled={saving || !editScore || !editRationale.trim()}
                                    className="text-xs bg-black text-white rounded-lg px-4 py-1.5 font-medium hover:bg-gray-800 disabled:opacity-30 transition-opacity"
                                  >
                                    {saving ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    onClick={() => { setEditingSub(null); setEditScore(""); setEditRationale(""); }}
                                    className="text-xs text-gray-400 hover:text-black px-3 py-1.5"
                                  >
                                    Cancel
                                  </button>
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