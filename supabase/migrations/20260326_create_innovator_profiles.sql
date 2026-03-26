-- Elimu-Soko: organisations table
create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text,
  country text,
  founded_year text,
  team_size text,
  african_led boolean,
  created_at timestamptz not null default now()
);
create index if not exists idx_organisations_name on organisations (name);

-- Elimu-Soko: innovator profiles (innovations linked to orgs)
create table if not exists innovator_profiles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  theme text,
  insight text,
  model_steps jsonb default '[]'::jsonb,
  evidence_stats jsonb default '[]'::jsonb,
  cost_per_teacher_now text,
  cost_per_teacher_scale text,
  funding_gap text,
  government_relationships jsonb default '[]'::jsonb,
  stage text,
  quotes jsonb default '[]'::jsonb,
  ask_funders text,
  ask_governments text,
  confidence_flags text[] default '{}',
  web_augmented_fields text[] default '{}',
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
create index if not exists idx_innovator_profiles_org on innovator_profiles (organisation_id);
create index if not exists idx_innovator_profiles_created_at on innovator_profiles (created_at desc);

-- Elimu-Soko: field-level edit changelog
create table if not exists profile_changelog (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references innovator_profiles(id) on delete cascade,
  field_name text not null,
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz not null default now()
);
create index if not exists idx_profile_changelog_profile on profile_changelog (profile_id, changed_at desc);
