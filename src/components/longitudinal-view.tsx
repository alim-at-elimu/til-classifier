"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { RUBRIC } from "@/lib/classifier-engine";

// ── Constants ──
const DIM_DEFS: Record<string, string[]> = {
  government_depth: ["named_counterparts", "documented_engagement", "institutional_home", "government_delivery_roles"],
  adoption_readiness: ["transition_logic", "capacity_shift", "adoption_timeline"],
  cost_realism: ["pilot_unit_cost", "cost_ownership_trajectory", "steady_state_fiscal"],
  innovation_quality: ["problem_solution_fit", "operational_clarity", "pilot_learning_architecture", "team_timeline_realism"],
  evidence_strength: ["decision_useful_evidence", "government_decision_mechanisms", "learning_outcome_evidence_chain"],
};

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
  country_theme_fit: "Country & Theme Fit", scale_duration_compliance: "Scale & Duration Compliance", public_system_embedding: "Public System Embedding",
};

const SCORE_BG: Record<number, string> = { 1: "bg-red-500", 2: "bg-orange-400", 3: "bg-yellow-400", 4: "bg-green-500", 5: "bg-emerald-500" };
const SCORE_TEXT: Record<number, string> = { 1: "text-white", 2: "text-white", 3: "text-black", 4: "text-white", 5: "text-white" };

// ── Types ──
interface BatchOption { id: string; name: string; created_at: string; }

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

interface InnovatorRow {
  proposalId: string;
  orgName: string;
  country: string;
  theme: string[];
  status: string;
  aiScore: number;
  extract: string;
  interpretation: string;
  rubricAnchor: string;
  borderline: string | null;
  borderlineLow: string | null;
  borderlineHigh: string | null;
  panelVerify: string | null;
  overrides: OverrideRecord[];
}

type SortKey = "score" | "org" | "country";

interface LongitudinalViewProps {
  panelistId: string | null;
  panelistName: string | null;
  batchId: string | null;
  onBatchChange: (batchId: string | null) => void;
}

// ── Rubric lookup ──
function getRubricAnchors(key: string): { name: string; source: string; anchors: Record<number, { label: string; text: string }> } | null {
  // Check gates first
  const gate = RUBRIC.gates.find((g: any) => g.id === key);
  if (gate) return { name: gate.name, source: gate.source, anchors: gate.anchors as any };

  // Check dimensions
  const [dimKey, subKey] = key.split(".");
  const dim = RUBRIC.dimensions.find((d: any) => d.id === dimKey);
  if (!dim) return null;
  const sub = dim.sub.find((s: any) => s.id === subKey);
  if (!sub) return null;
  return { name: sub.name, source: sub.source, anchors: sub.anchors as any };
}

// Build dropdown options
function buildSubCriterionOptions(): { group: string; key: string; label: string }[] {
  const opts: { group: string; key: string; label: string }[] = [];

  // Gates
  for (const gateKey of Object.keys(GATE_LABELS)) {
    opts.push({ group: "Hard Gates", key: gateKey, label: GATE_LABELS[gateKey] });
  }

  // Dimensions
  for (const [dimKey, subs] of Object.entries(DIM_DEFS)) {
    for (const subKey of subs) {
      opts.push({ group: DIM_LABELS[dimKey], key: `${dimKey}.${subKey}`, label: SUB_LABELS[subKey] || subKey });
    }
  }

  return opts;
}

const SUB_OPTIONS = buildSubCriterionOptions();

