'use client';

import { useCallback, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
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

function AutoTextarea({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; el.style.height = '0'; el.style.height = el.scrollHeight + 'px'; }, [value]);
  return <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={1} className={`w-full resize-none overflow-hidden bg-transparent placeholder:text-gray-300 focus:outline-none ${className || ''}`} />;
}

function Badge({ isConfidence, isWebSourced, isFileUpdated }: { isConfidence: boolean; isWebSourced: boolean; isFileUpdated: boolean }) {
  if (!isConfidence && !isWebSourced && !isFileUpdated) return null;
  return (
    <span className="ml-1 inline-flex gap-1">
      {isFileUpdated && <span className="rounded bg-orange-100 px-1 py-0.5 text-[8px] font-medium text-orange-700">Updated</span>}
      {isConfidence && <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-medium text-amber-700">Review</span>}
      {isWebSourced && <span className="rounded bg-blue-100 px-1 py-0.5 text-[8px] font-medium text-blue-700">Web</span>}
    </span>
  );
}

function Lbl({ text, field, fl, w, u }: { text: string; field: string; fl: string[]; w: string[]; u: string[] }) {
  if (!text) return null;
  return (
    <div className="mb-0.5 flex items-center">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">{text}</span>
      <Badge isConfidence={fl.includes(field)} isWebSourced={w.includes(field)} isFileUpdated={u.includes(field)} />
    </div>
  );
}

const STATUS_DOT: Record<GovernmentRelationship['status'], string> = {
  'Active MOU': 'bg-emerald-500', 'In pipeline': 'bg-amber-500', 'Interest only': 'bg-gray-400',
};

const EVIDENCE_STATUS_STYLE: Record<EvidenceStatus, { bg: string; text: string; desc: string }> = {
  'Established': { bg: 'bg-emerald-100', text: 'text-emerald-700', desc: 'Credible outcome evidence plus delivery track record' },
  'Promising': { bg: 'bg-blue-100', text: 'text-blue-700', desc: 'Positive implementation track record, plausible theory, some supportive evidence' },
  'Emerging': { bg: 'bg-amber-100', text: 'text-amber-700', desc: 'Compelling model, early proof of concept, key assumptions still to test' },
};

export interface TearSheetHandle {
  exportPdf: () => void;
}

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

  const set = useCallback((field: string, value: unknown) => { onUpdateInnovation({ ...p, [field]: value }); }, [p, onUpdateInnovation]);
  const setOrg = useCallback((field: string, value: unknown) => { if (onUpdateInnovator) onUpdateInnovator({ ...org, [field]: value }); }, [org, onUpdateInnovator]);
  const updateModelStep = useCallback((i: number, val: string) => { const s = [...p.model_steps]; s[i] = val; onUpdateInnovation({ ...p, model_steps: s }); }, [p, onUpdateInnovation]);
  const addModelStep = useCallback(() => { if (p.model_steps.length < 4) onUpdateInnovation({ ...p, model_steps: [...p.model_steps, ''] }); }, [p, onUpdateInnovation]);
  const updateStat = useCallback((i: number, field: keyof EvidenceStat, val: string) => { const s = [...p.evidence_stats]; s[i] = { ...s[i], [field]: val }; onUpdateInnovation({ ...p, evidence_stats: s }); }, [p, onUpdateInnovation]);
  const addStat = useCallback(() => { if (p.evidence_stats.length < 4) onUpdateInnovation({ ...p, evidence_stats: [...p.evidence_stats, { number: '', label: '', source: '' }] }); }, [p, onUpdateInnovation]);
  const updateGov = useCallback((i: number, field: keyof GovernmentRelationship, val: unknown) => { const r = [...p.government_relationships]; r[i] = { ...r[i], [field]: val } as GovernmentRelationship; onUpdateInnovation({ ...p, government_relationships: r }); }, [p, onUpdateInnovation]);
  const removeGov = useCallback((i: number) => { onUpdateInnovation({ ...p, government_relationships: p.government_relationships.filter((_, idx) => idx !== i) }); }, [p, onUpdateInnovation]);
  const addGov = useCallback(() => { onUpdateInnovation({ ...p, government_relationships: [...p.government_relationships, { country: '', ministry: '', status: 'Interest only' }] }); }, [p, onUpdateInnovation]);

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

  const inp = 'w-full border-b border-transparent bg-transparent text-sm text-gray-800 placeholder:text-gray-300 focus:border-amber-400 focus:outline-none';

  return (
    <div>
      {!hideToolbar && (
        <div className="mb-4 flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <div className="flex gap-2">
            <button onClick={handleExport} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Export
            </button>
            <button onClick={onSubmit} className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600">Submit →</button>
          </div>
        </div>
      )}

      <div ref={sheetRef} className="space-y-4">
        {/* INNOVATOR CARD */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-3">
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Organisation</span>
              {readOnly ? (
                <p className="text-lg font-bold text-gray-900">{org.name || '(unnamed)'}</p>
              ) : (
                <input value={org.name || ''} onChange={(e) => setOrg('name', e.target.value)} placeholder="Organisation name" className="w-full border-b border-transparent bg-transparent text-lg font-bold text-gray-900 placeholder:text-gray-300 focus:border-amber-400 focus:outline-none" />
              )}
              {(org.org_type || org.founded_year || org.track_record_description) && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {[org.org_type, org.founded_year ? `Est. ${org.founded_year}` : null, org.track_record_description].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-2">
              {org.african_led && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">African-led</span>}
              <div className="group relative">
                <select value={p.evidence_status || ''} onChange={(e) => set('evidence_status', (e.target.value as EvidenceStatus) || null)} className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${p.evidence_status ? `${EVIDENCE_STATUS_STYLE[p.evidence_status].bg} ${EVIDENCE_STATUS_STYLE[p.evidence_status].text}` : 'bg-gray-100 text-gray-500'}`}>
                  <option value="">Evidence status</option>
                  {EVIDENCE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {p.evidence_status && (
                  <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-48 rounded bg-gray-900 px-2.5 py-1.5 text-[10px] text-white shadow-lg group-hover:block">
                    {EVIDENCE_STATUS_STYLE[p.evidence_status].desc}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <Lbl text="Country" field="country" fl={fl} w={w} u={u} />
                {readOnly ? <p className="text-sm text-gray-800">{org.country || '—'}</p> : <input value={org.country || ''} onChange={(e) => setOrg('country', e.target.value)} placeholder="Country" className={inp} style={{ width: 120 }} />}
              </div>
              <div>
                <Lbl text="Founded" field="founded_year" fl={fl} w={w} u={u} />
                {readOnly ? <p className="text-sm text-gray-800">{org.founded_year || '—'}</p> : <input value={org.founded_year || ''} onChange={(e) => setOrg('founded_year', e.target.value)} placeholder="Year" className={inp} style={{ width: 80 }} />}
              </div>
              <div>
                <Lbl text="Team size" field="team_size" fl={fl} w={w} u={u} />
                {readOnly ? <p className="text-sm text-gray-800">{org.team_size || '—'}</p> : <input value={org.team_size || ''} onChange={(e) => setOrg('team_size', e.target.value)} placeholder="#" className={inp} style={{ width: 80 }} />}
              </div>
              {!readOnly && (
                <div>
                  <Lbl text="African-led" field="african_led" fl={fl} w={w} u={u} />
                  <div className="flex gap-1.5">
                    {[true, false].map((val) => (
                      <button key={String(val)} onClick={() => setOrg('african_led', val)} className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${org.african_led === val ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{val ? 'Yes' : 'No'}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Lbl text="Org type" field="org_type" fl={fl} w={w} u={u} />
                {readOnly ? <p className="text-sm text-gray-800">{org.org_type || '—'}</p> : <input value={org.org_type || ''} onChange={(e) => setOrg('org_type', e.target.value || null)} placeholder="e.g. NGO" className={inp} style={{ width: 160 }} />}
              </div>
            </div>
            {!readOnly && (
              <div className="mt-3">
                <Lbl text="Track record" field="track_record_description" fl={fl} w={w} u={u} />
                <AutoTextarea value={org.track_record_description || ''} onChange={(v) => setOrg('track_record_description', v || null)} placeholder="One sentence on years of operation and existing reach" className="text-sm text-gray-800 border-b border-transparent focus:border-amber-400" />
              </div>
            )}
          </div>
        </div>

        {/* INNOVATION CARD */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-amber-50 px-6 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600">Innovation</span>
                <select value={p.theme || ''} onChange={(e) => set('theme', (e.target.value as Theme) || null)} className="rounded bg-white px-2 py-1 text-xs text-gray-700 border border-gray-200">
                  <option value="">Select theme</option>
                  {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {org.african_led && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">African-led</span>}
                <div className="relative inline-flex">
                  <span className="pointer-events-none rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-teal-800">
                    {p.stage || 'Stage'}
                  </span>
                  <select value={p.stage || ''} onChange={(e) => set('stage', e.target.value || null)} className="absolute inset-0 w-full cursor-pointer opacity-0">
                    <option value="">Stage</option>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <input value={p.name || ''} onChange={(e) => set('name', e.target.value || null)} placeholder="Innovation name" className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm font-semibold text-gray-900 placeholder:text-gray-300 focus:border-amber-400 focus:outline-none" />
          </div>

          <div className="px-6 py-4 space-y-5">
            {/* Investment thesis */}
            <div className="rounded border-l-4 border-amber-400 bg-amber-50 py-3 pl-3 pr-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600">Investment Thesis</span>
                <span className="text-[9px] font-medium text-red-500">Requires human input</span>
              </div>
              <AutoTextarea value={p.investment_thesis || ''} onChange={(v) => set('investment_thesis', v || null)} placeholder="Why is this innovator worth investing in? What makes the timing right?" className="text-sm leading-relaxed text-gray-900 border-b border-transparent focus:border-amber-400" />
            </div>

            {/* Problem + Opportunity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Lbl text="Problem statement" field="problem_statement" fl={fl} w={w} u={u} />
                <AutoTextarea value={p.problem_statement || ''} onChange={(v) => set('problem_statement', v || null)} placeholder="What core problem does the innovator address?" className="text-sm leading-relaxed text-gray-900 border-b border-transparent focus:border-amber-400" />
              </div>
              <div>
                <Lbl text="Opportunity statement" field="opportunity_statement" fl={fl} w={w} u={u} />
                <AutoTextarea value={p.opportunity_statement || ''} onChange={(v) => set('opportunity_statement', v || null)} placeholder="What is the opportunity or solution approach?" className="text-sm leading-relaxed text-gray-900 border-b border-transparent focus:border-amber-400" />
              </div>
            </div>

            {/* How it works */}
            <div>
              <Lbl text="How it works" field="model_steps" fl={fl} w={w} u={u} />
              <div className="grid grid-cols-4 gap-2">
                {p.model_steps.map((step, i) => (
                  <div key={i} className="relative rounded border border-gray-200 bg-gray-50 p-2">
                    <span className="text-[9px] font-bold text-amber-600">{i + 1}</span>
                    {i < p.model_steps.length - 1 && <span className="absolute -right-3 top-1/2 z-10 text-xs text-gray-300">→</span>}
                    <AutoTextarea value={step} onChange={(v) => updateModelStep(i, v)} placeholder={`Step ${i + 1}`} className="text-xs leading-snug text-gray-700" />
                  </div>
                ))}
                {p.model_steps.length < 4 && (
                  <button onClick={addModelStep} className="flex items-center justify-center rounded border border-dashed border-gray-300 py-6 text-[10px] text-gray-400 hover:border-amber-300 hover:text-amber-600">+ Step</button>
                )}
              </div>
            </div>

            {/* Adoption pathway */}
            <div>
              <Lbl text="Adoption pathway" field="adoption_pathway_bullets" fl={fl} w={w} u={u} />
              <div className="space-y-1">
                {p.adoption_pathway_bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <AutoTextarea value={bullet} onChange={(v) => { const b = [...p.adoption_pathway_bullets]; b[i] = v; set('adoption_pathway_bullets', b); }} placeholder="Bullet point" className="text-sm text-gray-700" />
                    <button onClick={() => { set('adoption_pathway_bullets', p.adoption_pathway_bullets.filter((_, idx) => idx !== i)); }} className="shrink-0 text-xs text-gray-300 hover:text-red-400">✕</button>
                  </div>
                ))}
                {p.adoption_pathway_bullets.length < 5 && (
                  <button onClick={() => set('adoption_pathway_bullets', [...p.adoption_pathway_bullets, ''])} className="text-[10px] text-amber-600 hover:text-amber-700">+ Add bullet</button>
                )}
              </div>
            </div>

            {/* Pilot scope */}
            <div>
              <Lbl text="Pilot scope" field="pilot_scope" fl={fl} w={w} u={u} />
              <AutoTextarea value={p.pilot_scope || ''} onChange={(v) => set('pilot_scope', v || null)} placeholder="Geography, size, and timeline of pilot" className="text-sm leading-relaxed text-gray-900 border-b border-transparent focus:border-amber-400" />
            </div>

            {/* Two-column: left = gov + quote, right = evidence + economics */}
            <div className="grid gap-6" style={{ gridTemplateColumns: '280px 1fr' }}>
              <div className="space-y-4">
                {/* Government relationships */}
                <div>
                  <Lbl text="Government relationships" field="government_relationships" fl={fl} w={w} u={u} />
                  <div className="space-y-1.5">
                    {p.government_relationships.map((g, i) => {
                      const isFocal = g.focal_point === true;
                      return (
                        <div key={i} className={`flex items-start gap-2 rounded p-1.5 ${isFocal ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-gray-50'}`}>
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[g.status]}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <input value={g.country} onChange={(e) => updateGov(i, 'country', e.target.value)} placeholder="Country" className="w-20 shrink-0 bg-transparent text-xs font-medium text-gray-800 placeholder:text-gray-300 focus:outline-none" />
                              <select value={g.status} onChange={(e) => updateGov(i, 'status', e.target.value)} className="shrink-0 rounded bg-white px-1 py-0.5 text-[10px] text-gray-600 border border-gray-200">
                                {GOV_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={() => updateGov(i, 'focal_point', !isFocal)} className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${isFocal ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-amber-200'}`}>Focal</button>
                              <button onClick={() => removeGov(i)} className="shrink-0 text-xs text-gray-300 hover:text-red-400">✕</button>
                            </div>
                            <AutoTextarea value={g.ministry} onChange={(v) => updateGov(i, 'ministry', v)} placeholder="Ministry name" className="mt-0.5 text-[11px] text-gray-600 placeholder:text-gray-300" />
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={addGov} className="text-[10px] text-amber-600 hover:text-amber-700">+ Add relationship</button>
                  </div>
                </div>

                {/* Quote */}
                <div>
                  <Lbl text="Quote" field="quote" fl={fl} w={w} u={u} />
                  <div className="rounded bg-amber-50 p-2.5">
                    <AutoTextarea value={p.quote || ''} onChange={(v) => set('quote', v || null)} placeholder="Direct quote from government official or teacher…" className="text-xs italic leading-relaxed text-gray-700" />
                    <input value={p.quote_attribution || ''} onChange={(e) => set('quote_attribution', e.target.value || null)} placeholder="— Attribution" className="mt-1 w-full bg-transparent text-[10px] text-gray-500 placeholder:text-gray-300 focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Evidence */}
                <div>
                  <Lbl text="Evidence" field="evidence_stats" fl={fl} w={w} u={u} />
                  <div className="space-y-2">
                    {p.evidence_stats.map((stat, i) => (
                      <div key={i} className="rounded border border-gray-200 bg-white p-2.5">
                        <div className="flex items-baseline gap-2">
                          <input value={stat.number} onChange={(e) => updateStat(i, 'number', e.target.value)} placeholder="0" className="w-20 shrink-0 bg-transparent text-lg font-bold text-amber-600 focus:outline-none" />
                          <AutoTextarea value={stat.label} onChange={(v) => updateStat(i, 'label', v)} placeholder="Description" className="text-xs leading-snug text-gray-700" />
                        </div>
                        <AutoTextarea value={stat.source} onChange={(v) => updateStat(i, 'source', v)} placeholder="Source" className="mt-0.5 text-[10px] text-gray-400" />
                      </div>
                    ))}
                    {p.evidence_stats.length < 4 && (
                      <button onClick={addStat} className="w-full rounded border border-dashed border-gray-300 py-2 text-[10px] text-gray-400 hover:border-amber-300 hover:text-amber-600">+ Add evidence</button>
                    )}
                  </div>
                </div>

                {/* Economics */}
                <div>
                  <Lbl text="Economics" field="cost_per_teacher_now" fl={fl} w={w} u={u} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded border p-2 border-l-2 border-l-amber-400 ${fl.includes('cost_per_teacher_now') ? 'border-amber-300' : 'border-gray-200'}`}>
                      <span className="text-[9px] font-semibold uppercase text-gray-400">Cost/teacher now</span>
                      <input value={p.cost_per_teacher_now || ''} onChange={(e) => set('cost_per_teacher_now', e.target.value || null)} placeholder="$0" className="w-full bg-transparent text-sm font-medium text-gray-800 focus:outline-none" />
                    </div>
                    <div className={`rounded border p-2 border-l-2 border-l-amber-400 ${fl.includes('cost_per_teacher_scale') ? 'border-amber-300' : 'border-gray-200'}`}>
                      <span className="text-[9px] font-semibold uppercase text-gray-400">Cost/teacher at scale</span>
                      <input value={p.cost_per_teacher_scale || ''} onChange={(e) => set('cost_per_teacher_scale', e.target.value || null)} placeholder="$0" className="w-full bg-transparent text-sm font-medium text-gray-800 focus:outline-none" />
                    </div>
                    <div className={`rounded border p-2 border-l-2 border-l-amber-400 ${fl.includes('marginal_cost_at_scale') ? 'border-amber-300' : 'border-gray-200'}`}>
                      <span className="text-[9px] font-semibold uppercase text-gray-400">Marginal cost at scale</span>
                      <input value={p.marginal_cost_at_scale || ''} onChange={(e) => set('marginal_cost_at_scale', e.target.value || null)} placeholder="$0" className="w-full bg-transparent text-sm font-medium text-gray-800 focus:outline-none" />
                    </div>
                    <div className={`rounded border p-2 border-l-2 border-l-amber-400 ${fl.includes('funding_ask_base') ? 'border-amber-300' : 'border-gray-200'}`}>
                      <span className="text-[9px] font-semibold uppercase text-gray-400">Funding ask</span>
                      <input value={p.funding_ask_base || ''} onChange={(e) => set('funding_ask_base', e.target.value || null)} placeholder="$0" className="w-full bg-transparent text-sm font-medium text-amber-600 focus:outline-none" />
                      <input value={p.funding_ask_duration || ''} onChange={(e) => set('funding_ask_duration', e.target.value || null)} placeholder="Duration (e.g. 12-month)" className="mt-0.5 w-full bg-transparent text-[10px] text-gray-400 placeholder:text-gray-200 focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Maturity assessment */}
            <div>
              <Lbl text="Maturity assessment" field="maturity_demonstrated" fl={fl} w={w} u={u} />
              <div className="rounded border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="w-28 bg-gray-50 px-3 py-2 text-[9px] font-semibold uppercase text-gray-400">Demonstrated</td>
                      <td className="px-3 py-2">
                        <AutoTextarea value={p.maturity_demonstrated || ''} onChange={(v) => set('maturity_demonstrated', v || null)} placeholder="What has already been proven" className="text-gray-800" />
                      </td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="bg-gray-50 px-3 py-2 text-[9px] font-semibold uppercase text-gray-400">To validate<span className="ml-1 text-red-400">*</span></td>
                      <td className="px-3 py-2">
                        <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5">
                          <AutoTextarea value={p.maturity_to_validate || ''} onChange={(v) => set('maturity_to_validate', v || null)} placeholder="Human input required" className="text-sm text-gray-800" />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-gray-50 px-3 py-2 text-[9px] font-semibold uppercase text-gray-400">Outlook<span className="ml-1 text-red-400">*</span></td>
                      <td className="px-3 py-2">
                        <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5">
                          <AutoTextarea value={p.maturity_outlook || ''} onChange={(v) => set('maturity_outlook', v || null)} placeholder="Human input required" className="text-sm text-gray-800" />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* The Ask */}
            <div>
              <Lbl text="The ask" field="ask_for_funders" fl={fl} w={w} u={u} />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-3">
                  <span className="text-[9px] font-semibold uppercase text-gray-400">For funders<span className="ml-1 text-red-400">*</span></span>
                  <AutoTextarea value={p.ask_for_funders || ''} onChange={(v) => set('ask_for_funders', v || null)} placeholder="Human input required" className={`mt-1 text-sm text-gray-800 ${fl.includes('ask_for_funders') && !p.ask_for_funders ? 'italic text-gray-400' : ''}`} />
                </div>
                <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-3">
                  <span className="text-[9px] font-semibold uppercase text-gray-400">For governments<span className="ml-1 text-red-400">*</span></span>
                  <AutoTextarea value={p.ask_for_governments || ''} onChange={(v) => set('ask_for_governments', v || null)} placeholder="Human input required" className={`mt-1 text-sm text-gray-800 ${fl.includes('ask_for_governments') && !p.ask_for_governments ? 'italic text-gray-400' : ''}`} />
                </div>
              </div>
            </div>

            {/* Source documents */}
            {p.documents && p.documents.length > 0 && (
              <div>
                <Lbl text="Source documents" field="documents" fl={[]} w={[]} u={[]} />
                <div className="space-y-1.5">
                  {p.documents.map((doc, i) => {
                    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/innovation-documents/${doc.path}`;
                    const icon = doc.type === 'pdf' ? '📄' : doc.type === 'xlsx' ? '📊' : '📎';
                    const sizeMb = (doc.size / (1024 * 1024)).toFixed(1);
                    const uploadDate = doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : '';
                    return (
                      <div key={i} className="flex items-center gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2">
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-w-0 flex-1 items-center gap-2 text-xs text-gray-700 hover:text-amber-800"
                        >
                          <span className="shrink-0">{icon}</span>
                          <span className="min-w-0 truncate font-medium">{doc.name}</span>
                        </a>
                        <span className="shrink-0 text-[10px] text-gray-400">{sizeMb} MB</span>
                        {uploadDate && <span className="shrink-0 text-[10px] text-gray-400">{uploadDate}</span>}
                        <button onClick={() => set('documents', p.documents.filter((_: unknown, idx: number) => idx !== i))} className="shrink-0 text-xs text-gray-300 hover:text-red-400">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TearSheet;
