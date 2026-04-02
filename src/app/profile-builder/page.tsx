'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  WorkflowStep,
  UploadedFile,
  AssessedFile,
  Innovation,
  Innovator,
  emptyInnovation,
  emptyInnovator,
} from '@/lib/profile-types';

// Legacy type aliases used within this file
type InnovatorProfile = Innovation;
type Organisation = Innovator;
const emptyProfile = emptyInnovation;
const emptyOrganisation = emptyInnovator;
import FileUpload from '@/components/profile-builder/file-upload';
import FileAssessment from '@/components/profile-builder/file-assessment';
import ExtractionStep from '@/components/profile-builder/extraction-step';
import TearSheet, { TearSheetHandle } from '@/components/profile-builder/tear-sheet';
import InvestmentProposition, { InvestmentPropositionHandle } from '@/components/profile-builder/investment-proposition';
import SubmitStep from '@/components/profile-builder/submit-step';
import Repository from '@/components/profile-builder/repository';
import BatchExport from '@/components/profile-builder/batch-export';
import Changelog from '@/components/profile-builder/changelog';
import { smartMergeFull } from '@/lib/profile-merge';
import { uploadDocuments } from '@/lib/upload-documents';

type View = 'new' | 'repository' | 'edit' | 'batch-export';

const STEP_LABELS: Record<number, string> = {
  0: 'Organisation',
  1: 'Upload',
  2: 'Assess',
  3: 'Extract',
  4: 'Review',
  5: 'Submit',
};

