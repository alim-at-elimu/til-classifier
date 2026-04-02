'use client';

import { useCallback, useImperativeHandle, forwardRef } from 'react';
import { Innovation, Innovator } from '@/lib/profile-types';

export interface InvestmentPropositionHandle {
  exportPdf: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────

const AMBER = '#EF9F27';
const M_AND_E_ADDITION = 100_000;

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  innovator: Innovator;
  innovation: Innovation;
  onUpdateInnovation: (i: Innovation) => void;
}

// ── NeedsInputBadge ───────────────────────────────────────────────────────

function NeedsInputBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide text-white" style={{ backgroundColor: AMBER }}>
      Needs input
    </span>
  );
}

// ── ChapterHeading ────────────────────────────────────────────────────────

function ChapterHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-black tracking-tighter" style={{ color: AMBER }}>{number}</span>
        <div>
          <span className="block h-0.5 w-8 mb-2" style={{ backgroundColor: AMBER }} />
          <h2 className="text-xl font-bold uppercase tracking-wide text-stone-900">{title}</h2>
        </div>
      </div>
    </div>
  );
}

// ── WebAugmentedBadge ─────────────────────────────────────────────────────

function WebAugmentedBadge() {
  return (
    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
      Web sourced
    </span>
  );
}

// ── SubLabel ──────────────────────────────────────────────────────────────

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-3">{children}</h4>
  );
}

// ── EmptyField ────────────────────────────────────────────────────────────

