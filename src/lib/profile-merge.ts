import { InnovatorProfile, Organisation, GovernmentRelationship, EvidenceStat, Quote } from './profile-types';

export function smartMergeOrg(
  existing: Organisation,
  extracted: Organisation
): { merged: Organisation; updatedFields: string[] } {
  const merged = { ...existing };
  const updatedFields: string[] = [];
  const keys = ['name', 'country', 'founded_year', 'team_size', 'african_led'] as const;

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
  existing: InnovatorProfile,
  extracted: InnovatorProfile
): { merged: InnovatorProfile; updatedFields: string[] } {
  const merged = { ...existing };
  const updatedFields: string[] = [];

  const scalarKeys = [
    'theme', 'insight',
    'cost_per_teacher_now', 'cost_per_teacher_scale', 'funding_gap',
    'stage',
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

  // Evidence stats: append new (dedup), cap at 3
  if (extracted.evidence_stats.length > 0) {
    const existingKeys = new Set(
      existing.evidence_stats.map((s) => `${s.number}::${s.label}`.toLowerCase())
    );
    const newStats: EvidenceStat[] = extracted.evidence_stats.filter(
      (s) => !existingKeys.has(`${s.number}::${s.label}`.toLowerCase())
    );
    if (newStats.length > 0) {
      merged.evidence_stats = [...existing.evidence_stats, ...newStats].slice(0, 3);
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

  // Quotes: append new (dedup by text)
  if (extracted.quotes.length > 0) {
    const existingTexts = new Set(existing.quotes.map((q) => q.text.toLowerCase().trim()));
    const newQuotes: Quote[] = extracted.quotes.filter(
      (q) => q.text && !existingTexts.has(q.text.toLowerCase().trim())
    );
    if (newQuotes.length > 0) {
      merged.quotes = [...existing.quotes, ...newQuotes];
      updatedFields.push('quotes');
    }
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
  existingOrg: Organisation,
  existingProfile: InnovatorProfile,
  extractedOrg: Organisation,
  extractedProfile: InnovatorProfile
): {
  mergedOrg: Organisation;
  mergedProfile: InnovatorProfile;
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
