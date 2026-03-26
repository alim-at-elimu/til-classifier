'use client';

import { useCallback, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  InnovatorProfile,
  Organisation,
  EvidenceStat,
  GovernmentRelationship,
  Quote,
  THEMES,
  STAGES,
  GOV_STATUSES,
  Theme,
} from '@/lib/profile-types';

interface Props {
  organisation: Organisation;
  profile: InnovatorProfile;
  onUpdateOrg?: (o: Organisation) => void;
  onUpdate: (p: InnovatorProfile) => void;
  onSubmit: () => void;
  onBack: () => void;
  hideToolbar?: boolean;
  readOnlyOrg?: boolean;
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

export interface TearSheetHandle {
  exportPdf: () => void;
}

const TearSheet = forwardRef<TearSheetHandle, Props>(function TearSheet(
  { organisation, profile, onUpdateOrg, onUpdate, onSubmit, onBack, hideToolbar, readOnlyOrg },
  ref
) {
  const org = organisation;
  const p = profile;
  const fl = p.confidence_flags;
  const w = p.web_augmented_fields;
  const u = p.file_updated_fields;
  const sheetRef = useRef<HTMLDivElement>(null);

  const set = useCallback((field: string, value: unknown) => { onUpdate({ ...p, [field]: value }); }, [p, onUpdate]);
  const setOrg = useCallback((field: string, value: unknown) => { if (onUpdateOrg) onUpdateOrg({ ...org, [field]: value }); }, [org, onUpdateOrg]);
  const updateModelStep = useCallback((i: number, val: string) => { const s = [...p.model_steps]; s[i] = val; onUpdate({ ...p, model_steps: s }); }, [p, onUpdate]);
  const addModelStep = useCallback(() => { if (p.model_steps.length < 4) onUpdate({ ...p, model_steps: [...p.model_steps, ''] }); }, [p, onUpdate]);
  const updateStat = useCallback((i: number, field: keyof EvidenceStat, val: string) => { const s = [...p.evidence_stats]; s[i] = { ...s[i], [field]: val }; onUpdate({ ...p, evidence_stats: s }); }, [p, onUpdate]);
  const addStat = useCallback(() => { if (p.evidence_stats.length < 3) onUpdate({ ...p, evidence_stats: [...p.evidence_stats, { number: '', label: '', source: '' }] }); }, [p, onUpdate]);
  const updateGov = useCallback((i: number, field: keyof GovernmentRelationship, val: string) => { const r = [...p.government_relationships]; r[i] = { ...r[i], [field]: val } as GovernmentRelationship; onUpdate({ ...p, government_relationships: r }); }, [p, onUpdate]);
  const removeGov = useCallback((i: number) => { onUpdate({ ...p, government_relationships: p.government_relationships.filter((_, idx) => idx !== i) }); }, [p, onUpdate]);
  const addGov = useCallback(() => { onUpdate({ ...p, government_relationships: [...p.government_relationships, { country: '', ministry: '', status: 'Interest only' }] }); }, [p, onUpdate]);
  const updateQuote = useCallback((i: number, field: keyof Quote, val: string) => { const q = [...p.quotes]; q[i] = { ...q[i], [field]: val }; onUpdate({ ...p, quotes: q }); }, [p, onUpdate]);
  const removeQuote = useCallback((i: number) => { onUpdate({ ...p, quotes: p.quotes.filter((_, idx) => idx !== i) }); }, [p, onUpdate]);
  const addQuote = useCallback(() => { onUpdate({ ...p, quotes: [...p.quotes, { text: '', attribution: '' }] }); }, [p, onUpdate]);

  const handleExport = useCallback(() => {
    const statusLabel = (s: string) => {
      if (s === 'Active MOU') return '#10b981';
      if (s === 'In pipeline') return '#f59e0b';
      return '#9ca3af';
    };

    const govRows = p.government_relationships.map((g) =>
      `<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusLabel(g.status)};margin-top:4px;flex-shrink:0"></span><div><strong>${g.country}</strong> — ${g.ministry} <span style="color:#888;font-size:11px">(${g.status})</span></div></div>`
    ).join('');

    const stepsHtml = p.model_steps.map((s, i) =>
      `<div style="display:flex;gap:8px;margin-bottom:6px"><span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#fef3c7;color:#d97706;font-weight:700;font-size:12px;flex-shrink:0">${i + 1}</span><span style="font-size:13px;color:#374151">${s}</span></div>`
    ).join('');

    const evidenceHtml = p.evidence_stats.map((s) =>
      `<div style="display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid #f3f4f6"><span style="font-size:20px;font-weight:700;color:#d97706;flex-shrink:0">${s.number}</span><div><div style="font-size:12px;color:#374151">${s.label}</div><div style="font-size:10px;color:#9ca3af;margin-top:2px">${s.source}</div></div></div>`
    ).join('');

    const quotesHtml = p.quotes.map((q) =>
      `<blockquote>"${q.text}"<br><span class="attr">— ${q.attribution}</span></blockquote>`
    ).join('');

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
  .meta-row { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 6px; }
  .meta-item label { display: block; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
  .meta-item span { font-size: 13px; color: #374151; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .three-col > div { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
  .three-col .val { font-size: 16px; font-weight: 700; }
  .three-col .lbl { font-size: 9px; text-transform: uppercase; color: #9ca3af; font-weight: 600; }
  .ask { border: 2px dashed #d1d5db; border-radius: 6px; padding: 10px; background: #f9fafb; }
  .ask-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
  .ask-grid label { font-size: 9px; font-weight: 600; text-transform: uppercase; color: #9ca3af; }
  .ask-grid p { font-size: 12px; color: #374151; min-height: 20px; }
  blockquote { background: #fffbeb; border-radius: 4px; padding: 8px; margin: 4px 0; font-style: italic; font-size: 12px; color: #374151; }
  blockquote .attr { font-size: 10px; color: #6b7280; font-style: normal; }
  .print-btn { position: fixed; top: 12px; right: 12px; background: #f59e0b; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; z-index: 10; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

<!-- Header -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:8px;border-bottom:2px solid #d97706">
  <div>
    <h1>${org.name || '(unnamed)'}</h1>
    <div style="display:flex;gap:12px;margin-top:4px;font-size:12px;color:#6b7280">
      ${org.country ? `<span>${org.country}</span>` : ''}
      ${org.founded_year ? `<span>Est. ${org.founded_year}</span>` : ''}
      ${org.team_size ? `<span>Team: ${org.team_size}</span>` : ''}
    </div>
  </div>
  <div style="display:flex;gap:6px;align-items:center">
    ${org.african_led ? '<span class="badge badge-green">African-led</span>' : ''}
    ${p.stage ? `<span class="badge badge-amber">${p.stage}</span>` : ''}
  </div>
</div>

${p.theme ? `<div style="margin-top:8px;font-size:12px;color:#6b7280">Theme: <strong style="color:#374151">${p.theme}</strong></div>` : ''}

<div class="section-title" style="margin-top:10px">Insight</div>
<p style="font-size:13px;line-height:1.55">${p.insight || ''}</p>

<div class="section-title">How It Works</div>
${stepsHtml}

<hr class="divider">

<div class="two-col">
  <div>
    <div class="section-title" style="margin-top:0">Government Relationships</div>
    ${govRows || '<div style="color:#9ca3af;font-size:12px">None</div>'}
    ${quotesHtml ? `<div class="section-title">Quotes</div>${quotesHtml}` : ''}
  </div>
  <div>
    <div class="section-title" style="margin-top:0">Evidence</div>
    ${evidenceHtml || '<div style="color:#9ca3af;font-size:12px">None</div>'}
  </div>
</div>

<hr class="divider">

<div class="section-title" style="margin-top:0">Economics</div>
<div class="three-col">
  <div><div class="lbl">Cost / teacher now</div><div class="val">${p.cost_per_teacher_now || '—'}</div></div>
  <div><div class="lbl">Cost / teacher at scale</div><div class="val">${p.cost_per_teacher_scale || '—'}</div></div>
  <div><div class="lbl">Funding gap</div><div class="val" style="color:#d97706">${p.funding_gap || '—'}</div></div>
</div>

<div class="section-title">The Ask</div>
<div class="ask">
  <div class="ask-grid">
    <div><label>For funders</label><p>${p.ask_funders || ''}</p></div>
    <div><label>For governments</label><p>${p.ask_governments || ''}</p></div>
  </div>
</div>

</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) w.onload = () => URL.revokeObjectURL(url);
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
        {/* ═══ ORGANISATION CARD ═══ */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-3">
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Organisation</span>
              {readOnlyOrg ? (
                <p className="text-lg font-bold text-gray-900">{org.name || '(unnamed)'}</p>
              ) : (
                <input value={org.name || ''} onChange={(e) => setOrg('name', e.target.value)} placeholder="Organisation name" className="w-full border-b border-transparent bg-transparent text-lg font-bold text-gray-900 placeholder:text-gray-300 focus:border-amber-400 focus:outline-none" />
              )}
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-2">
              {org.african_led && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">African-led</span>}
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <Lbl text="Country" field="country" fl={fl} w={w} u={u} />
                {readOnlyOrg ? <p className="text-sm text-gray-800">{org.country || '—'}</p> : <input value={org.country || ''} onChange={(e) => setOrg('country', e.target.value)} placeholder="Country" className={inp} style={{ width: 120 }} />}
              </div>
              <div>
                <Lbl text="Founded" field="founded_year" fl={fl} w={w} u={u} />
                {readOnlyOrg ? <p className="text-sm text-gray-800">{org.founded_year || '—'}</p> : <input value={org.founded_year || ''} onChange={(e) => setOrg('founded_year', e.target.value)} placeholder="Year" className={inp} style={{ width: 80 }} />}
              </div>
              <div>
                <Lbl text="Team size" field="team_size" fl={fl} w={w} u={u} />
                {readOnlyOrg ? <p className="text-sm text-gray-800">{org.team_size || '—'}</p> : <input value={org.team_size || ''} onChange={(e) => setOrg('team_size', e.target.value)} placeholder="#" className={inp} style={{ width: 80 }} />}
              </div>
              {!readOnlyOrg && (
                <div>
                  <Lbl text="African-led" field="african_led" fl={fl} w={w} u={u} />
                  <div className="flex gap-1.5">
                    {[true, false].map((val) => (
                      <button key={String(val)} onClick={() => setOrg('african_led', val)} className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${org.african_led === val ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{val ? 'Yes' : 'No'}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ INNOVATION CARD ═══ */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-amber-50 px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600">Innovation</span>
              <select value={p.theme || ''} onChange={(e) => set('theme', (e.target.value as Theme) || null)} className="rounded bg-white px-2 py-1 text-xs text-gray-700 border border-gray-200">
                <option value="">Select theme</option>
                {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <select value={p.stage || ''} onChange={(e) => set('stage', e.target.value || null)} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <option value="">Stage</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="px-6 py-4 space-y-5">
            {/* Insight — full width */}
            <div>
              <Lbl text="Insight" field="insight" fl={fl} w={w} u={u} />
              <AutoTextarea value={p.insight || ''} onChange={(v) => set('insight', v || null)} placeholder="What did they see that others missed?" className="text-sm leading-relaxed text-gray-900 border-b border-transparent focus:border-amber-400" />
            </div>

            {/* How it works — full width grid */}
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

            {/* Two-column: left = gov + quotes, right = evidence + economics */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Government relationships — each on its own line, wrapping */}
                <div>
                  <Lbl text="Government relationships" field="government_relationships" fl={fl} w={w} u={u} />
                  <div className="space-y-1.5">
                    {p.government_relationships.map((g, i) => (
                      <div key={i} className="flex items-start gap-2 rounded bg-gray-50 p-1.5">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[g.status]}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <input value={g.country} onChange={(e) => updateGov(i, 'country', e.target.value)} placeholder="Country" className="w-20 shrink-0 bg-transparent text-xs font-medium text-gray-800 placeholder:text-gray-300 focus:outline-none" />
                            <select value={g.status} onChange={(e) => updateGov(i, 'status', e.target.value)} className="shrink-0 rounded bg-white px-1 py-0.5 text-[10px] text-gray-600 border border-gray-200">
                              {GOV_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => removeGov(i)} className="shrink-0 text-xs text-gray-300 hover:text-red-400">✕</button>
                          </div>
                          <input value={g.ministry} onChange={(e) => updateGov(i, 'ministry', e.target.value)} placeholder="Ministry name" className="mt-0.5 w-full bg-transparent text-[11px] text-gray-600 placeholder:text-gray-300 focus:outline-none" />
                        </div>
                      </div>
                    ))}
                    <button onClick={addGov} className="text-[10px] text-amber-600 hover:text-amber-700">+ Add relationship</button>
                  </div>
                </div>

                {/* Quotes */}
                <div>
                  <Lbl text="Quotes" field="quotes" fl={fl} w={w} u={u} />
                  <div className="space-y-2">
                    {p.quotes.map((q, i) => (
                      <div key={i} className="relative rounded bg-amber-50 p-2.5 pr-6">
                        <button onClick={() => removeQuote(i)} className="absolute right-1.5 top-1.5 text-xs text-gray-300 hover:text-red-400">✕</button>
                        <AutoTextarea value={q.text} onChange={(v) => updateQuote(i, 'text', v)} placeholder="Direct quote…" className="text-xs italic leading-relaxed text-gray-700" />
                        <input value={q.attribution} onChange={(e) => updateQuote(i, 'attribution', e.target.value)} placeholder="— Attribution" className="mt-1 w-full bg-transparent text-[10px] text-gray-500 placeholder:text-gray-300 focus:outline-none" />
                      </div>
                    ))}
                    <button onClick={addQuote} className="text-[10px] text-amber-600 hover:text-amber-700">+ Add quote</button>
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
                    {p.evidence_stats.length < 3 && (
                      <button onClick={addStat} className="w-full rounded border border-dashed border-gray-300 py-2 text-[10px] text-gray-400 hover:border-amber-300 hover:text-amber-600">+ Add evidence</button>
                    )}
                  </div>
                </div>

                {/* Economics */}
                <div>
                  <Lbl text="Economics" field="cost_per_teacher_now" fl={fl} w={w} u={u} />
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`rounded border p-2 ${fl.includes('cost_per_teacher_now') ? 'border-amber-300' : 'border-gray-200'}`}>
                      <span className="text-[9px] font-semibold uppercase text-gray-400">Cost/teacher</span>
                      <input value={p.cost_per_teacher_now || ''} onChange={(e) => set('cost_per_teacher_now', e.target.value || null)} placeholder="$0" className="w-full bg-transparent text-sm font-bold text-gray-800 focus:outline-none" />
                    </div>
                    <div className={`rounded border p-2 ${fl.includes('cost_per_teacher_scale') ? 'border-amber-300' : 'border-gray-200'}`}>
                      <span className="text-[9px] font-semibold uppercase text-gray-400">At scale</span>
                      <input value={p.cost_per_teacher_scale || ''} onChange={(e) => set('cost_per_teacher_scale', e.target.value || null)} placeholder="$0" className="w-full bg-transparent text-sm font-bold text-gray-800 focus:outline-none" />
                    </div>
                    <div className={`rounded border p-2 ${fl.includes('funding_gap') ? 'border-amber-300' : 'border-gray-200'}`}>
                      <span className="text-[9px] font-semibold uppercase text-gray-400">Funding gap</span>
                      <AutoTextarea value={p.funding_gap || ''} onChange={(v) => set('funding_gap', v || null)} placeholder="$0" className="text-sm font-bold leading-snug text-amber-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* The Ask — full width */}
            <div className="rounded border-2 border-dashed border-gray-300 bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-700">The Ask</span>
                <span className="text-[9px] font-medium text-red-500">Requires human input</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">For funders</span>
                  <AutoTextarea value={p.ask_funders} onChange={(v) => set('ask_funders', v)} placeholder="What is the ask for funders?" className="text-xs text-gray-900 border-b border-transparent focus:border-amber-400" />
                </div>
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">For governments</span>
                  <AutoTextarea value={p.ask_governments} onChange={(v) => set('ask_governments', v)} placeholder="What is the ask for governments?" className="text-xs text-gray-900 border-b border-transparent focus:border-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default TearSheet;