function EmptyField({ hint }: { hint?: string }) {
  return (
    <div className="relative border-2 border-dashed border-stone-300 rounded-lg p-5 bg-stone-50/50">
      <div className="absolute -top-2.5 left-3"><NeedsInputBadge /></div>
      <p className="text-stone-400 italic text-sm mt-2">{hint ?? 'Human input required'}</p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────

const InvestmentProposition = forwardRef<InvestmentPropositionHandle, Props>(function InvestmentProposition(
  { innovator, innovation },
  ref
) {
  const p = innovation;
  const org = innovator;
  const fl = p.confidence_flags;

  const isHumanEmpty = (field: string, val: unknown) => fl.includes(field) && (val === null || val === undefined || val === '');

  // Total funding computation
  const raw = p.funding_ask_base || '';
  const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  const formattedTotal = !isNaN(num)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num + M_AND_E_ADDITION)
    : '—';

  const handleExport = useCallback(() => {
    const stepsHtml = p.model_steps.map((s, i) =>
      `<li style="display:flex;gap:12px;margin-bottom:10px"><span style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:${AMBER};color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center">${i + 1}</span><span style="color:#44403c;line-height:1.6">${s}</span></li>`
    ).join('');

    const adoptionHtml = p.adoption_pathway_bullets.map((b) =>
      `<li style="display:flex;gap:10px;margin-bottom:8px"><span style="flex-shrink:0;width:18px;height:18px;border-radius:3px;background:${AMBER};color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center">✓</span><span style="color:#44403c;line-height:1.6">${b}</span></li>`
    ).join('');

    const evidenceHtml = p.evidence_stats.map((s) =>
      `<div style="background:#fff;border:1px solid #e7e5e4;border-left:4px solid ${AMBER};border-radius:6px;padding:14px"><p style="font-size:26px;font-weight:900;color:${AMBER};margin:0 0 4px">${s.number}</p><p style="font-size:13px;color:#44403c;margin:0 0 4px">${s.label}</p><p style="font-size:11px;color:#a8a29e;margin:0">${s.source}</p></div>`
    ).join('');

    const fundingCoversHtml = p.funding_covers.map((c) =>
      `<li style="display:flex;gap:8px;margin-bottom:6px"><span style="color:${AMBER}">•</span><span style="color:#44403c;font-size:13px">${c}</span></li>`
    ).join('');

    const econ = (lbl: string, val: string | null) =>
      `<div style="background:#fff;border:1px solid #e7e5e4;border-left:4px solid ${AMBER};border-radius:6px;padding:14px;flex:1"><p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#78716c;margin:0 0 8px">${lbl}</p><p style="font-size:18px;font-weight:900;color:#1c1917;margin:0;line-height:1.3">${val || '—'}</p></div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${p.name || 'Investment Proposition'}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 16mm; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .no-print { display:none !important; } }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f5f5f4; color:#1c1917; font-size:13px; line-height:1.5; }
  article { max-width:740px; margin:0 auto; background:#fff; }
  .ch-num { font-size:42px; font-weight:900; color:${AMBER}; line-height:1; }
  .ch-rule { display:block; height:2px; width:28px; background:${AMBER}; margin-bottom:6px; }
  .ch-title { font-size:16px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#1c1917; }
  .sublabel { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#78716c; margin-bottom:8px; }
  .needs-input { display:inline-block; padding:2px 8px; border-radius:3px; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; background:${AMBER}; color:#fff; }
  .placeholder { border:2px dashed #d6d3d1; border-radius:6px; padding:16px; background:#fafaf9; color:#a8a29e; font-style:italic; font-size:13px; }
  .print-btn { position:fixed; top:12px; right:12px; background:${AMBER}; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; }
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
<article>
  <header style="padding:32px 36px 28px;border-bottom:2px solid #e7e5e4">
    <p style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.12em;color:#a8a29e;margin-bottom:6px">Investment Proposition</p>
    <h1 style="font-size:32px;font-weight:900;letter-spacing:-0.02em;color:#1c1917;line-height:1.15">${p.name || 'Innovation Name'}</h1>
    <p style="margin-top:8px;font-size:16px;color:#57534e">${org.name || 'Organisation Name'}</p>
  </header>

  <!-- 01 -->
  <section style="padding:28px 36px 32px;border-bottom:1px solid #e7e5e4">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px"><span class="ch-num">01</span><div><span class="ch-rule"></span><span class="ch-title">What Is This Innovation</span></div></div>
    ${p.investment_thesis ? `<div style="border-left:4px solid ${AMBER};background:rgba(239,159,39,0.08);border-radius:4px;padding:14px 16px;margin-bottom:20px;font-style:italic;color:#44403c">${p.investment_thesis}</div>` : `<div class="placeholder" style="margin-bottom:20px"><span class="needs-input">Needs input</span><br><br>Why is this innovator worth investing in? What makes the timing right?</div>`}
    ${p.problem_statement ? `<div style="margin-bottom:16px"><p class="sublabel">Problem</p><p style="color:#44403c;line-height:1.6">${p.problem_statement}</p></div>` : ''}
    ${p.opportunity_statement ? `<div style="margin-bottom:16px"><p class="sublabel">Opportunity</p><p style="color:#44403c;line-height:1.6">${p.opportunity_statement}</p></div>` : ''}
    ${p.model_steps.length > 0 ? `<div><p class="sublabel">What Is Novel</p><ul style="list-style:none;padding:0">${stepsHtml}</ul></div>` : ''}
  </section>

  <!-- 02 -->
  <section style="padding:28px 36px 32px;border-bottom:1px solid #e7e5e4">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px"><span class="ch-num">02</span><div><span class="ch-rule"></span><span class="ch-title">Pathway to Adoption and Scale</span></div></div>
    ${p.adoption_pathway_bullets.length > 0 ? `<ul style="list-style:none;padding:0;margin-bottom:16px">${adoptionHtml}</ul>` : `<div class="placeholder" style="margin-bottom:16px"><span class="needs-input">Needs input</span><br><br>Human input required</div>`}
    <div style="border-left:4px solid ${AMBER};background:rgba(239,159,39,0.08);border-radius:4px;padding:12px 16px"><p style="color:#44403c;font-size:13px;font-weight:500">This can be adopted and scaled within existing government systems and budgets.</p></div>
  </section>

  <!-- 03 -->
  <section style="padding:28px 36px 32px;border-bottom:1px solid #e7e5e4">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px"><span class="ch-num">03</span><div><span class="ch-rule"></span><span class="ch-title">Evidence</span></div></div>
    ${p.evidence_stats.length > 0 ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">${evidenceHtml}</div>` : ''}
    <div style="margin-bottom:16px"><p class="sublabel">What This Signals</p>${p.evidence_interpretation ? `<p style="color:#44403c;line-height:1.6">${p.evidence_interpretation}</p>` : `<div class="placeholder"><span class="needs-input">Needs input</span><br><br>Human input required</div>`}</div>
  </section>

  <!-- 04 -->
  <section style="padding:28px 36px 32px;border-bottom:1px solid #e7e5e4">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px"><span class="ch-num">04</span><div><span class="ch-rule"></span><span class="ch-title">Economics</span></div></div>
    <div style="display:flex;gap:12px">${econ('Cost / Teacher Pilot', p.cost_per_teacher_now)}${econ('Cost / Teacher at Scale Per Year', p.cost_per_teacher_scale)}${econ('Marginal Cost at Scale', p.marginal_cost_at_scale)}</div>
  </section>

  <!-- 05 -->
  <section style="padding:28px 36px 32px">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px"><span class="ch-num">05</span><div><span class="ch-rule"></span><span class="ch-title">The Ask</span></div></div>
    <div style="text-align:center;margin-bottom:24px">
      <p style="font-size:44px;font-weight:900;color:${AMBER};letter-spacing:-0.02em">${formattedTotal}</p>
      ${p.funding_ask_duration ? `<p style="color:#57534e;margin-top:4px">${p.funding_ask_duration}</p>` : ''}
      <p style="font-size:11px;color:#a8a29e;margin-top:6px">Includes $100,000 for independent monitoring and evaluation.</p>
    </div>
    ${p.funding_covers.length > 0 ? `<div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;padding:16px;margin-bottom:20px"><p class="sublabel">Funding Covers</p><ul style="list-style:none;padding:0">${fundingCoversHtml}</ul></div>` : ''}
    <div style="margin-bottom:16px"><p class="sublabel">What the Pilot Will Test</p>${p.maturity_to_validate ? `<p style="color:#44403c;line-height:1.6">${p.maturity_to_validate}</p>` : `<div class="placeholder"><span class="needs-input">Needs input</span><br><br>Human input required</div>`}</div>
    <div style="margin-bottom:20px"><p class="sublabel">What We Ask From You</p>${p.ask_funder_outcome ? `<p style="color:#44403c;line-height:1.6">${p.ask_funder_outcome}</p>` : `<div class="placeholder"><span class="needs-input">Needs input</span><br><br>Human input required</div>`}</div>
    ${org.track_record_description ? `<div style="border-left:4px solid ${AMBER};background:rgba(239,159,39,0.05);border-radius:4px;padding:14px 16px"><p style="color:#44403c;font-size:13px;font-style:italic;line-height:1.6">${org.track_record_description}</p></div>` : ''}
  </section>
</article>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (win) win.onload = () => URL.revokeObjectURL(blobUrl);
  }, [p, org, formattedTotal]);

  useImperativeHandle(ref, () => ({ exportPdf: handleExport }), [handleExport]);

  return (
    <div className="bg-stone-100 py-12 px-4 -mx-4">
      <article className="max-w-3xl mx-auto">

        {/* ── Document Header ──────────────────────────────────────────── */}
        <header className="mb-12 pb-8 border-b-2 border-stone-200">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-2">
            Investment Proposition
          </p>
          <h1 className="text-4xl font-black tracking-tight text-stone-900 leading-tight">
            {p.name ?? 'Innovation Name'}
          </h1>
          <p className="mt-3 text-lg text-stone-600">
            {org.name ?? 'Organisation Name'}
          </p>
        </header>

        {/* ── 01 · What Is This Innovation ─────────────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="01" title="What Is This Innovation" />

          {/* Investment thesis */}
          <div className="mb-8">
            {isHumanEmpty('investment_thesis', p.investment_thesis) ? (
              <EmptyField hint="Why is this innovator worth investing in? What makes the timing right?" />
            ) : (
              <div className="rounded-lg px-5 py-4" style={{ backgroundColor: 'rgba(239, 159, 39, 0.08)', borderLeft: `4px solid ${AMBER}` }}>
                <p className="text-sm italic leading-relaxed text-stone-800">{p.investment_thesis}</p>
              </div>
            )}
          </div>

          {/* Problem */}
          {p.problem_statement && (
            <div className="mb-8">
              <SubLabel>Problem</SubLabel>
              <div className="relative">
                <p className="text-stone-700 leading-relaxed">{p.problem_statement}</p>
                {p.web_augmented_fields.includes('problem_statement') && (
                  <div className="mt-1"><WebAugmentedBadge /></div>
                )}
              </div>
            </div>
          )}

          {/* Opportunity */}
          {p.opportunity_statement && (
            <div className="mb-8">
              <SubLabel>Opportunity</SubLabel>
              <div className="relative">
                <p className="text-stone-700 leading-relaxed">{p.opportunity_statement}</p>
                {p.web_augmented_fields.includes('opportunity_statement') && (
                  <div className="mt-1"><WebAugmentedBadge /></div>
                )}
              </div>
            </div>
          )}

          {/* What is novel */}
          <div>
            <SubLabel>What Is Novel</SubLabel>
            {p.model_steps.length > 0 ? (
              <ul className="space-y-4">
                {p.model_steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5" style={{ backgroundColor: AMBER }}>
                      {i + 1}
                    </span>
                    <p className="text-stone-700 leading-relaxed flex-1">{step}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyField />
            )}
          </div>
        </section>

        {/* ── 02 · Pathway to Adoption and Scale ───────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="02" title="Pathway to Adoption and Scale" />

          {p.adoption_pathway_bullets.length > 0 ? (
            <ul className="space-y-4 mb-6">
              {p.adoption_pathway_bullets.map((bullet, i) => (
                <li key={i} className="flex gap-4 text-stone-700 leading-relaxed">
                  <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-white text-xs mt-0.5" style={{ backgroundColor: AMBER }}>✓</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mb-6"><EmptyField /></div>
          )}

          <div className="mt-6 p-4 rounded-lg border-l-4" style={{ borderColor: AMBER, backgroundColor: 'rgba(239, 159, 39, 0.08)' }}>
            <p className="text-stone-700 text-sm font-medium">
              This can be adopted and scaled within existing government systems and budgets.
            </p>
          </div>
        </section>

        {/* ── 03 · Evidence ────────────────────────────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="03" title="Evidence" />

          {p.evidence_stats.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {p.evidence_stats.map((stat, i) => (
                <div key={i} className="bg-white rounded-lg p-5 border border-stone-200" style={{ borderLeftWidth: '4px', borderLeftColor: AMBER }}>
                  <p className="text-3xl font-black tracking-tight mb-1" style={{ color: AMBER }}>{stat.number}</p>
                  <p className="text-stone-700 text-sm leading-snug mb-2">{stat.label}</p>
                  <p className="text-stone-400 text-xs">{stat.source}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-8"><EmptyField /></div>
          )}

          <div className="mb-8">
            <SubLabel>What This Signals</SubLabel>
            {isHumanEmpty('evidence_interpretation', p.evidence_interpretation) ? (
              <EmptyField />
            ) : (
              <p className="text-stone-700 text-sm leading-relaxed">{p.evidence_interpretation}</p>
            )}
          </div>
        </section>

        {/* ── 04 · Economics ───────────────────────────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="04" title="Economics" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col bg-white rounded-lg p-4 border border-stone-200" style={{ borderLeftWidth: '4px', borderLeftColor: AMBER }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 min-h-[2.5rem] leading-tight">Cost / Teacher Pilot</p>
              <p className="text-xl font-black text-stone-900">{p.cost_per_teacher_now || '—'}</p>
            </div>
            <div className="flex flex-col bg-white rounded-lg p-4 border border-stone-200" style={{ borderLeftWidth: '4px', borderLeftColor: AMBER }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 min-h-[2.5rem] leading-tight">Cost / Teacher at Scale Per Year</p>
              <p className="text-xl font-black text-stone-900">{p.cost_per_teacher_scale || '—'}</p>
            </div>
            <div className="flex flex-col bg-white rounded-lg p-4 border border-stone-200" style={{ borderLeftWidth: '4px', borderLeftColor: AMBER }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 min-h-[2.5rem] leading-tight">Marginal Cost at Scale</p>
              <p className="text-xl font-black text-stone-900 leading-snug">{p.marginal_cost_at_scale || '—'}</p>
            </div>
          </div>
        </section>

        {/* ── 05 · The Ask ─────────────────────────────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="05" title="The Ask" />

          {/* Total funding */}
          <div className="mb-8 text-center">
            <p className="text-5xl font-black tracking-tight" style={{ color: AMBER }}>{formattedTotal}</p>
            {p.funding_ask_duration && (
              <p className="text-stone-600 mt-1">{p.funding_ask_duration}</p>
            )}
            <p className="text-xs text-stone-400 mt-2">Includes $100,000 for independent monitoring and evaluation.</p>
          </div>

          {/* Funding covers */}
          {p.funding_covers.length > 0 && (
            <div className="mb-8 bg-stone-50 rounded-lg p-5 border border-stone-200">
              <SubLabel>Funding Covers</SubLabel>
              <ul className="grid md:grid-cols-2 gap-3">
                {p.funding_covers.map((c, i) => (
                  <li key={i} className="flex gap-3 text-stone-700 text-sm leading-relaxed">
                    <span style={{ color: AMBER }}>•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What the Pilot Will Test */}
          <div className="mb-8">
            <SubLabel>What the Pilot Will Test</SubLabel>
            {isHumanEmpty('maturity_to_validate', p.maturity_to_validate) ? (
              <EmptyField />
            ) : (
              <p className="text-stone-700 text-sm leading-relaxed">{p.maturity_to_validate}</p>
            )}
          </div>

          {/* What we ask from you */}
          <div className="mb-8">
            <SubLabel>What We Ask From You</SubLabel>
            {isHumanEmpty('ask_funder_outcome', p.ask_funder_outcome) ? (
              <EmptyField />
            ) : (
              <p className="text-stone-700 text-sm leading-relaxed">{p.ask_funder_outcome}</p>
            )}
          </div>

          {/* Track record footer */}
          {org.track_record_description && (
            <div className="p-5 rounded-lg border-l-4" style={{ borderColor: AMBER, backgroundColor: 'rgba(239, 159, 39, 0.05)' }}>
              <p className="text-stone-700 text-sm leading-relaxed italic">{org.track_record_description}</p>
            </div>
          )}
        </section>

      </article>
    </div>
  );
});

export default InvestmentProposition;
