export type Theme =
  | 'Individual Teacher Support'
  | 'Group Coaching and Peer Learning'
  | 'Closing the Data-to-Action Loop'
  | 'Finding and Spreading What Already Works';

export type Stage = 'Proof' | 'Pilot-ready' | 'Scaling';

export type EvidenceStatus = 'Established' | 'Promising' | 'Emerging';

export interface EvidenceStat {
  number: string;
  label: string;
  source: string;
}

export interface DocumentRecord {
  name: string;
  path: string;
  type: 'pdf' | 'xlsx' | 'unknown';
  size: number;
  uploaded_at: string;
}

export interface GovernmentRelationship {
  country: string;
  ministry: string;
  status: 'Active MOU' | 'In pipeline' | 'Interest only';
  focal_point?: boolean;
}

export interface Innovator {
  id?: string;
  name: string | null;
  country: string | null;
  org_type: string | null;
  founded_year: string | null;
  team_size: string | null;
  african_led: boolean | null;
  track_record_description: string | null;
}

export interface Innovation {
  innovator_id: string | null;
  name: string | null;
  theme: Theme | null;
  stage: Stage | null;
  evidence_status: EvidenceStatus | null;
  investment_thesis: string | null;
  problem_statement: string | null;
  opportunity_statement: string | null;
  model_steps: string[];
  adoption_pathway_bullets: string[];
  evidence_stats: EvidenceStat[];
  evidence_interpretation: string | null;
  cost_per_teacher_now: string | null;
  cost_per_teacher_scale: string | null;
  marginal_cost_at_scale: string | null;
  funding_ask_base: string | null;
  funding_ask_duration: string | null;
  funding_covers: string[];
  ask_funder_outcome: string | null;
  government_relationships: GovernmentRelationship[];
  quote: string | null;
  quote_attribution: string | null;
  pilot_scope: string | null;
  maturity_demonstrated: string | null;
  maturity_to_validate: string | null;
  maturity_outlook: string | null;
  ask_for_funders: string | null;
  ask_for_governments: string | null;
  confidence_flags: string[];
  web_augmented_fields: string[];
  file_updated_fields: string[];
  documents: DocumentRecord[];
  status?: string;
}

export interface ChangelogEntry {
  id: string;
  profile_id: string;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  changed_at: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'pdf' | 'xlsx' | 'unknown';
}

export interface AssessedFile extends UploadedFile {
  recommendation: 'extract' | 'store' | 'skip';
  reason: string;
  decision: 'extract' | 'store' | 'skip';
  textContent?: string;
  base64?: string;
}

export type WorkflowStep = 0 | 1 | 2 | 3 | 4;

export const THEMES: Theme[] = [
  'Individual Teacher Support',
  'Group Coaching and Peer Learning',
  'Closing the Data-to-Action Loop',
  'Finding and Spreading What Already Works',
];

export const STAGES: Stage[] = ['Proof', 'Pilot-ready', 'Scaling'];
export const EVIDENCE_STATUSES: EvidenceStatus[] = ['Established', 'Promising', 'Emerging'];

export const GOV_STATUSES: GovernmentRelationship['status'][] = [
  'Active MOU',
  'In pipeline',
  'Interest only',
];

export function emptyInnovator(): Innovator {
  return {
    name: null,
    country: null,
    org_type: null,
    founded_year: null,
    team_size: null,
    african_led: null,
    track_record_description: null,
  };
}

export function emptyInnovation(): Innovation {
  return {
    innovator_id: null,
    name: null,
    theme: null,
    stage: null,
    evidence_status: null,
    investment_thesis: null,
    problem_statement: null,
    opportunity_statement: null,
    model_steps: [],
    adoption_pathway_bullets: [],
    evidence_stats: [],
    evidence_interpretation: null,
    cost_per_teacher_now: null,
    cost_per_teacher_scale: null,
    marginal_cost_at_scale: null,
    funding_ask_base: null,
    funding_ask_duration: null,
    funding_covers: [],
    ask_funder_outcome: null,
    government_relationships: [],
    quote: null,
    quote_attribution: null,
    pilot_scope: null,
    maturity_demonstrated: null,
    maturity_to_validate: null,
    maturity_outlook: null,
    ask_for_funders: null,
    ask_for_governments: null,
    confidence_flags: [],
    web_augmented_fields: [],
    file_updated_fields: [],
    documents: [],
    status: 'draft',
  };
}

// Legacy aliases for backward compatibility during migration
export type Organisation = Innovator;
export type InnovatorProfile = Innovation;
export const emptyOrganisation = emptyInnovator;
export const emptyProfile = emptyInnovation;