export function LongitudinalView({ panelistId, panelistName, batchId, onBatchChange }: LongitudinalViewProps) {
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [rows, setRows] = useState<InnovatorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [rubricCollapsed, setRubricCollapsed] = useState(false);

  // Edit state
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState("");
  const [editRationale, setEditRationale] = useState("");
  const [saving, setSaving] = useState(false);

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
  }, []);

  // Load data when batch or sub-criterion changes
  useEffect(() => {
    if (batchId && selectedSub) loadData();
    else setRows([]);
  }, [batchId, selectedSub]);

  async function loadData() {
    if (!batchId || !selectedSub) return;
    setLoading(true);

    // Fetch proposals for this batch
    const { data: proposals } = await supabase
      .from("proposals")
      .select("id, org_name, country, theme, status")
      .eq("batch_id", batchId)
      .in("status", ["scored", "in_review", "finalized"]);

    if (!proposals || proposals.length === 0) { setRows([]); setLoading(false); return; }

    const proposalIds = proposals.map((p) => p.id);

    // Fetch results and overrides in parallel
    const [crRes, ovRes] = await Promise.all([
      supabase.from("classifier_results").select("proposal_id, call1_json, call2_json").in("proposal_id", proposalIds),
      supabase.from("panel_overrides")
        .select("id, proposal_id, panelist_id, sub_criterion_key, original_score, override_score, rationale, created_at, panelists(name)")
        .in("proposal_id", proposalIds)
        .eq("sub_criterion_key", selectedSub)
        .order("created_at", { ascending: true }),
    ]);

    const resultMap = new Map((crRes.data || []).map((r: any) => [r.proposal_id, r]));
    const overrideMap = new Map<string, OverrideRecord[]>();
    for (const o of (ovRes.data || [])) {
      const arr = overrideMap.get(o.proposal_id) || [];
      arr.push({ ...o, panelist_name: (o as any).panelists?.name || "Unknown" } as OverrideRecord);
      overrideMap.set(o.proposal_id, arr);
    }

    // Extract sub-criterion data for each innovator
    const isGate = !selectedSub.includes(".");
    const newRows: InnovatorRow[] = [];

    for (const p of proposals) {
      const cr = resultMap.get(p.id);
      if (!cr) continue;

      let subData: any = null;

      if (isGate) {
        subData = cr.call1_json?.gates?.[selectedSub] || null;
      } else {
        const [dimKey, subKey] = selectedSub.split(".");
        const src = (dimKey === "innovation_quality" || dimKey === "evidence_strength")
          ? cr.call2_json?.dimensions
          : cr.call1_json?.dimensions;
        subData = src?.[dimKey]?.[subKey] || null;
      }

      newRows.push({
        proposalId: p.id,
        orgName: p.org_name || "Unknown",
        country: p.country || "",
        theme: Array.isArray(p.theme) ? p.theme : (p.theme ? [p.theme] : []),
        status: p.status,
        aiScore: subData?.score ?? 0,
        extract: subData?.extract || "",
        interpretation: subData?.interpretation || "",
        rubricAnchor: subData?.rubric_anchor || "",
        borderline: subData?.borderline || null,
        borderlineLow: subData?.borderline_rubric_low || null,
        borderlineHigh: subData?.borderline_rubric_high || null,
        panelVerify: subData?.panel_verify || null,
        overrides: overrideMap.get(p.id) || [],
      });
    }

    setRows(newRows);
    setLoading(false);
  }

  // Sort
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "score": {
        const aEff = a.overrides.length > 0 ? a.overrides[a.overrides.length - 1].override_score : a.aiScore;
        const bEff = b.overrides.length > 0 ? b.overrides[b.overrides.length - 1].override_score : b.aiScore;
        cmp = aEff - bEff; break;
      }
      case "org": cmp = a.orgName.localeCompare(b.orgName); break;
      case "country": cmp = a.country.localeCompare(b.country); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "org" || key === "country"); }
  }

  // Override submission
  function startEdit(proposalId: string) {
    if (!panelistId) { alert("Select your name first."); return; }
    setEditingProposalId(proposalId);
    setEditScore("");
    setEditRationale("");
  }

  async function submitOverride(row: InnovatorRow) {
    if (!selectedSub || !panelistId) return;
    const scoreVal = parseInt(editScore, 10);
    if (!scoreVal || scoreVal < 1 || scoreVal > 5) { alert("Select a score."); return; }
    if (!editRationale.trim()) { alert("Rationale is required."); return; }

    setSaving(true);
    const { data: inserted, error } = await supabase
      .from("panel_overrides")
      .insert({
        proposal_id: row.proposalId,
        panelist_id: panelistId,
        sub_criterion_key: selectedSub,
        original_score: row.aiScore,
        override_score: scoreVal,
        rationale: editRationale.trim(),
      })
      .select("id, panelist_id, sub_criterion_key, original_score, override_score, rationale, created_at")
      .single();

    if (error) { alert("Failed to save: " + error.message); setSaving(false); return; }
    if (inserted) {
      setRows((prev) =>
        prev.map((r) =>
          r.proposalId === row.proposalId
            ? { ...r, overrides: [...r.overrides, { ...inserted, panelist_name: panelistName || "You" }] }
            : r
        )
      );
    }
    setEditingProposalId(null);
    setEditScore("");
    setEditRationale("");
    setSaving(false);
  }

  // Confirm (reviewed, no change)
  async function confirmReview(row: InnovatorRow) {
    if (!selectedSub || !panelistId) { alert("Select your name first."); return; }
    setSaving(true);
    const { data: inserted, error } = await supabase
      .from("panel_overrides")
      .insert({
        proposal_id: row.proposalId,
        panelist_id: panelistId,
        sub_criterion_key: selectedSub,
        original_score: row.aiScore,
        override_score: row.aiScore,
        rationale: "",
      })
      .select("id, panelist_id, sub_criterion_key, original_score, override_score, rationale, created_at")
      .single();

    if (error) { alert("Failed to save: " + error.message); setSaving(false); return; }
    if (inserted) {
      setRows((prev) =>
        prev.map((r) =>
          r.proposalId === row.proposalId
            ? { ...r, overrides: [...r.overrides, { ...inserted, panelist_name: panelistName || "You" }] }
            : r
        )
      );
    }
    setSaving(false);
  }

  // Rubric anchors for the selected sub-criterion
  const rubric = selectedSub ? getRubricAnchors(selectedSub) : null;

  // Group options by dimension for the dropdown
  const groups = SUB_OPTIONS.reduce((acc, opt) => {
    if (!acc[opt.group]) acc[opt.group] = [];
    acc[opt.group].push(opt);
    return acc;
  }, {} as Record<string, typeof SUB_OPTIONS>);

  return (
    <div>
      {/* Controls bar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch</label>
          <select
            value={batchId || ""}
            onChange={(e) => onBatchChange(e.target.value || null)}
            className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 min-w-[280px]"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sub-criterion</label>
          <select
            value={selectedSub || ""}
            onChange={(e) => setSelectedSub(e.target.value || null)}
            className="rounded border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 min-w-[320px]"
          >
            <option value="">Select a sub-criterion...</option>
            {Object.entries(groups).map(([group, opts]) => (
              <optgroup key={group} label={group}>
                {opts.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {!selectedSub && (
        <div className="text-sm text-gray-400 py-20 text-center">Select a sub-criterion to view all innovators' scores.</div>
      )}

      {selectedSub && rubric && (
        <>
          {/* Sticky rubric panel */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm mb-4 overflow-hidden">
            <button
              onClick={() => setRubricCollapsed(!rubricCollapsed)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Rubric</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rubric.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{rubricCollapsed ? "Show" : "Hide"} anchors</span>
                <span className="text-gray-400 text-xs">{rubricCollapsed ? "▼" : "▲"}</span>
              </div>
            </button>
            {!rubricCollapsed && (
              <div className="px-4 py-3 space-y-1.5">
                <div className="text-xs text-gray-400 mb-2">{rubric.source}</div>
                {[1, 2, 3, 4, 5].map((level) => {
                  const anchor = rubric.anchors[level];
                  if (!anchor) return null;
                  return (
                    <div key={level} className="flex items-start gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold flex-shrink-0 mt-0.5 ${SCORE_BG[level]} ${SCORE_TEXT[level]}`}>
                        {level}
                      </span>
                      <div className="text-xs leading-relaxed">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{anchor.label}:</span>{" "}
                        <span className="text-gray-500 dark:text-gray-400">{anchor.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort controls + count */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-gray-400">{rows.length} innovator{rows.length !== 1 ? "s" : ""}</span>
            <div className="text-xs text-gray-300">|</div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Sort by:</span>
            {(["score", "org", "country"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => handleSort(k)}
                className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${sortKey === k ? "bg-gray-900 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
              >
                {k === "score" ? "Score" : k === "org" ? "Organisation" : "Country"} {sortKey === k ? (sortAsc ? "↑" : "↓") : ""}
              </button>
            ))}
          </div>

          {loading && <div className="text-sm text-gray-400 py-10 text-center">Loading...</div>}

          {/* Innovator cards */}
          {!loading && (
            <div className="space-y-3">
              {sorted.map((row) => {
                const effectiveScore = row.overrides.length > 0 ? row.overrides[row.overrides.length - 1].override_score : row.aiScore;
                const hasOverride = row.overrides.length > 0;
                const isReviewed = row.overrides.length > 0; // any override or confirm = reviewed
                const hasScoreChange = row.overrides.some((o) => o.override_score !== o.original_score);
                const lastReviewer = row.overrides.length > 0 ? row.overrides[row.overrides.length - 1].panelist_name : null;
                const isEditing = editingProposalId === row.proposalId;
                const isLocked = row.status === "finalized";

                return (
                  <div key={row.proposalId} className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-sm font-bold ${SCORE_BG[effectiveScore]} ${SCORE_TEXT[effectiveScore]} ${hasOverride ? "ring-2 ring-purple-400" : ""}`}>
                          {effectiveScore}
                        </span>
                        {hasOverride && (
                          <span className="text-gray-400 line-through text-xs">{row.aiScore}</span>
                        )}
                        <div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.orgName}</span>
                          <span className="text-xs text-gray-400 ml-2">{row.country}</span>
                        </div>
                        {row.theme.map((t) => (
                          <span key={t} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" title={t}>
                            {t.match(/^Theme \d+/)?.[0] || t}
                          </span>
                        ))}
                        {row.borderline && (
                          <span className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400 rounded px-1.5 py-0.5 text-[10px] font-bold">Borderline</span>
                        )}
                        {row.panelVerify && (
                          <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-400 rounded px-1.5 py-0.5 text-[10px] font-bold">Panel Verify</span>
                        )}
                        {isLocked && (
                          <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded px-1.5 py-0.5 text-[10px] font-bold">🔒 Locked</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isReviewed && (
                          <span className="text-xs text-green-600 font-medium">✓ {lastReviewer}{hasScoreChange ? "" : " (confirmed)"}</span>
                        )}
                        {!isLocked && !isEditing && !isReviewed && (
                          <button
                            onClick={() => confirmReview(row)}
                            disabled={saving}
                            className="text-xs text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-950 rounded px-2 py-1 font-medium"
                          >
                            Confirm ✓
                          </button>
                        )}
                        {!isLocked && !isEditing && (
                          <button
                            onClick={() => startEdit(row.proposalId)}
                            className="text-xs text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-1"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-4 py-3 space-y-2">
                      {row.extract && (
                        <div className="text-xs leading-relaxed">
                          <span className="font-semibold text-gray-600 dark:text-gray-400">Extract: </span>
                          <span className="italic text-gray-500 dark:text-gray-400">&ldquo;{row.extract}&rdquo;</span>
                        </div>
                      )}
                      {row.interpretation && (
                        <div className="text-xs leading-relaxed">
                          <span className="font-semibold text-gray-600 dark:text-gray-400">Interpretation: </span>
                          <span className="text-gray-500 dark:text-gray-400">{row.interpretation}</span>
                        </div>
                      )}
                      {/* Rubric anchor omitted — sticky rubric panel above shows all levels */}
                      {false && row.rubricAnchor && (
                        <div className="rounded bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2.5 py-1.5">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">AI assigned rubric level {row.aiScore}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{row.rubricAnchor}</div>
                        </div>
                      )}
                      {row.borderline && (
                        <div className="rounded bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5">
                          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">Borderline: {row.borderline}</div>
                          {row.borderlineLow && <div className="text-xs text-amber-600 mt-1">Lower ({row.aiScore}): {row.borderlineLow}</div>}
                          {row.borderlineHigh && <div className="text-xs text-amber-600 mt-1">Higher ({row.aiScore + 1}): {row.borderlineHigh}</div>}
                        </div>
                      )}
                      {row.panelVerify && (
                        <div className="text-xs rounded bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 px-2.5 py-1.5">
                          <span className="font-semibold text-purple-700 dark:text-purple-400">Panel verify: </span>{row.panelVerify}
                        </div>
                      )}

                      {/* Override history */}
                      {row.overrides.length > 0 && (
                        <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Override history</div>
                          <div className="space-y-1">
                            {row.overrides.map((h) => (
                              <div key={h.id} className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2.5 py-1.5 flex items-start gap-1.5">
                                <span className="flex-shrink-0 flex items-center gap-0.5">
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[h.original_score]} ${SCORE_TEXT[h.original_score]}`}>{h.original_score}</span>
                                  <span className="text-gray-300">→</span>
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${SCORE_BG[h.override_score]} ${SCORE_TEXT[h.override_score]}`}>{h.override_score}</span>
                                </span>
                                <span className="flex-1 text-gray-600 dark:text-gray-400 leading-relaxed">
                                  <span className="font-semibold text-gray-800 dark:text-gray-200">{h.panelist_name}</span>: {h.rationale}
                                  <span className="text-gray-400 ml-1">{new Date(h.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Inline edit form */}
                      {isEditing && !isLocked && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="bg-white dark:bg-gray-900 rounded border border-blue-300 dark:border-blue-600 px-3 py-2.5 shadow-sm">
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Override score</div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">Score:</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => setEditScore(String(v))}
                                    className={`w-7 h-7 rounded text-xs font-bold transition-all ${editScore === String(v) ? `${SCORE_BG[v]} ${SCORE_TEXT[v]} ring-2 ring-blue-400 scale-110` : "bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                                  >{v}</button>
                                ))}
                              </div>
                            </div>
                            <textarea
                              placeholder="Rationale (required)"
                              value={editRationale}
                              onChange={(e) => setEditRationale(e.target.value)}
                              rows={2}
                              className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent mb-2 dark:bg-gray-800 dark:text-gray-100"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => submitOverride(row)}
                                disabled={saving || !editScore || !editRationale.trim()}
                                className="text-xs bg-black text-white rounded px-3 py-1 font-medium hover:bg-gray-800 disabled:opacity-30"
                              >{saving ? "Saving..." : "Save"}</button>
                              <button onClick={() => { setEditingProposalId(null); setEditScore(""); setEditRationale(""); }} className="text-xs text-gray-400 hover:text-black dark:hover:text-white px-2 py-1">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
