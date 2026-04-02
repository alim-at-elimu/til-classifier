'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Innovation, Innovator } from '@/lib/profile-types';
import { buildIpArticle, openIpForPrint } from '@/lib/export-ip';

interface ProfileRow {
  id: string;
  name: string | null;
  stage: string | null;
  status: string;
  innovators: { name: string | null; country: string | null } | null;
}

type SortKey = 'org' | 'innovation' | 'country' | 'stage';
type SortDir = 'asc' | 'desc';

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idea',
  prototype: 'Prototype',
  pilot: 'Pilot',
  scale: 'Scale',
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg className="ml-1.5 inline-block h-3.5 w-3.5 align-middle" viewBox="0 0 16 16" fill="none">
      <path d="M8 3l3 4H5l3-4z" fill={active && dir === 'asc' ? '#F59E0B' : '#9CA3AF'} />
      <path d="M8 13l3-4H5l3 4z" fill={active && dir === 'desc' ? '#F59E0B' : '#9CA3AF'} />
    </svg>
  );
}

async function fetchAndExport(ids: string[], onStart: () => void, onDone: () => void) {
  onStart();
  try {
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/profile-get?id=${id}`)
          .then((r) => r.json())
          .then((d) => ({ profile: d.profile as Innovation, organisation: d.organisation as Innovator }))
      )
    );
    const articles = results
      .filter((r) => r.profile && r.organisation)
      .map((r) => buildIpArticle(r.profile, r.organisation));
    const title = ids.length === 1
      ? (results[0]?.profile?.name || 'Investment Proposition')
      : `Investment Propositions (${ids.length})`;
    openIpForPrint(articles, title);
  } catch {
    alert('Export failed — please try again.');
  } finally {
    onDone();
  }
}

export default function BatchExport() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('org');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    fetch('/api/profile-list')
      .then((r) => r.json())
      .then((d) => setProfiles(d.profiles || []))
      .catch(() => setError('Failed to load innovations'))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const val = (p: ProfileRow): string => {
      if (sortKey === 'org') return (p.innovators?.name ?? '').toLowerCase();
      if (sortKey === 'innovation') return (p.name ?? '').toLowerCase();
      if (sortKey === 'country') return (p.innovators?.country ?? '').toLowerCase();
      return (p.stage ?? '').toLowerCase();
    };
    return [...profiles].sort((a, b) => {
      const cmp = val(a).localeCompare(val(b));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [profiles, sortKey, sortDir]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
      else setSortDir('asc');
      return key;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === profiles.length ? new Set() : new Set(profiles.map((p) => p.id))
    );
  }, [profiles]);

  const allSelected = profiles.length > 0 && selected.size === profiles.length;
  const someSelected = selected.size > 0 && !allSelected;

  const thClass = (key: SortKey) =>
    `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors ${sortKey === key ? 'text-amber-600' : 'text-gray-500 hover:text-gray-700'}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Batch Export</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select innovations and export their investment propositions as a printable PDF.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {selected.size > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {selected.size} selected
            </span>
          ) : (
            <span className="text-sm text-gray-400">{profiles.length} innovations</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAndExport([...selected], () => setExporting(true), () => setExporting(false))}
            disabled={selected.size === 0 || exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>↓</span>
            {exporting ? 'Exporting…' : `Export Selected${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
          <button
            onClick={() => fetchAndExport(profiles.map((p) => p.id), () => setExporting(true), () => setExporting(false))}
            disabled={profiles.length === 0 || exporting}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Export All ({profiles.length})
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
          Loading innovations…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                </th>
                <th className={thClass('org')} onClick={() => handleSort('org')}>
                  Organisation <SortIcon active={sortKey === 'org'} dir={sortDir} />
                </th>
                <th className={thClass('innovation')} onClick={() => handleSort('innovation')}>
                  Innovation <SortIcon active={sortKey === 'innovation'} dir={sortDir} />
                </th>
                <th className={thClass('country')} onClick={() => handleSort('country')}>
                  Country <SortIcon active={sortKey === 'country'} dir={sortDir} />
                </th>
                <th className={thClass('stage')} onClick={() => handleSort('stage')}>
                  Stage <SortIcon active={sortKey === 'stage'} dir={sortDir} />
                </th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((profile) => (
                <tr
                  key={profile.id}
                  onClick={() => toggle(profile.id)}
                  className={`group cursor-pointer transition-colors ${selected.has(profile.id) ? 'bg-amber-50 hover:bg-amber-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(profile.id)}
                      onChange={() => toggle(profile.id)}
                      className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                    />
                  </td>
                  <td className="px-4 py-3.5 font-medium text-gray-900">
                    {profile.innovators?.name ?? <span className="italic text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-700">
                    {profile.name ?? <span className="italic text-gray-400">Untitled</span>}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">
                    {profile.innovators?.country ?? '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {profile.stage ? (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 capitalize">
                        {STAGE_LABELS[profile.stage] ?? profile.stage}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() =>
                        fetchAndExport(
                          [profile.id],
                          () => setExportingId(profile.id),
                          () => setExportingId(null)
                        )
                      }
                      disabled={exportingId === profile.id}
                      className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 transition-colors"
                    >
                      {exportingId === profile.id ? '…' : 'Export'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {profiles.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">No innovations found.</div>
          )}
        </div>
      )}
    </div>
  );
}
