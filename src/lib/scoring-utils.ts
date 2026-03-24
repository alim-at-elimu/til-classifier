// Shared scoring constants and functions used by portfolio-table and shortlist components

export const DIM_DEFS: Record<string, string[]> = {
  government_depth: ["named_counterparts", "documented_engagement", "institutional_home", "government_delivery_roles"],
  adoption_readiness: ["transition_logic", "capacity_shift", "adoption_timeline"],
  cost_realism: ["pilot_unit_cost", "cost_ownership_trajectory", "steady_state_fiscal"],
  innovation_quality: ["problem_solution_fit", "operational_clarity", "pilot_learning_architecture", "team_timeline_realism"],
  evidence_strength: ["decision_useful_evidence", "government_decision_mechanisms", "learning_outcome_evidence_chain"],
};

export const DIM_MAX: Record<string, number> = {
  government_depth: 20, adoption_readiness: 15, cost_realism: 15, innovation_quality: 20, evidence_strength: 15,
};

export type DimData = Record<string, { score?: number; interpretation?: string; extract?: string; rubric_anchor?: string }> | undefined;

export interface CallJson {
  gates?: Record<string, { pass?: boolean; score: number; interpretation?: string }>;
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

export interface TotalsResult {
  dims: Record<string, number>;
  total: number;
  rec: string;
}

// Set of all valid dimension sub-criterion keys (17 total)
export const VALID_SUB_KEYS = new Set(
  Object.entries(DIM_DEFS).flatMap(([dim, subs]) => subs.map(s => `${dim}.${s}`))
);

export function getDimScaled(dimData: DimData, dimKey: string, overrides: Record<string, number>): number {
  if (!dimData) return 0;
  const raw = DIM_DEFS[dimKey].reduce((sum, sub) => {
    const key = `${dimKey}.${sub}`;
    return sum + (overrides[key] ?? dimData[sub]?.score ?? 0);
  }, 0);
  return Math.round((raw / DIM_MAX[dimKey]) * 20);
}

export function computeAdjustedTotals(call1: CallJson | null | undefined, call2: CallJson | null | undefined, overrides: Record<string, number>): TotalsResult {
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
