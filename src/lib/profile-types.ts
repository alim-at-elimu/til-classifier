export interface EvidenceStat {
  number: string;
  label: string;
  source: string;
}

export interface GovernmentRelationship {
  country: string;
  ministry: string;
  status: 'Active MOU' | 'In pipeline' | 'Interest only';
}

export interface Quote {
  text: string;
  attribution: string;
}

export type Theme =
  | 'Individual Teacher Support'
  | 'Group Coaching and Peer Learning'
  | 'Closing the Data-to-Action Loop'
  | 'Finding and Spreading What Already Works';

export type Stage = 'Proof' | 'Pilot-ready' | 'Scaling';

export interface Organisation {
  id?: string;
  name: string | null;
  country: string | null;
  founded_year: string | null;
  team_size: string | null;
  african_led: boolean | null;
}

export interface ChangelogEntry {
  id: string;
  profile_id: string;
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  changed_at: string;
}

export interface InnovatorProfile {
  organisation_id: string | null;
  theme: Theme | null;
  insight: string | null;
  model_steps: string[];
  evidence_stats: EvidenceStat[];
  cost_per_teacher_now: string | null;
  cost_per_teacher_scale: string | null;
  funding_gap: string | null;
  government_relationships: GovernmentRelationship[];
  stage: Stage | null;
  quotes: Quote[];
  ask_funders: string;
  ask_governments: string;
  confidence_flags: string[];
  web_augmented_fields: string[];
  /** Client-side only: fields updated by a new file upload (not persisted) */
  file_updated_fields: string[];
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: 'pdf' | 'xlsx' | 'unknown';
}

export interface AssessedFile extends UploadedFile {
  recommendation: 'extract' | 'skip';
  reason: string;
  decision: 'extract' | 'skip';
  textContent?: string;
  base64?: string;
}

export type WorkflowStep = 0 | 1 | 2 | 3 | 4 | 5;

export const THEMES: Theme[] = [
  'Individual Teacher Support',
  'Group Coaching and Peer Learning',
  'Closing the Data-to-Action Loop',
  'Finding and Spreading What Already Works',
];

export const STAGES: Stage[] = ['Proof', 'Pilot-ready', 'Scaling'];

export const GOV_STATUSES: GovernmentRelationship['status'][] = [
  'Active MOU',
  'In pipeline',
  'Interest only',
];

export function emptyOrganisation(): Organisation {
  return {
    name: null,
    country: null,
    founded_year: null,
    team_size: null,
    african_led: null,
  };
}

export function emptyProfile(): InnovatorProfile {
  return {
    organisation_id: null,
    theme: null,
    insight: null,
    model_steps: [],
    evidence_stats: [],
    cost_per_teacher_now: null,
    cost_per_teacher_scale: null,
    funding_gap: null,
    government_relationships: [],
    stage: null,
    quotes: [],
    ask_funders: '',
    ask_governments: '',
    confidence_flags: [],
    web_augmented_fields: [],
    file_updated_fields: [],
  };
}
