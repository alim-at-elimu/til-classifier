'use client';

import { useCallback, useImperativeHandle, forwardRef } from 'react';
import { Innovation, Innovator } from '@/lib/profile-types';
import { buildIpArticle, openIpForPrint } from '@/lib/export-ip';

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

// ── Component ─────────────────────────────────────────────────────────────

const InvestmentProposition = forwardRef<InvestmentPropositionHandle, Props>(function InvestmentProposition(
  { innovator, innovation },
  ref
) {
  const p = innovation;
  const org = innovator;

  const raw = p.funding_ask_base || '';
  const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  const formattedTotal = !isNaN(num)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num + M_AND_E_ADDITION)
    : '—';

  const handleExport = useCallback(() => {
    openIpForPrint([buildIpArticle(p, org)], p.name || 'Investment Proposition');
  }, [p, org]);

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
          {p.investment_thesis && (
            <div className="mb-8">
              <div className="rounded-lg px-5 py-4" style={{ backgroundColor: 'rgba(239, 159, 39, 0.08)', borderLeft: `4px solid ${AMBER}` }}>
                <p className="text-sm italic leading-relaxed text-stone-800">{p.investment_thesis}</p>
              </div>
            </div>
          )}

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
          {p.model_steps.length > 0 && (
            <div>
              <SubLabel>What Is Novel</SubLabel>
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
            </div>
          )}
        </section>

        {/* ── 02 · Pathway to Adoption and Scale ───────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="02" title="Pathway to Adoption and Scale" />

          {p.adoption_pathway_bullets.length > 0 && (
            <ul className="space-y-4 mb-6">
              {p.adoption_pathway_bullets.map((bullet, i) => (
                <li key={i} className="flex gap-4 text-stone-700 leading-relaxed">
                  <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-white text-xs mt-0.5" style={{ backgroundColor: AMBER }}>✓</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
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

          {p.evidence_stats.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {p.evidence_stats.map((stat, i) => (
                <div key={i} className="bg-white rounded-lg p-5 border border-stone-200" style={{ borderLeftWidth: '4px', borderLeftColor: AMBER }}>
                  <p className="text-3xl font-black tracking-tight mb-1" style={{ color: AMBER }}>{stat.number}</p>
                  <p className="text-stone-700 text-sm leading-snug mb-2">{stat.label}</p>
                  <p className="text-stone-400 text-xs">{stat.source}</p>
                </div>
              ))}
            </div>
          )}

          {p.evidence_interpretation && (
            <div className="mb-8">
              <SubLabel>What This Signals</SubLabel>
              <p className="text-stone-700 text-sm leading-relaxed">{p.evidence_interpretation}</p>
            </div>
          )}
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
          {p.maturity_to_validate && (
            <div className="mb-8">
              <SubLabel>What the Pilot Will Test</SubLabel>
              <p className="text-stone-700 text-sm leading-relaxed">{p.maturity_to_validate}</p>
            </div>
          )}

          {/* What we ask from you */}
          {p.ask_funder_outcome && (
            <div className="mb-8">
              <SubLabel>What We Ask From You</SubLabel>
              <p className="text-stone-700 text-sm leading-relaxed">{p.ask_funder_outcome}</p>
            </div>
          )}

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
