-- Create innovators table (replaces organisations)
CREATE TABLE IF NOT EXISTS innovators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  country text,
  org_type text,
  founded_year text,
  team_size text,
  african_led boolean,
  track_record_description text,
  created_at timestamptz DEFAULT now()
);

-- Create innovations table (replaces innovator_profiles)
CREATE TABLE IF NOT EXISTS innovations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  innovator_id uuid REFERENCES innovators(id) ON DELETE CASCADE,
  name text,
  theme text,
  stage text,
  evidence_status text,
  investment_thesis text,
  problem_statement text,
  opportunity_statement text,
  model_steps jsonb DEFAULT '[]'::jsonb,
  adoption_pathway_bullets jsonb DEFAULT '[]'::jsonb,
  evidence_stats jsonb DEFAULT '[]'::jsonb,
  evidence_interpretation text,
  cost_per_teacher_now text,
  cost_per_teacher_scale text,
  marginal_cost_at_scale text,
  funding_ask_base text,
  funding_ask_duration text,
  funding_covers jsonb DEFAULT '[]'::jsonb,
  ask_funder_outcome text,
  government_relationships jsonb DEFAULT '[]'::jsonb,
  quote text,
  quote_attribution text,
  pilot_scope text,
  maturity_demonstrated text,
  maturity_to_validate text,
  maturity_outlook text,
  ask_for_funders text,
  ask_for_governments text,
  confidence_flags text[] DEFAULT '{}',
  web_augmented_fields text[] DEFAULT '{}',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

-- Drop old tables (safe because we're rebuilding)
DROP TABLE IF EXISTS innovator_profiles CASCADE;
DROP TABLE IF EXISTS organisations CASCADE;
