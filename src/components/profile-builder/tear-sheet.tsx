'use client';

import { useCallback, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { FileText, X } from 'lucide-react';
import {
  Innovation,
  Innovator,
  EvidenceStat,
  GovernmentRelationship,
  THEMES,
  STAGES,
  GOV_STATUSES,
  EVIDENCE_STATUSES,
  Theme,
  EvidenceStatus,
} from '@/lib/profile-types';

// ─── Constants ───────────────────────────────────────────────────────────────

const AMBER = '#EF9F27';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  innovator: Innovator;
  innovation: Innovation;
  onUpdateInnovator?: (o: Innovator) => void;
  onUpdateInnovation: (p: Innovation) => void;
  onSubmit: () => void;
  onBack: () => void;
  hideToolbar?: boolean;
  readOnly?: boolean;
}

// ─── Helper: auto-resizing textarea ──────────────────────────────────────────

function AutoTextarea({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; el.style.height = '0'; el.style.height = el.scrollHeight + 'px'; }, [value]);
  return <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={1} className={`w-full resize-none overflow-hidden bg-transparent placeholder:text-stone-300 focus:outline-none ${className || ''}`} />;
}

// ─── Helper: confidence / web / file-updated badges ──────────────────────────

function FieldBadge({ isConfidence, isWebSourced, isFileUpdated }: { isConfidence: boolean; isWebSourced: boolean; isFileUpdated: boolean }) {
  if (!isConfidence && !isWebSourced && !isFileUpdated) return null;
  return (
    <span className="ml-1 inline-flex gap-1">
      {isFileUpdated && <span className="rounded bg-orange-100 px-1 py-0.5 text-[8px] font-medium text-orange-700">Updated</span>}
      {isConfidence && <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-medium text-amber-700">Review</span>}
      {isWebSourced && <span className="rounded bg-blue-100 px-1 py-0.5 text-[8px] font-medium text-blue-700">Web</span>}
    </span>
  );
}

// ─── Helper: field label with optional badges ─────────────────────────────────

function Lbl({ text, field, fl, w, u }: { text: string; field: string; fl: string[]; w: string[]; u: string[] }) {
  if (!text) return null;
  return (
    <div className="mb-1.5 flex items-center">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-500">{text}</span>
      <FieldBadge isConfidence={fl.includes(field)} isWebSourced={w.includes(field)} isFileUpdated={u.includes(field)} />
    </div>
  );
}

// ─── Helper: section heading ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 mb-3">
      {children}
    </h3>
  );
}

// ─── Helper: "needs input" badge ──────────────────────────────────────────────