export default function ProfileBuilderPage() {
  const [view, setView] = useState<View>('new');
  const [step, setStep] = useState<number>(0);
  const [organisation, setOrganisation] = useState<Organisation>(emptyOrganisation());
  const [orgId, setOrgId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [assessedFiles, setAssessedFiles] = useState<AssessedFile[]>([]);
  const [profile, setProfile] = useState<InnovatorProfile>(emptyProfile());
  const [editId, setEditId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reviewView, setReviewView] = useState<'tear-sheet' | 'investment-proposition'>('tear-sheet');

  const handleReset = useCallback(() => {
    setView('new');
    setStep(0);
    setOrganisation(emptyOrganisation());
    setOrgId(null);
    setUploadedFiles([]);
    setAssessedFiles([]);
    setProfile(emptyProfile());
    setEditId(null);
    setSubmitted(false);
  }, []);

  const handleOrgSelected = useCallback((org: Organisation, id: string | null) => {
    setOrganisation(org);
    setOrgId(id);
    setStep(1);
  }, []);

  const handleFilesUploaded = useCallback((files: UploadedFile[]) => {
    setUploadedFiles(files);
    setStep(2);
  }, []);

  const handleAssessmentComplete = useCallback((files: AssessedFile[]) => {
    setAssessedFiles(files);
    const hasExtract = files.some((f) => f.decision === 'extract');
    if (hasExtract) {
      setStep(3);
    } else {
      // No files to extract — skip to review with empty profile
      setStep(4);
    }
  }, []);

  const handleExtractionComplete = useCallback((extractedOrg: Innovator, extractedInnovation: Innovation) => {
    // If org was pre-selected, merge org data; otherwise use extracted
    if (orgId) {
      setOrganisation((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(extractedOrg).filter(([, v]) => v !== null)) }));
    } else {
      setOrganisation(extractedOrg);
    }
    setProfile(extractedInnovation);
    setStep(4);
  }, [orgId]);

  const handleEditProfile = useCallback((p: InnovatorProfile, org: Organisation, id: string) => {
    setProfile(p);
    setOrganisation(org);
    setOrgId(org.id || null);
    setEditId(id);
    setView('edit');
  }, []);

  const handleNewInnovation = useCallback((org: Organisation) => {
    setOrganisation(org);
    setOrgId(org.id || null);
    setProfile(emptyProfile());
    setStep(1);
    setView('new');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Elimu-Soko</h1>
              <p className="text-sm text-gray-500">Innovator Profile Builder</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5">
              <button
                onClick={() => { if (view !== 'new') handleReset(); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view !== 'repository' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {view === 'edit' ? 'Editing' : 'New Profile'}
              </button>
              <button
                onClick={() => setView('repository')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === 'repository' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Repository
              </button>
              <button
                onClick={() => setView('batch-export')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${view === 'batch-export' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Batch Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* New profile flow */}
      {view === 'new' && (
        <>
          <div className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-3">
              <div className="flex items-center gap-1">
                {([0, 1, 2, 3, 4, 5] as number[]).map((s) => (
                  <div key={s} className="flex items-center">
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s === step ? 'bg-amber-100 text-amber-800' : s < step ? 'bg-gray-100 text-gray-600' : 'text-gray-400'}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${s === step ? 'bg-amber-500 text-white' : s < step ? 'bg-gray-400 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {s < step ? '✓' : s}
                      </span>
                      {STEP_LABELS[s]}
                    </div>
                    {s < 5 && <div className={`mx-1 h-px w-4 ${s < step ? 'bg-gray-400' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <main className="mx-auto max-w-7xl px-6 py-6">
            {step === 0 && <OrgPicker onSelect={handleOrgSelected} />}
            {step === 1 && <FileUpload onComplete={handleFilesUploaded} />}
            {step === 2 && <FileAssessment files={uploadedFiles} onComplete={handleAssessmentComplete} onBack={() => setStep(1)} />}
            {step === 3 && <ExtractionStep files={assessedFiles} onComplete={handleExtractionComplete} onBack={() => setStep(2)} />}
            {step === 4 && (
              <div>
                <div className="mb-4 flex justify-end">
                  <ViewToggle value={reviewView} onChange={setReviewView} />
                </div>
                {reviewView === 'tear-sheet' ? (
                  <TearSheet
                    innovator={organisation}
                    innovation={profile}
                    onUpdateInnovator={setOrganisation}
                    onUpdateInnovation={setProfile}
                    onSubmit={() => setStep(5)}
                    onBack={() => setStep(3)}
                  />
                ) : (
                  <InvestmentProposition
                    innovator={organisation}
                    innovation={profile}
                    onUpdateInnovation={setProfile}
                  />
                )}
              </div>
            )}
            {step === 5 && (
              <SubmitStep
                organisation={organisation}
                orgId={orgId}
                profile={profile}
                files={assessedFiles}
                submitted={submitted}
                onSubmit={(newOrgId) => { setOrgId(newOrgId); setSubmitted(true); }}
                onBack={() => setStep(4)}
                onReset={handleReset}
              />
            )}
          </main>
        </>
      )}

      {view === 'repository' && (
        <main className="mx-auto max-w-7xl px-6 py-6">
          <Repository onEdit={handleEditProfile} onNewInnovation={handleNewInnovation} />
        </main>
      )}

      {view === 'batch-export' && (
        <main>
          <BatchExport />
        </main>
      )}

      {view === 'edit' && editId && (
        <main className="mx-auto max-w-7xl px-6 py-6">
          <EditProfileView
            profile={profile}
            organisation={organisation}
            profileId={editId}
            orgId={orgId}
            onUpdate={setProfile}
            onUpdateOrg={setOrganisation}
            onBack={() => setView('repository')}
          />
        </main>
      )}
    </div>
  );
}

/* ---------- Org Picker ---------- */
function OrgPicker({ onSelect }: { onSelect: (org: Organisation, id: string | null) => void }) {
  const [orgs, setOrgs] = useState<(Organisation & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newOrg, setNewOrg] = useState(emptyOrganisation());
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/org-list')
      .then((r) => r.json())
      .then((d) => setOrgs(d.organisations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = orgs.filter((o) =>
    !search || (o.name || '').toLowerCase().includes(search.toLowerCase()) || (o.country || '').toLowerCase().includes(search.toLowerCase())
  );

  if (creating) {
    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">New organisation</h2>
        <p className="mb-4 text-sm text-gray-500">Enter the organisation details. These can be refined after extraction.</p>
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-6">
          <div>
            <label className="text-xs font-medium text-gray-500">Organisation name</label>
            <input value={newOrg.name || ''} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} placeholder="e.g. T-TEL" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Country</label>
              <input value={newOrg.country || ''} onChange={(e) => setNewOrg({ ...newOrg, country: e.target.value })} placeholder="Ghana" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Founded year</label>
              <input value={newOrg.founded_year || ''} onChange={(e) => setNewOrg({ ...newOrg, founded_year: e.target.value })} placeholder="2020" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Team size</label>
              <input value={newOrg.team_size || ''} onChange={(e) => setNewOrg({ ...newOrg, team_size: e.target.value })} placeholder="25" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">African-led</label>
              <div className="mt-1 flex gap-2">
                {[true, false].map((val) => (
                  <button key={String(val)} onClick={() => setNewOrg({ ...newOrg, african_led: val })} className={`rounded-full px-3 py-1.5 text-xs font-medium ${newOrg.african_led === val ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{val ? 'Yes' : 'No'}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-between">
          <button onClick={() => setCreating(false)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <button onClick={() => onSelect(newOrg, null)} className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600">Continue to upload →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">Select organisation</h2>
      <p className="mb-4 text-sm text-gray-500">Choose an existing organisation or create a new one.</p>

      <div className="mb-3 flex gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search organisations…" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" />
        <button onClick={() => setCreating(true)} className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">+ New org</button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span className="text-sm text-gray-500">Loading…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-8 text-center">
          <p className="text-sm text-gray-400">{search ? 'No matching organisations.' : 'No organisations yet.'}</p>
          <button onClick={() => setCreating(true)} className="mt-2 text-sm text-amber-600 hover:text-amber-700">Create new organisation</button>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((o) => (
            <button
              key={o.id}
              onClick={() => onSelect(o, o.id)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left hover:border-amber-300 hover:bg-amber-50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{o.name || '(unnamed)'}</p>
                <p className="text-xs text-gray-500">{[o.country, o.founded_year ? `est. ${o.founded_year}` : null].filter(Boolean).join(' · ') || '—'}</p>
              </div>
              {o.african_led && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">African-led</span>}
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-gray-400">
        You can also skip this — org details will be extracted from your files.{' '}
        <button onClick={() => onSelect(emptyOrganisation(), null)} className="text-amber-600 underline">Skip →</button>
      </p>
    </div>
  );
}

/* ---------- View Toggle ---------- */
function ViewToggle({ value, onChange }: { value: 'tear-sheet' | 'investment-proposition'; onChange: (v: 'tear-sheet' | 'investment-proposition') => void }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
      {(['tear-sheet', 'investment-proposition'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${value === v ? 'bg-amber-500 text-amber-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {v === 'tear-sheet' ? 'Profile' : 'Investment proposition'}
        </button>
      ))}
    </div>
  );
}

/* ---------- Edit Profile View ---------- */
function EditProfileView({
  profile,
  organisation,
  profileId,
  orgId,
  onUpdate,
  onUpdateOrg,
  onBack,
}: {
  profile: Innovation;
  organisation: Innovator;
  profileId: string;
  orgId: string | null;
  onUpdate: (p: Innovation) => void;
  onUpdateOrg: (o: Innovator) => void;
  onBack: () => void;
}) {
  const tearSheetRef = useRef<TearSheetHandle>(null);
  const ipRef = useRef<InvestmentPropositionHandle>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<'off' | 'select' | 'assess' | 'processing'>('off');
  const [editUploadedFiles, setEditUploadedFiles] = useState<UploadedFile[]>([]);
  const [viewMode, setViewMode] = useState<'tear-sheet' | 'investment-proposition'>('tear-sheet');
  const [mergeResult, setMergeResult] = useState<{ updatedFields: string[]; uploadedFiles: string[]; uploadErrors: string[] } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update org if needed
      if (orgId) {
        await fetch('/api/org-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: orgId, organisation }),
        });
      }
      // Update profile
      const res = await fetch('/api/profile-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: profileId, profile }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (data.changes > 0) {
        console.log(`${data.changes} changelog entries recorded`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEditFilesSelected = (files: UploadedFile[]) => {
    setEditUploadedFiles(files);
    setUploadPhase('assess');
  };

  const handleEditAssessmentComplete = async (assessed: AssessedFile[]) => {
    setUploadPhase('processing');
    try {
      const extractFiles = assessed.filter((f) => f.decision === 'extract');
      let mergedOrg = organisation;
      let mergedProfile = profile;
      let updatedFields: string[] = [];

      // Run Claude extraction only on files marked for extraction
      if (extractFiles.length > 0) {
        const payloads = extractFiles.map((f) => ({ name: f.name, type: f.type, base64: f.base64, textContent: f.textContent }));
        const res = await fetch('/api/profile-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: payloads }),
        });
        if (!res.ok) throw new Error('Extraction failed');
        const { organisation: extOrg, profile: extProfile } = await res.json();

        const normalizedProfile = {
          ...emptyProfile(),
          ...extProfile,
          model_steps: extProfile.model_steps || [],
          evidence_stats: extProfile.evidence_stats || [],
          government_relationships: extProfile.government_relationships || [],
          adoption_pathway_bullets: extProfile.adoption_pathway_bullets || [],
          funding_covers: extProfile.funding_covers || [],
          confidence_flags: extProfile.confidence_flags || [],
          file_updated_fields: [],
        };

        const result = smartMergeFull(
          organisation, profile, extOrg || emptyOrganisation(), normalizedProfile
        );
        mergedOrg = result.mergedOrg;
        mergedProfile = result.mergedProfile;
        updatedFields = result.updatedFields;
      }

      // Upload all non-skipped files (both extract and store) to Storage
      const { docs: newDocs, errors: uploadErrors } = orgId
        ? await uploadDocuments(assessed, orgId)
        : { docs: [], errors: [] };
      const profileWithDocs = {
        ...mergedProfile,
        documents: [...(profile.documents || []), ...newDocs],
      };

      onUpdateOrg(mergedOrg);
      onUpdate(profileWithDocs);
      setMergeResult({ updatedFields, uploadedFiles: newDocs.map((d) => d.name), uploadErrors });
      setUploadPhase('off');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Extraction failed');
      setUploadPhase('off');
    }
  };

  return (
    <div>
      {uploadPhase !== 'off' ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upload additional files</h2>
            <button onClick={() => setUploadPhase('off')} className="text-sm text-gray-500">Cancel</button>
          </div>
          {uploadPhase === 'processing' ? (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="text-sm text-gray-600">Processing files…</p>
            </div>
          ) : uploadPhase === 'assess' ? (
            <FileAssessment files={editUploadedFiles} onComplete={handleEditAssessmentComplete} onBack={() => setUploadPhase('select')} />
          ) : (
            <FileUpload onComplete={handleEditFilesSelected} />
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← Repository</button>
            <div className="flex items-center gap-2">
              <ViewToggle value={viewMode} onChange={setViewMode} />
              <Changelog profileId={profileId} />
              <button onClick={() => viewMode === 'investment-proposition' ? ipRef.current?.exportPdf() : tearSheetRef.current?.exportPdf()} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Export
              </button>
              <button onClick={() => setUploadPhase('select')} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Upload new files
              </button>
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
              </button>
            </div>
          </div>
          {mergeResult && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">Files processed</span>
                <button onClick={() => setMergeResult(null)} className="text-xs text-amber-500 hover:text-amber-700">Dismiss</button>
              </div>
              {mergeResult.updatedFields.length > 0 ? (
                <div className="mb-2">
                  <p className="mb-1 text-xs text-amber-700">{mergeResult.updatedFields.length} field{mergeResult.updatedFields.length !== 1 ? 's' : ''} updated from uploaded files:</p>
                  <div className="flex flex-wrap gap-1">
                    {mergeResult.updatedFields.map((f) => (
                      <span key={f} className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] text-amber-800">{f.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-700">No new information found in the uploaded files.</p>
              )}
              {mergeResult.uploadedFiles.length > 0 && (
                <p className="text-xs text-emerald-700">{mergeResult.uploadedFiles.length} file{mergeResult.uploadedFiles.length !== 1 ? 's' : ''} saved to storage: {mergeResult.uploadedFiles.join(', ')}</p>
              )}
              {mergeResult.uploadErrors.length > 0 && (
                <div className="mt-1">
                  {mergeResult.uploadErrors.map((e, i) => (
                    <p key={i} className="font-mono text-[10px] text-red-600">{e}</p>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[10px] text-amber-500">Click <strong>Save changes</strong> to persist these updates.</p>
            </div>
          )}

          {viewMode === 'tear-sheet' ? (
            <TearSheet
              ref={tearSheetRef}
              innovator={organisation}
              innovation={profile}
              onUpdateInnovator={onUpdateOrg}
              onUpdateInnovation={onUpdate}
              onSubmit={handleSave}
              onBack={onBack}
              hideToolbar
            />
          ) : (
            <InvestmentProposition
              ref={ipRef}
              innovator={organisation}
              innovation={profile}
              onUpdateInnovation={onUpdate}
            />
          )}
        </>
      )}
    </div>
  );
}
