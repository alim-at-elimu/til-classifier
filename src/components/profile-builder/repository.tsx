'use client';

import { useState, useEffect, useCallback } from 'react';
import { Innovation, Innovator, emptyInnovation, emptyInnovator } from '@/lib/profile-types';

// Legacy type aliases used in this component
type InnovatorProfile = Innovation;
type Organisation = Innovator;
const emptyProfile = emptyInnovation;
const emptyOrganisation = emptyInnovator;

interface OrgSummary {
  id: string;
  name: string | null;
  country: string | null;
  team_size: string | null;
  african_led: boolean | null;
  innovation_count: number;
  created_at: string;
}

interface InnovationSummary {
  id: string;
  theme: string | null;
  stage: string | null;
  status: string;
  created_at: string;
  confidence_flags: string[];
}

interface Props {
  onEdit: (profile: InnovatorProfile, org: Organisation, profileId: string) => void;
  onNewInnovation: (org: Organisation) => void;
}

export default function Repository({ onEdit, onNewInnovation }: Props) {
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrgSummary | null>(null);
  const [innovations, setInnovations] = useState<InnovationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/org-list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setOrgs(data.organisations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInnovations = useCallback(async (orgId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org-innovations?org_id=${orgId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setInnovations(data.innovations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const handleSelectOrg = (org: OrgSummary) => {
    setSelectedOrg(org);
    loadInnovations(org.id);
  };

  const handleBackToOrgs = () => {
    setSelectedOrg(null);
    setInnovations([]);
    loadOrgs();
  };

  const handleOpenInnovation = async (id: string) => {
    try {
      const res = await fetch(`/api/profile-get?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const raw = data.profile;
      const rawOrg = data.organisation;
      const profile: InnovatorProfile = {
        ...emptyProfile(),
        ...raw,
        model_steps: raw.model_steps || [],
        evidence_stats: raw.evidence_stats || [],
        government_relationships: raw.government_relationships || [],
        adoption_pathway_bullets: raw.adoption_pathway_bullets || [],
        funding_covers: raw.funding_covers || [],
        confidence_flags: raw.confidence_flags || [],
        web_augmented_fields: raw.web_augmented_fields || [],
        file_updated_fields: [],
      };
      const org: Organisation = rawOrg
        ? { ...emptyOrganisation(), id: rawOrg.id, name: rawOrg.name, country: rawOrg.country, founded_year: rawOrg.founded_year, team_size: rawOrg.team_size, african_led: rawOrg.african_led, org_type: rawOrg.org_type, track_record_description: rawOrg.track_record_description }
        : emptyOrganisation();
      onEdit(profile, org, id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to open');
    }
  };

  const handleNewInnovation = () => {
    if (!selectedOrg) return;
    const org: Organisation = {
      ...emptyOrganisation(),
      id: selectedOrg.id,
      name: selectedOrg.name,
      country: selectedOrg.country,
      team_size: selectedOrg.team_size,
      african_led: selectedOrg.african_led,
      founded_year: null,
      org_type: null,
      track_record_description: null,
    };
    onNewInnovation(org);
  };

  if (loading && orgs.length === 0 && !selectedOrg) {
    return (
      <div className="flex items-center gap-3 py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <span className="text-sm text-gray-500">Loading…</span>
      </div>
    );
  }

  if (error) {
    const isTableMissing = error.includes('organisations') || error.includes('innovator_profiles') || error.includes('PGRST');
    return <TableMissingBanner isTableMissing={isTableMissing} error={error} onRetry={loadOrgs} />;
  }

  // Innovation list for selected org
  if (selectedOrg) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToOrgs} className="text-sm text-gray-500 hover:text-gray-700">← Organisations</button>
            <h2 className="text-lg font-semibold text-gray-900">{selectedOrg.name || '(unnamed)'}</h2>
            {selectedOrg.country && <span className="text-sm text-gray-500">{selectedOrg.country}</span>}
            {selectedOrg.african_led && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">African-led</span>}
          </div>
          <button onClick={handleNewInnovation} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
            + New Innovation
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <span className="text-sm text-gray-500">Loading innovations…</span>
          </div>
        ) : innovations.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No innovations yet for this organisation.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Theme</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Stage</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Flags</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Created</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {innovations.map((inn) => (
                  <tr key={inn.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{inn.theme || '(no theme)'}</td>
                    <td className="px-4 py-3">
                      {inn.stage && <StageBadge stage={inn.stage} />}
                    </td>
                    <td className="px-4 py-3">
                      {inn.confidence_flags?.length > 0 && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                          {inn.confidence_flags.length} review
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(inn.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleOpenInnovation(inn.id)} className="text-xs font-medium text-amber-600 hover:text-amber-700">Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Org list (default)
  if (orgs.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-gray-500">No organisations yet. Build your first profile to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Organisations <span className="ml-1 text-sm font-normal text-gray-400">{orgs.length}</span>
        </h2>
        <button onClick={loadOrgs} className="text-xs text-gray-400 hover:text-gray-600">Refresh</button>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Organisation</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Country</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Team</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Innovations</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{o.name || '(unnamed)'}</span>
                  {o.african_led && <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">African-led</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{o.country || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{o.team_size || '—'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{o.innovation_count}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleSelectOrg(o)} className="text-xs font-medium text-amber-600 hover:text-amber-700">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    'Proof': 'bg-gray-100 text-gray-600',
    'Pilot-ready': 'bg-amber-100 text-amber-700',
    'Scaling': 'bg-emerald-100 text-emerald-700',
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[stage] || 'bg-gray-100 text-gray-600'}`}>{stage}</span>;
}

const MIGRATION_SQL = `-- 1. Organisations
create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text, country text, founded_year text,
  team_size text, african_led boolean,
  created_at timestamptz not null default now()
);

-- 2. Innovation profiles
create table if not exists innovator_profiles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  theme text, insight text,
  model_steps jsonb default '[]'::jsonb,
  evidence_stats jsonb default '[]'::jsonb,
  cost_per_teacher_now text, cost_per_teacher_scale text, funding_gap text,
  government_relationships jsonb default '[]'::jsonb,
  stage text, quotes jsonb default '[]'::jsonb,
  ask_funders text, ask_governments text,
  confidence_flags text[] default '{}',
  web_augmented_fields text[] default '{}',
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

-- 3. Edit changelog
create table if not exists profile_changelog (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references innovator_profiles(id) on delete cascade,
  field_name text not null,
  old_value jsonb, new_value jsonb,
  changed_at timestamptz not null default now()
);`;

function TableMissingBanner({ isTableMissing, error, onRetry }: { isTableMissing: boolean; error: string; onRetry: () => void }) {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isTableMissing) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={onRetry} className="mt-2 text-xs text-red-600 underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h3 className="text-sm font-semibold text-amber-900">Database setup required</h3>
        <p className="mt-1 text-sm text-amber-700">
          Three tables need to be created: <code className="rounded bg-amber-100 px-1 text-xs">organisations</code>,{' '}
          <code className="rounded bg-amber-100 px-1 text-xs">innovator_profiles</code>, and{' '}
          <code className="rounded bg-amber-100 px-1 text-xs">profile_changelog</code>.
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setShowSql(!showSql)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50">
            {showSql ? 'Hide SQL' : 'Show SQL'}
          </button>
          <button onClick={() => { navigator.clipboard.writeText(MIGRATION_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600">
            {copied ? 'Copied!' : 'Copy SQL to clipboard'}
          </button>
          <button onClick={onRetry} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">Retry</button>
        </div>
        {showSql && <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">{MIGRATION_SQL}</pre>}
        <p className="mt-3 text-[11px] text-amber-600">Go to your Supabase dashboard → SQL Editor → paste and run.</p>
      </div>
    </div>
  );
}
