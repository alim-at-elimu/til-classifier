-- Add org_type and org_description to organisations
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS org_type text;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS org_description text;

-- Add new profiling fields to innovator_profiles
ALTER TABLE innovator_profiles ADD COLUMN IF NOT EXISTS evidence_status text;
ALTER TABLE innovator_profiles ADD COLUMN IF NOT EXISTS investment_thesis text;
ALTER TABLE innovator_profiles ADD COLUMN IF NOT EXISTS problem_statement text;
ALTER TABLE innovator_profiles ADD COLUMN IF NOT EXISTS opportunity_statement text;
ALTER TABLE innovator_profiles ADD COLUMN IF NOT EXISTS focal_government_relationship text;
ALTER TABLE innovator_profiles ADD COLUMN IF NOT EXISTS learner_outcome_stat jsonb;
ALTER TABLE innovator_profiles ADD COLUMN IF NOT EXISTS maturity_demonstrated text;
ALTER TABLE innovator_profiles ADD COLUMN IF NOT EXISTS maturity_to_validate text;
ALTER TABLE innovator_profiles ADD COLUMN IF NOT EXISTS maturity_outlook text;
ALTER TABLE innovator_profiles ADD COLUMN IF NOT EXISTS pilot_scope text;
