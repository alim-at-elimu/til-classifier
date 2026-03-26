'use client';

import { useState } from 'react';
import { InnovatorProfile, Organisation } from '@/lib/profile-types';

interface Props {
  organisation: Organisation;
  orgId: string | null;
  profile: InnovatorProfile;
  submitted: boolean;
  onSubmit: (orgId: string) => void;
  onBack: () => void;
  onReset: () => void;
}

export default function SubmitStep({ organisation, orgId, profile, submitted, onSubmit, onBack, onReset }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileId, setProfileId] = useState('');

  async function handleSubmit() {
    setSaving(true);
    setError('');
    try {
      // Create org first if new
      let resolvedOrgId = orgId;
      if (!resolvedOrgId) {
        const orgRes = await fetch('/api/org-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organisation }),
        });
        if (!orgRes.ok) throw new Error('Failed to create organisation');
        const orgData = await orgRes.json();
        resolvedOrgId = orgData.id;
      }

      // Submit profile
      const res = await fetch('/api/profile-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, organisation_id: resolvedOrgId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      const { id } = await res.json();
      setProfileId(id);
      onSubmit(resolvedOrgId!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8">
          <div className="text-4xl">✓</div>
          <h2 className="mt-3 text-lg font-semibold text-emerald-800">Profile saved</h2>
          <p className="mt-1 text-sm text-emerald-600">
            Innovation profile for &ldquo;{organisation.name || 'unnamed'}&rdquo; saved.
          </p>
          {profileId && <p className="mt-2 font-mono text-xs text-emerald-500">ID: {profileId}</p>}
          <button onClick={onReset} className="mt-6 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600">
            Build another profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Submit profile</h2>
      <p className="mb-6 text-sm text-gray-500">Save the innovation profile to the repository.</p>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Organisation</span>
            <span className="font-medium">{organisation.name || '(unnamed)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Country</span>
            <span>{organisation.country || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Stage</span>
            <span>{profile.stage || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Theme</span>
            <span className="text-right text-xs">{profile.theme || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Fields needing review</span>
            <span className="text-amber-600">{profile.confidence_flags.length}</span>
          </div>
          {orgId ? (
            <div className="flex justify-between">
              <span className="text-gray-500">Organisation</span>
              <span className="text-xs text-emerald-600">Existing (will link)</span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span className="text-gray-500">Organisation</span>
              <span className="text-xs text-amber-600">New (will be created)</span>
            </div>
          )}
        </div>
      </div>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← Back to edit</button>
        <button onClick={handleSubmit} disabled={saving} className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save to repository'}
        </button>
      </div>
    </div>
  );
}
