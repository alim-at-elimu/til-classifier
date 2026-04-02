'use client';

import { useState, useEffect, useCallback } from 'react';
import { Innovation, Innovator } from '@/lib/profile-types';
import { buildIpArticle, openIpForPrint } from '@/lib/export-ip';

interface ProfileRow {
  id: string;
  name: string | null;
  stage: string | null;
  status: string;
  innovators: { name: string | null; country: string | null } | null;
}

export default function BatchExport() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/api/profile-list')
      .then((r) => r.json())
      .then((d) => setProfiles(d.profiles || []))
      .catch(() => setError('Failed to load innovations'))
      .finally(() => setLoading(false));
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

  const runExport = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setExporting(true);
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
      setExporting(false);
    }
  }, []);

  const allSelected = profiles.length > 0 && selected.size === profiles.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Batch Export</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {selected.size > 0 ? `${selected.size} selected` : 'Select innovations to export'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => runExport([...selected])}
            disabled={selected.size === 0 || exporting}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting…' : `Export Selected${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
          <button
            onClick={() => runExport(profiles.map((p) => p.id))}
            disabled={profiles.length === 0 || exporting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export All ({profiles.length})
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Organisation</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Innovation</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Country</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profiles.map((profile) => (
                <tr
                  key={profile.id}
                  onClick={() => toggle(profile.id)}
                  className={`cursor-pointer transition-colors ${selected.has(profile.id) ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(profile.id)}
                      onChange={() => toggle(profile.id)}
                      className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {profile.innovators?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {profile.name ?? <span className="italic text-gray-400">Untitled</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {profile.innovators?.country ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">
                    {profile.stage ?? '—'}
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