function NeedsInputBadge() {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide text-white"
      style={{ backgroundColor: AMBER }}
    >
      Needs input
    </span>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<GovernmentRelationship['status'], string> = {
  'Active MOU': 'bg-emerald-500',
  'In pipeline': 'bg-amber-500',
  'Interest only': 'bg-gray-400',
};

const EVIDENCE_STATUS_STYLE: Record<EvidenceStatus, { bg: string; text: string; desc: string }> = {
  Established: { bg: 'bg-emerald-100', text: 'text-emerald-700', desc: 'Credible outcome evidence plus delivery track record' },
  Promising: { bg: 'bg-blue-100', text: 'text-blue-700', desc: 'Positive implementation track record, plausible theory, some supportive evidence' },
  Emerging: { bg: 'bg-amber-100', text: 'text-amber-700', desc: 'Compelling model, early proof of concept, key assumptions still to test' },
};

// ─── TearSheetHandle (exported for parent ref) ────────────────────────────────

export interface TearSheetHandle {
  exportPdf: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const TearSheet = forwardRef<TearSheetHandle, Props>(function TearSheet(
  { innovator, innovation, onUpdateInnovator, onUpdateInnovation, onSubmit, onBack, hideToolbar, readOnly },
  ref
) {
  const org = innovator;
  const p = innovation;
  const fl = p.confidence_flags;
  const w = p.web_augmented_fields;
  const u = p.file_updated_fields;
  const sheetRef = useRef<HTMLDivElement>(null);

  // ── Mutation callbacks ──────────────────────────────────────────────────────
  const set = useCallback((field: string, value: unknown) => { onUpdateInnovation({ ...p, [field]: value }); }, [p, onUpdateInnovation]);
  const setOrg = useCallback((field: string, value: unknown) => { if (onUpdateInnovator) onUpdateInnovator({ ...org, [field]: value }); }, [org, onUpdateInnovator]);
  const updateModelStep = useCallback((i: number, val: string) => { const s = [...p.model_steps]; s[i] = val; onUpdateInnovation({ ...p, model_steps: s }); }, [p, onUpdateInnovation]);
  const addModelStep = useCallback(() => { if (p.model_steps.length < 4) onUpdateInnovation({ ...p, model_steps: [...p.model_steps, ''] }); }, [p, onUpdateInnovation]);
  const updateStat = useCallback((i: number, field: keyof EvidenceStat, val: string) => { const s = [...p.evidence_stats]; s[i] = { ...s[i], [field]: val }; onUpdateInnovation({ ...p, evidence_stats: s }); }, [p, onUpdateInnovation]);
  const addStat = useCallback(() => { if (p.evidence_stats.length < 4) onUpdateInnovation({ ...p, evidence_stats: [...p.evidence_stats, { number: '', label: '', source: '' }] }); }, [p, onUpdateInnovation]);
  const updateGov = useCallback((i: number, field: keyof GovernmentRelationship, val: unknown) => { const r = [...p.government_relationships]; r[i] = { ...r[i], [field]: val } as GovernmentRelationship; onUpdateInnovation({ ...p, government_relationships: r }); }, [p, onUpdateInnovation]);
  const removeGov = useCallback((i: number) => { onUpdateInnovation({ ...p, government_relationships: p.government_relationships.filter((_, idx) => idx !== i) }); }, [p, onUpdateInnovation]);
  const addGov = useCallback(() => { onUpdateInnovation({ ...p, government_relationships: [...p.government_relationships, { country: '', ministry: '', status: 'Interest only' }] }); }, [p, onUpdateInnovation]);

  // ── PDF export (opens print-ready HTML in new window) ─────────────────────
  const handleExport = useCallback(() => {
    const statusLabel = (s: string) => {
      if (s === 'Active MOU') return '#10b981';
      if (s === 'In pipeline') return '#f59e0b';
      return '#9ca3af';
    };

    const evidenceStatusColor = (s: string) => {
      if (s === 'Established') return { bg: '#d1fae5', color: '#065f46' };
      if (s === 'Promising') return { bg: '#dbeafe', color: '#1e40af' };
      return { bg: '#fef3c7', color: '#92400e' };
    };

    const govRows = p.government_relationships.map((g) => {
      const focalTag = g.focal_point ? ' <span style="background:#f59e0b;color:#fff;padding:1px 5px;border-radius:99px;font-size:8px;font-weight:700">FOCAL</span>' : '';
      return `<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusLabel(g.status)};margin-top:4px;flex-shrink:0"></span><div><strong>${g.country}</strong> — ${g.ministry} <span style="color:#888;font-size:11px">(${g.status})</span>${focalTag}</div></div>`;
    }).join('');

    const stepsHtml = p.model_steps.map((s, i) =>
      `<div style="display:flex;gap:8px;margin-bottom:6px"><span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#fef3c7;color:#d97706;font-weight:700;font-size:12px;flex-shrink:0">${i + 1}</span><span style="font-size:13px;color:#374151">${s}</span></div>`
    ).join('');

    const evidenceHtml = p.evidence_stats.map((s) =>
      `<div style="display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid #f3f4f6"><span style="font-size:20px;font-weight:700;color:#d97706;flex-shrink:0">${s.number}</span><div><div style="font-size:12px;color:#374151">${s.label}</div><div style="font-size:10px;color:#9ca3af;margin-top:2px">${s.source}</div></div></div>`
    ).join('');

    const quoteHtml = p.quote ? `<blockquote>"${p.quote}"<br><span class="attr">— ${p.quote_attribution || ''}</span></blockquote>` : '';

    const maturityHtml = (p.maturity_demonstrated || p.maturity_to_validate || p.maturity_outlook) ? `
<div class="section-title">Maturity Assessment</div>
<table style="width:100%;border-collapse:collapse;font-size:12px">
  <tr style="border-bottom:1px solid #e5e7eb"><td style="width:100px;padding:6px 8px;background:#f9fafb;font-size:9px;font-weight:600;text-transform:uppercase;color:#9ca3af">Demonstrated</td><td style="padding:6px 8px;color:#374151">${p.maturity_demonstrated || '—'}</td></tr>
  <tr style="border-bottom:1px solid #e5e7eb"><td style="width:100px;padding:6px 8px;background:#f9fafb;font-size:9px;font-weight:600;text-transform:uppercase;color:#9ca3af">To Validate</td><td style="padding:6px 8px;color:#374151">${p.maturity_to_validate || '—'}</td></tr>
  <tr><td style="width:100px;padding:6px 8px;background:#f9fafb;font-size:9px;font-weight:600;text-transform:uppercase;color:#9ca3af">Outlook</td><td style="padding:6px 8px;color:#374151">${p.maturity_outlook || '—'}</td></tr>
</table>` : '';

    const evStatusBadge = p.evidence_status ? (() => { const c = evidenceStatusColor(p.evidence_status); return `<span class="badge" style="background:${c.bg};color:${c.color}">${p.evidence_status}</span>`; })() : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${org.name || 'Profile'} — Tear Sheet</title>
<style>
  @page { size: A4 portrait; margin: 12mm 15mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #171717; background: #fff; padding: 0; font-size: 13px; line-height: 1.45; }
  h1 { font-size: 20px; font-weight: 700; margin: 0; }
  .section-title { font-size: 11px; font-weight: 700; color: #d97706; text-transform: uppercase; letter-spacing: 0.05em; margin: 14px 0 5px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .four-col { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; }
  .four-col > div { border: 1px solid #e5e7eb; border-left: 3px solid #d97706; border-radius: 4px; padding: 8px; }
  .four-col .val { font-size: 14px; font-weight: 600; }
  .four-col .lbl { font-size: 9px; text-transform: uppercase; color: #9ca3af; font-weight: 600; }
  .ask { border: 2px dashed #d1d5db; border-radius: 6px; padding: 10px; background: #f9fafb; }
  .ask-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
  .ask-grid label { font-size: 9px; font-weight: 600; text-transform: uppercase; color: #9ca3af; }
  .ask-grid p { font-size: 12px; color: #374151; min-height: 20px; }
  blockquote { background: #fffbeb; border-radius: 4px; padding: 8px; margin: 4px 0; font-style: italic; font-size: 12px; color: #374151; }
  blockquote .attr { font-size: 10px; color: #6b7280; font-style: normal; }
  .print-btn { position: fixed; top: 12px; right: 12px; background: #f59e0b; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; z-index: 10; }
  .thesis-box { border: 2px dashed #f59e0b; border-radius: 6px; padding: 10px; background: #fffbeb; margin: 10px 0; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

<!-- Header -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:8px;border-bottom:2px solid #d97706">
  <div>
    <h1>${org.name || '(unnamed)'}</h1>
    ${org.track_record_description ? `<div style="font-size:12px;color:#374151;margin-top:2px">${org.track_record_description}</div>` : ''}
    <div style="display:flex;gap:12px;margin-top:4px;font-size:12px;color:#6b7280">
      ${org.country ? `<span>${org.country}</span>` : ''}
      ${org.founded_year ? `<span>Est. ${org.founded_year}</span>` : ''}
      ${org.team_size ? `<span>Team: ${org.team_size}</span>` : ''}
      ${org.org_type ? `<span>${org.org_type}</span>` : ''}
    </div>
  </div>
  <div style="display:flex;gap:6px;align-items:center">
    ${org.african_led ? '<span class="badge badge-green">African-led</span>' : ''}
    ${p.stage ? `<span class="badge badge-amber">${p.stage}</span>` : ''}
    ${evStatusBadge}
  </div>
</div>

${p.theme ? `<div style="margin-top:8px;font-size:12px;color:#6b7280">Theme: <strong style="color:#374151">${p.theme}</strong></div>` : ''}
${p.name && p.name !== org.name ? `<div style="margin-top:4px;font-size:13px;font-weight:600;color:#374151">${p.name}</div>` : ''}

${p.investment_thesis ? `<div class="thesis-box"><div style="font-size:9px;font-weight:600;text-transform:uppercase;color:#d97706;margin-bottom:4px">Investment Thesis</div><p style="font-size:13px;line-height:1.55">${p.investment_thesis}</p></div>` : ''}

${(p.problem_statement || p.opportunity_statement) ? `
<div class="two-col" style="margin-top:10px">
  <div><div class="section-title" style="margin-top:0">Problem</div><p style="font-size:13px;line-height:1.55">${p.problem_statement || ''}</p></div>
  <div><div class="section-title" style="margin-top:0">Opportunity</div><p style="font-size:13px;line-height:1.55">${p.opportunity_statement || ''}</p></div>
</div>` : ''}

<div class="section-title">How It Works</div>
${stepsHtml}

${p.adoption_pathway_bullets.length > 0 ? `<div class="section-title">Adoption Pathway</div><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.55;color:#374151">${p.adoption_pathway_bullets.map((b: string) => `<li>${b}</li>`).join('')}</ul>` : ''}

${p.pilot_scope ? `<div class="section-title">Pilot Scope</div><p style="font-size:13px;line-height:1.55">${p.pilot_scope}</p>` : ''}

<hr class="divider">

<div class="two-col">
  <div>
    <div class="section-title" style="margin-top:0">Government Relationships</div>
    ${govRows || '<div style="color:#9ca3af;font-size:12px">None</div>'}
    ${quoteHtml ? `<div class="section-title">Quote</div>${quoteHtml}` : ''}
  </div>
  <div>
    <div class="section-title" style="margin-top:0">Evidence</div>
    ${evidenceHtml || '<div style="color:#9ca3af;font-size:12px">None</div>'}
    ${p.evidence_interpretation ? `<div style="margin-top:8px;font-size:12px;color:#374151;font-style:italic">${p.evidence_interpretation}</div>` : ''}
  </div>
</div>

<hr class="divider">

<div class="section-title" style="margin-top:0">Economics</div>
<div class="four-col">
  <div><div class="lbl">Cost / teacher now</div><div class="val">${p.cost_per_teacher_now || '—'}</div></div>
  <div><div class="lbl">Cost / teacher at scale</div><div class="val">${p.cost_per_teacher_scale || '—'}</div></div>
  <div><div class="lbl">Marginal cost at scale</div><div class="val">${p.marginal_cost_at_scale || '—'}</div></div>
  <div><div class="lbl">Funding ask</div><div class="val" style="color:#d97706">${p.funding_ask_base || '—'}${p.funding_ask_duration ? ` · ${p.funding_ask_duration}` : ''}</div></div>
</div>

${maturityHtml}

<div class="section-title">The Ask</div>
<div class="ask">
  <div class="ask-grid">
    <div><label>For funders</label><p>${p.ask_for_funders || ''}</p></div>
    <div><label>For governments</label><p>${p.ask_for_governments || ''}</p></div>
  </div>
</div>

${p.documents && p.documents.length > 0 ? `<div class="section-title">Source Documents</div><div style="font-size:12px">${p.documents.map((d: { name: string; size: number; uploaded_at?: string }) => { const sizeMb = (d.size / (1024 * 1024)).toFixed(1); const date = d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : ''; return `<div style="padding:4px 0;border-bottom:1px solid #f3f4f6;color:#374151">${d.name} <span style="color:#9ca3af">${sizeMb} MB${date ? ` · ${date}` : ''}</span></div>`; }).join('')}</div>` : ''}

</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const w2 = window.open(blobUrl, '_blank');
    if (w2) w2.onload = () => URL.revokeObjectURL(blobUrl);
  }, [org, p]);

  useImperativeHandle(ref, () => ({ exportPdf: handleExport }), [handleExport]);

  // Shared class for plain text inputs
  const inp = 'w-full border-b border-transparent bg-transparent text-sm text-stone-800 placeholder:text-stone-300 focus:border-amber-400 focus:outline-none';

  return (
    <div>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      {!hideToolbar && (
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-700">← Back</button>
          <div className="flex gap-2">
            <button onClick={handleExport} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
              Export
            </button>
            <button onClick={onSubmit} className="rounded-lg px-5 py-2 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: AMBER }}>
              Submit →
            </button>
          </div>
        </div>
      )}

      {/* ── Sheet ────────────────────────────────────────────────────────── */}
      <div className="bg-stone-100 py-10 px-4 -mx-4">
        <article ref={sheetRef} className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">

          {/* ── HEADER: Innovator ──────────────────────────────────────── */}
          <header className="px-8 pt-8 pb-6 border-b border-stone-100">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">Organisation</span>
                {readOnly ? (
                  <h1 className="text-3xl font-bold text-stone-900 tracking-tight leading-tight">{org.name || '(unnamed)'}</h1>
                ) : (
                  <input
                    value={org.name || ''}
                    onChange={(e) => setOrg('name', e.target.value)}
                    placeholder="Organisation name"
                    className="w-full border-b border-transparent bg-transparent text-3xl font-bold text-stone-900 tracking-tight placeholder:text-stone-300 focus:border-amber-400 focus:outline-none"
                  />
                )}
                {readOnly ? (
                  <p className="mt-2 text-stone-600 text-sm leading-relaxed max-w-2xl">
                    {org.track_record_description || ''}
                  </p>
                ) : (
                  <AutoTextarea
                    value={org.track_record_description || ''}
                    onChange={(v) => setOrg('track_record_description', v || null)}
                    placeholder="One sentence on years of operation and existing reach"
                    className="mt-2 text-sm text-stone-600 leading-relaxed border-b border-transparent focus:border-amber-400"
                  />
                )}
                {/* Meta fields */}
                <div className="mt-4">
                  {readOnly ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {org.country && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-stone-300 text-stone-600">{org.country}</span>}
                      {org.founded_year && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-stone-300 text-stone-600">Est. {org.founded_year}</span>}
                      {org.team_size && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-stone-300 text-stone-600">Team: {org.team_size}</span>}
                      {org.org_type && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-stone-300 text-stone-600">{org.org_type}</span>}
                      {org.african_led && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: AMBER }}>African-led</span>}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                      <div>
                        <Lbl text="Country" field="country" fl={fl} w={w} u={u} />
                        <input value={org.country || ''} onChange={(e) => setOrg('country', e.target.value)} placeholder="Country" className={inp} style={{ width: 120 }} />
                      </div>
                      <div>
                        <Lbl text="Founded" field="founded_year" fl={fl} w={w} u={u} />
                        <input value={org.founded_year || ''} onChange={(e) => setOrg('founded_year', e.target.value)} placeholder="Year" className={inp} style={{ width: 80 }} />
                      </div>
                      <div>
                        <Lbl text="Team size" field="team_size" fl={fl} w={w} u={u} />
                        <input value={org.team_size || ''} onChange={(e) => setOrg('team_size', e.target.value)} placeholder="#" className={inp} style={{ width: 80 }} />
                      </div>
                      <div>
                        <Lbl text="African-led" field="african_led" fl={fl} w={w} u={u} />
                        <div className="flex gap-1.5">
                          {[true, false].map((val) => (
                            <button
                              key={String(val)}
                              onClick={() => setOrg('african_led', val)}
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${org.african_led === val ? 'text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                              style={org.african_led === val ? { backgroundColor: AMBER } : undefined}
                            >
                              {val ? 'Yes' : 'No'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Lbl text="Org type" field="org_type" fl={fl} w={w} u={u} />
                        <input value={org.org_type || ''} onChange={(e) => setOrg('org_type', e.target.value || null)} placeholder="e.g. NGO" className={inp} style={{ width: 160 }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stage & Evidence status */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {readOnly ? (
                  <>
                    {p.stage && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: AMBER }}>
                        {p.stage}
                      </span>
                    )}
                    {p.evidence_status && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EVIDENCE_STATUS_STYLE[p.evidence_status].bg} ${EVIDENCE_STATUS_STYLE[p.evidence_status].text}`}>
                        {p.evidence_status}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {org.african_led && (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: AMBER }}>
                        African-led
                      </span>
                    )}
                    <div className="group relative">
                      <select
                        value={p.evidence_status || ''}
                        onChange={(e) => set('evidence_status', (e.target.value as EvidenceStatus) || null)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${p.evidence_status ? `${EVIDENCE_STATUS_STYLE[p.evidence_status].bg} ${EVIDENCE_STATUS_STYLE[p.evidence_status].text}` : 'bg-stone-100 text-stone-500'}`}
                      >
                        <option value="">Evidence status</option>
                        {EVIDENCE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {p.evidence_status && (
                        <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-48 rounded bg-stone-900 px-2.5 py-1.5 text-[10px] text-white shadow-lg group-hover:block">
                          {EVIDENCE_STATUS_STYLE[p.evidence_status].desc}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* ── INNOVATION TITLE & THEME ──────────────────────────────── */}
          <section className="px-8 py-6 bg-stone-50 border-b border-stone-100">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600">Innovation</span>
                <select
                  value={p.theme || ''}
                  onChange={(e) => set('theme', (e.target.value as Theme) || null)}
                  className="rounded bg-white px-2 py-1 text-xs text-stone-700 border border-stone-200"
                >
                  <option value="">Select theme</option>
                  {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {org.african_led && (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: AMBER }}>
                    African-led
                  </span>
                )}
                <div className="relative inline-flex">
                  <span className="pointer-events-none rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800">
                    {p.stage || 'Stage'}
                  </span>
                  <select
                    value={p.stage || ''}
                    onChange={(e) => set('stage', e.target.value || null)}
                    className="absolute inset-0 w-full cursor-pointer opacity-0"
                  >
                    <option value="">Stage</option>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {p.theme && (
              <p className="mt-1 text-xs font-medium uppercase tracking-widest text-stone-500">
                Theme: {p.theme}
              </p>
            )}
            <input
              value={p.name || ''}
              onChange={(e) => set('name', e.target.value || null)}
              placeholder="Innovation name"
              className="mt-2 w-full border-b border-transparent bg-transparent text-2xl font-bold tracking-tight placeholder:text-stone-300 focus:border-amber-400 focus:outline-none"
              style={{ color: AMBER }}
            />
          </section>

          {/* ── INVESTMENT THESIS ─────────────────────────────────────── */}
          <section className="px-8 py-6 border-b border-stone-100">
            <div className="mb-3 flex items-center gap-2">
              <SectionLabel>Investment Thesis</SectionLabel>
              <NeedsInputBadge />
            </div>
            <div className="relative border-2 border-dashed border-stone-300 rounded-lg p-4 bg-stone-50/50">
              <AutoTextarea
                value={p.investment_thesis || ''}
                onChange={(v) => set('investment_thesis', v || null)}
                placeholder="Why is this innovator worth investing in? What makes the timing right?"
                className="text-sm leading-relaxed text-stone-900"
              />
            </div>
          </section>

          {/* ── PROBLEM & OPPORTUNITY ────────────────────────────────── */}
          <section className="px-8 py-6 border-b border-stone-100">
            <div className="grid md:grid-cols-2 gap-8">
              <div
                className={fl.includes('problem_statement') ? 'pl-3' : ''}
                style={fl.includes('problem_statement') ? { borderLeft: `3px solid ${AMBER}` } : undefined}
              >
                <Lbl text="Problem" field="problem_statement" fl={fl} w={w} u={u} />
                <AutoTextarea
                  value={p.problem_statement || ''}
                  onChange={(v) => set('problem_statement', v || null)}
                  placeholder="What core problem does the innovator address?"
                  className="text-sm leading-relaxed text-stone-700"
                />
              </div>
              <div
                className={fl.includes('opportunity_statement') ? 'pl-3' : ''}
                style={fl.includes('opportunity_statement') ? { borderLeft: `3px solid ${AMBER}` } : undefined}
              >
                <Lbl text="Opportunity" field="opportunity_statement" fl={fl} w={w} u={u} />
                <AutoTextarea
                  value={p.opportunity_statement || ''}
                  onChange={(v) => set('opportunity_statement', v || null)}
                  placeholder="What is the opportunity or solution approach?"
                  className="text-sm leading-relaxed text-stone-700"
                />
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
          <section className="px-8 py-6 border-b border-stone-100">
            <Lbl text="How it works" field="model_steps" fl={fl} w={w} u={u} />
            <ol className="mt-2 space-y-4">
              {p.model_steps.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: AMBER }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 pt-0.5">
                    <AutoTextarea
                      value={step}
                      onChange={(v) => updateModelStep(i, v)}
                      placeholder={`Step ${i + 1}`}
                      className="text-sm leading-relaxed text-stone-700"
                    />
                  </div>
                </li>
              ))}
            </ol>
            {p.model_steps.length < 4 && (
              <button
                onClick={addModelStep}
                className="mt-3 flex items-center gap-2 text-[10px] text-stone-400 hover:text-amber-600"
              >
                <span className="w-7 h-7 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center">+</span>
                Add step
              </button>
            )}
          </section>

          {/* ── ADOPTION PATHWAY ──────────────────────────────────────── */}
          <section className="px-8 py-6 border-b border-stone-100">
            <Lbl text="Adoption pathway" field="adoption_pathway_bullets" fl={fl} w={w} u={u} />
            <div className="mt-1 space-y-2">
              {p.adoption_pathway_bullets.map((bullet, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-1 shrink-0" style={{ color: AMBER }}>✓</span>
                  <div className="flex-1">
                    <AutoTextarea
                      value={bullet}
                      onChange={(v) => { const b = [...p.adoption_pathway_bullets]; b[i] = v; set('adoption_pathway_bullets', b); }}
                      placeholder="Bullet point"
                      className="text-sm text-stone-700"
                    />
                  </div>
                  <button
                    onClick={() => { set('adoption_pathway_bullets', p.adoption_pathway_bullets.filter((_, idx) => idx !== i)); }}
                    className="shrink-0 text-xs text-stone-300 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {p.adoption_pathway_bullets.length < 5 && (
                <button
                  onClick={() => set('adoption_pathway_bullets', [...p.adoption_pathway_bullets, ''])}
                  className="text-[10px] text-amber-600 hover:text-amber-700"
                >
                  + Add bullet
                </button>
              )}
            </div>
          </section>

          {/* ── PILOT SCOPE ───────────────────────────────────────────── */}
          <section className="px-8 py-6 border-b border-stone-100">
            <Lbl text="Pilot scope" field="pilot_scope" fl={fl} w={w} u={u} />
            <AutoTextarea
              value={p.pilot_scope || ''}
              onChange={(v) => set('pilot_scope', v || null)}
              placeholder="Geography, size, and timeline of pilot"
              className="text-sm leading-relaxed text-stone-700"
            />
          </section>

          {/* ── GOVERNMENT RELATIONSHIPS + EVIDENCE ──────────────────── */}
          <section className="px-8 py-6 border-b border-stone-100">
            <div className="flex flex-col md:flex-row">
              {/* Government relationships */}
              <div className="flex-1 pr-0 md:pr-8 pb-6 md:pb-0 border-b md:border-b-0 md:border-r border-stone-200">
                <Lbl text="Government relationships" field="government_relationships" fl={fl} w={w} u={u} />
                <div className="mt-1 space-y-1.5">
                  {p.government_relationships.map((g, i) => {
                    const isFocal = g.focal_point === true;
                    return (
                      <div key={i} className={`flex items-start gap-2 rounded p-1.5 ${isFocal ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-stone-50'}`}>
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[g.status]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <input
                              value={g.country}
                              onChange={(e) => updateGov(i, 'country', e.target.value)}
                              placeholder="Country"
                              className="w-20 shrink-0 bg-transparent text-xs font-medium text-stone-800 placeholder:text-stone-300 focus:outline-none"
                            />
                            <select
                              value={g.status}
                              onChange={(e) => updateGov(i, 'status', e.target.value)}
                              className="shrink-0 rounded bg-white px-1 py-0.5 text-[10px] text-stone-600 border border-stone-200"
                            >
                              {GOV_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button
                              onClick={() => updateGov(i, 'focal_point', !isFocal)}
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${isFocal ? 'text-white' : 'bg-stone-200 text-stone-500 hover:bg-amber-200'}`}
                              style={isFocal ? { backgroundColor: AMBER } : undefined}
                            >
                              Focal
                            </button>
                            <button onClick={() => removeGov(i)} className="shrink-0 text-xs text-stone-300 hover:text-red-400">✕</button>
                          </div>
                          <AutoTextarea
                            value={g.ministry}
                            onChange={(v) => updateGov(i, 'ministry', v)}
                            placeholder="Ministry name"
                            className="mt-0.5 text-[11px] text-stone-600 placeholder:text-stone-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={addGov} className="text-[10px] text-amber-600 hover:text-amber-700">+ Add relationship</button>
                </div>

                {/* Quote */}
                <div className="mt-4">
                  <Lbl text="Quote" field="quote" fl={fl} w={w} u={u} />
                  <div className="rounded bg-amber-50 p-2.5">
                    <AutoTextarea
                      value={p.quote || ''}
                      onChange={(v) => set('quote', v || null)}
                      placeholder="Direct quote from government official or teacher…"
                      className="text-xs italic leading-relaxed text-stone-700"
                    />
                    <input
                      value={p.quote_attribution || ''}
                      onChange={(e) => set('quote_attribution', e.target.value || null)}
                      placeholder="— Attribution"
                      className="mt-1 w-full bg-transparent text-[10px] text-stone-500 placeholder:text-stone-300 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Evidence */}
              <div className="flex-1 pl-0 md:pl-8 pt-6 md:pt-0">
                <Lbl text="Evidence" field="evidence_stats" fl={fl} w={w} u={u} />
                <div className="mt-1 space-y-4">
                  {p.evidence_stats.map((stat, i) => (
                    <div key={i} className="pl-4" style={{ borderLeft: `3px solid ${AMBER}` }}>
                      <input
                        value={stat.number}
                        onChange={(e) => updateStat(i, 'number', e.target.value)}
                        placeholder="0"
                        className="w-20 bg-transparent text-2xl font-bold focus:outline-none"
                        style={{ color: AMBER }}
                      />
                      <AutoTextarea
                        value={stat.label}
                        onChange={(v) => updateStat(i, 'label', v)}
                        placeholder="Description"
                        className="text-sm leading-snug text-stone-700"
                      />
                      <AutoTextarea
                        value={stat.source}
                        onChange={(v) => updateStat(i, 'source', v)}
                        placeholder="Source"
                        className="mt-0.5 text-xs text-stone-400"
                      />
                    </div>
                  ))}
                  {p.evidence_stats.length < 4 && (
                    <button
                      onClick={addStat}
                      className="w-full rounded border border-dashed border-stone-300 py-2 text-[10px] text-stone-400 hover:border-amber-300 hover:text-amber-600"
                    >
                      + Add evidence
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── ECONOMICS ─────────────────────────────────────────────── */}
          <section className="px-8 py-6 border-b border-stone-100">
            <SectionLabel>Economics</SectionLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="pl-4" style={{ borderLeft: `3px solid ${AMBER}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">Cost / Teacher Now</p>
                <input
                  value={p.cost_per_teacher_now || ''}
                  onChange={(e) => set('cost_per_teacher_now', e.target.value || null)}
                  placeholder="$0"
                  className="w-full bg-transparent text-xl font-bold text-stone-900 focus:outline-none"
                />
              </div>
              <div className="pl-4" style={{ borderLeft: `3px solid ${AMBER}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">Cost / Teacher at Scale</p>
                <input
                  value={p.cost_per_teacher_scale || ''}
                  onChange={(e) => set('cost_per_teacher_scale', e.target.value || null)}
                  placeholder="$0"
                  className="w-full bg-transparent text-xl font-bold text-stone-900 focus:outline-none"
                />
              </div>
              <div className="pl-4" style={{ borderLeft: `3px solid ${AMBER}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">Marginal Cost at Scale</p>
                <input
                  value={p.marginal_cost_at_scale || ''}
                  onChange={(e) => set('marginal_cost_at_scale', e.target.value || null)}
                  placeholder="$0"
                  className="w-full bg-transparent text-sm font-medium text-stone-700 focus:outline-none"
                />
              </div>
              <div className="pl-4" style={{ borderLeft: `3px solid ${AMBER}` }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">Funding Ask</p>
                <input
                  value={p.funding_ask_base || ''}
                  onChange={(e) => set('funding_ask_base', e.target.value || null)}
                  placeholder="$0"
                  className="w-full bg-transparent text-xl font-bold text-stone-900 focus:outline-none"
                />
                <input
                  value={p.funding_ask_duration || ''}
                  onChange={(e) => set('funding_ask_duration', e.target.value || null)}
                  placeholder="Duration (e.g. 12-month)"
                  className="mt-0.5 w-full bg-transparent text-xs text-stone-500 placeholder:text-stone-300 focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* ── MATURITY ASSESSMENT ───────────────────────────────────── */}
          <section className="px-8 py-6 border-b border-stone-100">
            <SectionLabel>Maturity Assessment</SectionLabel>
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <div className="flex">
                <div className="w-36 shrink-0 bg-stone-100 px-4 py-3 border-r border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Demonstrated</span>
                </div>
                <div className="flex-1 px-4 py-3 bg-white">
                  <AutoTextarea
                    value={p.maturity_demonstrated || ''}
                    onChange={(v) => set('maturity_demonstrated', v || null)}
                    placeholder="What has already been proven"
                    className="text-sm text-stone-700"
                  />
                </div>
              </div>
              <div className="flex border-t border-stone-200">
                <div className="w-36 shrink-0 bg-stone-100 px-4 py-3 border-r border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">To Validate</span>
                  <span className="ml-1 text-red-400 text-[10px]">*</span>
                </div>
                <div className="flex-1 px-4 py-3 bg-white">
                  <div className="relative border-2 border-dashed border-stone-300 rounded-lg p-3 bg-stone-50/50">
                    <div className="absolute -top-2.5 left-3"><NeedsInputBadge /></div>
                    <AutoTextarea
                      value={p.maturity_to_validate || ''}
                      onChange={(v) => set('maturity_to_validate', v || null)}
                      placeholder="Human input required"
                      className="mt-2 text-sm text-stone-800"
                    />
                  </div>
                </div>
              </div>
              <div className="flex border-t border-stone-200">
                <div className="w-36 shrink-0 bg-stone-100 px-4 py-3 border-r border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Outlook</span>
                  <span className="ml-1 text-red-400 text-[10px]">*</span>
                </div>
                <div className="flex-1 px-4 py-3 bg-white">
                  <div className="relative border-2 border-dashed border-stone-300 rounded-lg p-3 bg-stone-50/50">
                    <div className="absolute -top-2.5 left-3"><NeedsInputBadge /></div>
                    <AutoTextarea
                      value={p.maturity_outlook || ''}
                      onChange={(v) => set('maturity_outlook', v || null)}
                      placeholder="Human input required"
                      className="mt-2 text-sm text-stone-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── THE ASK ───────────────────────────────────────────────── */}
          <section className="px-8 py-6 border-b border-stone-100">
            <SectionLabel>The Ask</SectionLabel>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">
                  For Funders <span className="text-red-400">*</span>
                </p>
                <div className="relative border-2 border-dashed border-stone-300 rounded-lg p-4 bg-stone-50/50">
                  <div className="absolute -top-2.5 left-3"><NeedsInputBadge /></div>
                  <AutoTextarea
                    value={p.ask_for_funders || ''}
                    onChange={(v) => set('ask_for_funders', v || null)}
                    placeholder="Human input required"
                    className="mt-2 text-sm text-stone-800"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">
                  For Governments <span className="text-red-400">*</span>
                </p>
                <div className="relative border-2 border-dashed border-stone-300 rounded-lg p-4 bg-stone-50/50">
                  <div className="absolute -top-2.5 left-3"><NeedsInputBadge /></div>
                  <AutoTextarea
                    value={p.ask_for_governments || ''}
                    onChange={(v) => set('ask_for_governments', v || null)}
                    placeholder="Human input required"
                    className="mt-2 text-sm text-stone-800"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── SOURCE DOCUMENTS ──────────────────────────────────────── */}
          {p.documents && p.documents.length > 0 && (
            <section className="px-8 py-6">
              <SectionLabel>Source Documents</SectionLabel>
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Document</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Type</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Size</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">Uploaded</th>
                      <th className="w-12 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {p.documents.map((doc, i) => {
                      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/innovation-documents/${doc.path}`;
                      const sizeMb = (doc.size / (1024 * 1024)).toFixed(1);
                      const uploadDate = doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '';
                      return (
                        <tr
                          key={i}
                          className={`${i !== p.documents.length - 1 ? 'border-b border-stone-100' : ''} hover:bg-stone-50/50 transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-stone-700 hover:text-stone-900 transition-colors"
                            >
                              <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                              <span className="truncate max-w-[200px] font-medium">{doc.name}</span>
                            </a>
                          </td>
                          <td className="px-4 py-3 text-stone-500">{doc.type}</td>
                          <td className="px-4 py-3 text-stone-500">{sizeMb} MB</td>
                          <td className="px-4 py-3 text-stone-500">{uploadDate}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => set('documents', p.documents.filter((_: unknown, idx: number) => idx !== i))}
                              className="p-1.5 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              aria-label={`Delete ${doc.name}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </article>
      </div>
    </div>
  );
});

export default TearSheet;
