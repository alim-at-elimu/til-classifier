'use client';

import { useState, useEffect } from 'react';
import { ChangelogEntry } from '@/lib/profile-types';

interface Props {
  profileId: string;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '(empty)';
  if (typeof val === 'string') return val.length > 80 ? val.slice(0, 80) + '…' : val;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return `[${val.length} items]`;
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 80) + '…';
  return String(val);
}

function formatFieldName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Changelog({ profileId }: Props) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/profile-changelog?profile_id=${profileId}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [profileId, open]);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {open ? 'Hide history' : 'History'}
      </button>

      {open && (
        <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white">
          {loading ? (
            <div className="flex items-center gap-2 p-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <span className="text-xs text-gray-500">Loading history…</span>
            </div>
          ) : entries.length === 0 ? (
            <p className="p-4 text-xs text-gray-400">No edit history yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {entries.map((e) => (
                <div key={e.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">{formatFieldName(e.field_name)}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(e.changed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                    <span className="text-red-400 line-through">{formatValue(e.old_value)}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-emerald-600">{formatValue(e.new_value)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
