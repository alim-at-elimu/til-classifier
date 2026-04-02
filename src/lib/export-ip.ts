import { Innovation, Innovator } from '@/lib/profile-types';

const AMBER = '#EF9F27';
const M_AND_E_ADDITION = 100_000;

const SHARED_STYLES = `
  @page { size: A4 portrait; margin: 14mm 16mm; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .no-print { display:none !important; } }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f5f5f4; color:#1c1917; font-size:13px; line-height:1.5; }
  article { max-width:740px; margin:0 auto; background:#fff; page-break-after:always; }
  article:last-child { page-break-after:auto; }
  .ch-num { font-size:42px; font-weight:900; color:${AMBER}; line-height:1; }
  .ch-rule { display:block; height:2px; width:28px; background:${AMBER}; margin-bottom:6px; }
  .ch-title { font-size:16px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#1c1917; }
  .sublabel { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#78716c; margin-bottom:8px; }
  .print-btn { position:fixed; top:12px; right:12px; background:${AMBER}; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; }
`;

/** Builds the <article> body HTML for one innovation (no <html>/<head> wrapper). */
export function buildIpArticle(innovation: Innovation, innovator: Innovator): string {
  const p = innovation;
  const org = innovator;

  const raw = p.funding_ask_base || '';
  const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  const formattedTotal = !isNaN(num)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num + M_AND_E_ADDITION)
    : '—';

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

  return `
<article>
  <header style="padding:32px 36px 28px;border-bottom:2px solid #e7e5e4">
    <p style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.12em;color:#a8a29e;margin-bottom:6px">Investment Proposition</p>
    <h1 style="font-size:32px;font-weight:900;letter-spacing:-0.02em;color:#1c1917;line-height:1.15">${p.name || 'Innovation Name'}</h1>
    <p style="margin-top:8px;font-size:16px;color:#57534e">${org.name || 'Organisation Name'}</p>
  </header>

  <section style="padding:28px 36px 32px;border-bottom:1px solid #e7e5e4">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px"><span class="ch-num">01</span><div><span class="ch-rule"></span><span class="ch-title">What Is This Innovation</span></div></div>
    ${p.investment_thesis ? `<div style="border-left:4px solid ${AMBER};background:rgba(239,159,39,0.08);border-radius:4px;padding:14px 16px;margin-bottom:20px;font-style:italic;color:#44403c">${p.investment_thesis}</div>` : ''}
    ${p.problem_statement ? `<div style="margin-bottom:16px"><p class="sublabel">Problem</p><p style="color:#44403c;line-height:1.6">${p.problem_statement}</p></div>` : ''}
    ${p.opportunity_statement ? `<div style="margin-bottom:16px"><p class="sublabel">Opportunity</p><p style="color:#44403c;line-height:1.6">${p.opportunity_statement}</p></div>` : ''}
    ${p.model_steps.length > 0 ? `<div><p class="sublabel">What Is Novel</p><ul style="list-style:none;padding:0">${stepsHtml}</ul></div>` : ''}
  </section>

  <section style="padding:28px 36px 32px;border-bottom:1px solid #e7e5e4">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px"><span class="ch-num">02</span><div><span class="ch-rule"></span><span class="ch-title">Pathway to Adoption and Scale</span></div></div>
    ${p.adoption_pathway_bullets.length > 0 ? `<ul style="list-style:none;padding:0;margin-bottom:16px">${adoptionHtml}</ul>` : ''}
    <div style="border-left:4px solid ${AMBER};background:rgba(239,159,39,0.08);border-radius:4px;padding:12px 16px"><p style="color:#44403c;font-size:13px;font-weight:500">This can be adopted and scaled within existing government systems and budgets.</p></div>
  </section>

  <section style="padding:28px 36px 32px;border-bottom:1px solid #e7e5e4">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px"><span class="ch-num">03</span><div><span class="ch-rule"></span><span class="ch-title">Evidence</span></div></div>
    ${p.evidence_stats.length > 0 ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">${evidenceHtml}</div>` : ''}
    ${p.evidence_interpretation ? `<div style="margin-bottom:16px"><p class="sublabel">What This Signals</p><p style="color:#44403c;line-height:1.6">${p.evidence_interpretation}</p></div>` : ''}
  </section>

  <section style="padding:28px 36px 32px;border-bottom:1px solid #e7e5e4">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px"><span class="ch-num">04</span><div><span class="ch-rule"></span><span class="ch-title">Economics</span></div></div>
    <div style="display:flex;gap:12px">${econ('Cost / Teacher Pilot', p.cost_per_teacher_now)}${econ('Cost / Teacher at Scale Per Year', p.cost_per_teacher_scale)}${econ('Marginal Cost at Scale', p.marginal_cost_at_scale)}</div>
  </section>

  <section style="padding:28px 36px 32px">
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:24px"><span class="ch-num">05</span><div><span class="ch-rule"></span><span class="ch-title">The Ask</span></div></div>
    <div style="text-align:center;margin-bottom:24px">
      <p style="font-size:44px;font-weight:900;color:${AMBER};letter-spacing:-0.02em">${formattedTotal}</p>
      ${p.funding_ask_duration ? `<p style="color:#57534e;margin-top:4px">${p.funding_ask_duration}</p>` : ''}
      <p style="font-size:11px;color:#a8a29e;margin-top:6px">Includes $100,000 for independent monitoring and evaluation.</p>
    </div>
    ${p.funding_covers.length > 0 ? `<div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;padding:16px;margin-bottom:20px"><p class="sublabel">Funding Covers</p><ul style="list-style:none;padding:0">${fundingCoversHtml}</ul></div>` : ''}
    ${p.maturity_to_validate ? `<div style="margin-bottom:16px"><p class="sublabel">What the Pilot Will Test</p><p style="color:#44403c;line-height:1.6">${p.maturity_to_validate}</p></div>` : ''}
    ${p.ask_funder_outcome ? `<div style="margin-bottom:20px"><p class="sublabel">What We Ask From You</p><p style="color:#44403c;line-height:1.6">${p.ask_funder_outcome}</p></div>` : ''}
    ${org.track_record_description ? `<div style="border-left:4px solid ${AMBER};background:rgba(239,159,39,0.05);border-radius:4px;padding:14px 16px"><p style="color:#44403c;font-size:13px;font-style:italic;line-height:1.6">${org.track_record_description}</p></div>` : ''}
  </section>
</article>`;
}

/** Wraps one or more articles into a complete printable HTML document. */
export function buildIpDocument(articles: string[], title: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>${SHARED_STYLES}</style></head><body>
<button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
${articles.join('\n')}
</body></html>`;
}

/** Opens a complete IP document in a new window for printing. */
export function openIpForPrint(articles: string[], title: string): void {
  const html = buildIpDocument(articles, title);
  const blob = new Blob([html], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, '_blank');
  if (win) win.onload = () => URL.revokeObjectURL(blobUrl);
}
