import { Innovation, Innovator, GovernmentRelationship, EvidenceStat } from './profile-types';

export function smartMergeOrg(
  existing: Innovator,
  extracted: Innovator
): { merged: Innovator; updatedFields: string[] } {
  const merged = { ...existing };
  const updatedFields: string[] = [];
  const keys = ['name', 'country', 'founded_year', 'team_size', 'african_led', 'org_type', 'track_record_description'] as const;

  for (const key of keys) {
    const oldVal = existing[key];
    const newVal = extracted[key];
    if (newVal === null || newVal === undefined) continue;
    if (oldVal === null || oldVal === undefined || oldVal === '') {
      (merged as Record<string, unknown>)[key] = newVal;
      updatedFields.push(key);
    } else if (String(oldVal) !== String(newVal)) {
      (merged as Record<string, unknown>)[key] = newVal;
      updatedFields.push(key);
    }
  }

  return { merged, updatedFields };
}

export function smartMergeInnovation(
  existing: Innovation,
  extracted: Innovation
): { merged: Innovation; updatedFields: string[] } {
  const merged = { ...existing };
  const updatedFields: string[] = [];

  const scalarKeys = [
    'name', 'theme',
    'problem_statement', 'opportunity_statement',
    'cost_per_teacher_now', 'cost_per_teacher_scale', 'marginal_cost_at_scale',
    'funding_ask_base', 'funding_ask_duration',
    'stage', 'evidence_status',
    'maturity_demonstrated', 'pilot_scope',
    'quote', 'quote_attribution',
  ] as const;

  for (const key of scalarKeys) {
    const oldVal = existing[key];
    const newVal = extracted[key];
    if (newVal === null || newVal === undefined) continue;
    if (oldVal === null || oldVal === undefined || oldVal === '') {
      (merged as Record<string, unknown>)[key] = newVal;
      updatedFields.push(key);
    } else if (String(oldVal) !== String(newVal)) {
      (merged as Record<string, unknown>)[key] = newVal;
      updatedFields.push(key);
    }
  }

  // Government relationships: append new (dedup by country+ministry)
  if (extracted.government_relationships.length > 0) {
    const existingKeys = new Set(
      existing.government_relationships.map((g) => `${g.country}::${g.ministry}`.toLowerCase())
    );
    const newGovs: GovernmentRelationship[] = extracted.government_relationships.filter(
      (g) => !existingKeys.has(`${g.country}::${g.ministry}`.toLowerCase())
    );
    if (newGovs.length > 0) {
      merged.government_relationships = [...existing.government_relationships, ...newGovs];
      updatedFields.push('government_relationships');
    }
  }

  // Evidence stats: append new (dedup), cap at 4
  if (extracted.evidence_stats.length > 0) {
    const existingKeys = new Set(
      existing.evidence_stats.map((s) => `${s.number}::${s.label}`.toLowerCase())
    );
    const newStats: EvidenceStat[] = extracted.evidence_stats.filter(
      (s) => !existingKeys.has(`${s.number}::${s.label}`.toLowerCase())
    );
    if (newStats.length > 0) {
      merged.evidence_stats = [...existing.evidence_stats, ...newStats].slice(0, 4);
      updatedFields.push('evidence_stats');
    }
  }

  // Model steps: replace if different
  if (extracted.model_steps.length > 0) {
    if (existing.model_steps.join('|||') !== extracted.model_steps.join('|||')) {
      merged.model_steps = extracted.model_steps;
      updatedFields.push('model_steps');
    }
  }

  // Adoption pathway bullets: replace if different and existing is empty
  if (extracted.adoption_pathway_bullets.length > 0 && existing.adoption_pathway_bullets.length === 0) {
    merged.adoption_pathway_bullets = extracted.adoption_pathway_bullets;
    updatedFields.push('adoption_pathway_bullets');
  }

  // Funding covers: replace if different and existing is empty
  if (extracted.funding_covers.length > 0 && existing.funding_covers.length === 0) {
    merged.funding_covers = extracted.funding_covers;
    updatedFields.push('funding_covers');
  }

  // Merge confidence flags
  const newFlags = (extracted.confidence_flags || []).filter(
    (flag) => !merged.confidence_flags.includes(flag)
  );
  if (newFlags.length > 0) {
    merged.confidence_flags = [...merged.confidence_flags, ...newFlags];
  }

  merged.file_updated_fields = [
    ...new Set([...existing.file_updated_fields, ...updatedFields]),
  ];

  return { merged, updatedFields };
}

/** Convenience wrapper that merges both org and innovation */
export function smartMergeFull(
  existingOrg: Innovator,
  existingProfile: Innovation,
  extractedOrg: Innovator,
  extractedProfile: Innovation
): {
  mergedOrg: Innovator;
  mergedProfile: Innovation;
  updatedFields: string[];
} {
  const orgResult = smartMergeOrg(existingOrg, extractedOrg);
  const profileResult = smartMergeInnovation(existingProfile, extractedProfile);
  return {
    mergedOrg: orgResult.merged,
    mergedProfile: profileResult.merged,
    updatedFields: [...orgResult.updatedFields, ...profileResult.updatedFields],
  };
}
