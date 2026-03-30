'use client';

import { useCallback, useRef, useEffect } from 'react';
import { Innovation, Innovator } from '@/lib/profile-types';

interface Props {
  innovator: Innovator;
  innovation: Innovation;
  onUpdateInnovation: (i: Innovation) => void;
}

function AutoTextarea({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; el.style.height = '0'; el.style.height = el.scrollHeight + 'px'; }, [value]);
  return <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={1} className={`w-full resize-none overflow-hidden bg-transparent placeholder:text-gray-300 focus:outline-none ${className || ''}`} />;
}

const SECTION_STYLE = {
  label: 'text-[10px] font-medium uppercase tracking-[0.1em] text-amber-600',
  border: 'border-b-[1.5px] border-amber-400 mb-4 pb-1',
};

export default function InvestmentProposition({ innovator, innovation, onUpdateInnovation }: Props) {
  const p = innovation;
  const org = innovator;
  const fl = p.confidence_flags;

  const set = useCallback((field: string, value: unknown) => {
    onUpdateInnovation({ ...p, [field]: value });
  }, [p, onUpdateInnovation]);

  const isHumanEmpty = (field: string, val: unknown) => fl.includes(field) && (val === null || val === undefined || val === '');

  return (
    <div className="space-y-8 px-1 py-2">

      {/* 01 · What is this innovation */}
      <section>
        <div className={SECTION_STYLE.border}>
          <span className={SECTION_STYLE.label}>01 · What is this innovation</span>
        </div>

        {/* Investment thesis */}
        {isHumanEmpty('investment_thesis', p.investment_thesis) ? (
          <div className="mb-4 rounded border border-dashed border-amber-300 bg-amber-50/40 p-3">
            <span className="text-[9px] italic text-amber-600">Human input required</span>
          </div>
        ) : (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3">
            <AutoTextarea
              value={p.investment_thesis || ''}
              onChange={(v) => set('investment_thesis', v || null)}
              placeholder="Why is this innovator worth investing in?"
              className="text-sm italic leading-relaxed text-amber-900"
            />
          </div>
        )}

        {/* Problem statement */}
        {(p.problem_statement || !isHumanEmpty('problem_statement', p.problem_statement)) && (
          <div className="mb-3">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Problem</span>
            <AutoTextarea
              value={p.problem_statement || ''}
              onChange={(v) => set('problem_statement', v || null)}
              placeholder="The core problem this innovation addresses"
              className="mt-0.5 text-sm leading-relaxed text-gray-800"
            />
          </div>
        )}

        {/* Opportunity statement */}
        {(p.opportunity_statement || !isHumanEmpty('opportunity_statement', p.opportunity_statement)) && (
          <div className="mb-3">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Opportunity</span>
            <AutoTextarea
              value={p.opportunity_statement || ''}
              onChange={(v) => set('opportunity_statement', v || null)}
              placeholder="The opportunity or solution approach"
              className="mt-0.5 text-sm leading-relaxed text-gray-800"
            />
          </div>
        )}

        {/* Model steps */}
        {p.model_steps.length > 0 && (
          <div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">What is novel</span>
            <ul className="mt-1 space-y-1">
              {p.model_steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700" style={{ lineHeight: '1.4' }}>
                  <span className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full bg-amber-500" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 02 · Pathway to adoption and scale */}
      <section>
        <div className={SECTION_STYLE.border}>
          <span className={SECTION_STYLE.label}>02 · Pathway to adoption and scale</span>
        </div>

        {p.adoption_pathway_bullets.length > 0 ? (
          <ul className="mb-3 space-y-1.5">
            {p.adoption_pathway_bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm italic text-gray-400">No adoption pathway bullets extracted.</p>
        )}

        <p className="text-sm italic text-gray-500">
          This can be adopted and scaled within existing government systems and budgets.
        </p>
      </section>

      {/* 03 · Economics */}
      <section>
        <div className={SECTION_STYLE.border}>
          <span className={SECTION_STYLE.label}>03 · Economics</span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { lbl: 'Cost / teacher now', field: 'cost_per_teacher_now', val: p.cost_per_teacher_now },
            { lbl: 'Cost / teacher at scale', field: 'cost_per_teacher_scale', val: p.cost_per_teacher_scale },
            { lbl: 'Marginal cost at scale', field: 'marginal_cost_at_scale', val: p.marginal_cost_at_scale },
            { lbl: 'Funding ask', field: 'funding_ask_base', val: p.funding_ask_base },
          ].map(({ lbl, field, val }) => (
            <div key={field} className="rounded border border-l-[3px] border-l-amber-400 border-gray-200 p-2.5">
              <span className="text-[9px] font-semibold uppercase text-gray-400">{lbl}</span>
              <input
                value={(val as string) || ''}
                onChange={(e) => set(field, e.target.value || null)}
                placeholder="—"
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-gray-800 placeholder:text-gray-300 focus:outline-none"
              />
            </div>
          ))}
        </div>

        {(p.funding_ask_duration || p.funding_covers.length > 0) && (
          <div className="mt-3 text-sm text-gray-600">
            {p.funding_ask_duration && <span className="mr-2 text-gray-500">{p.funding_ask_duration}</span>}
            {p.funding_covers.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {p.funding_covers.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                    <span className="text-xs text-gray-600">{c}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* 04 · Evidence */}
      <section>
        <div className={SECTION_STYLE.border}>
          <span className={SECTION_STYLE.label}>04 · Evidence</span>
        </div>

        {/* Evidence stats grid */}
        {p.evidence_stats.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            {p.evidence_stats.map((stat, i) => (
              <div key={i} className="rounded border border-gray-200 p-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-amber-600">{stat.number}</span>
                  <span className="text-xs text-gray-700">{stat.label}</span>
                </div>
                {stat.source && <p className="mt-0.5 text-[10px] text-gray-400">{stat.source}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Evidence interpretation */}
        <div className={`mb-3 rounded border p-3 ${isHumanEmpty('evidence_interpretation', p.evidence_interpretation) ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'}`}>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            What this signals {isHumanEmpty('evidence_interpretation', p.evidence_interpretation) && <span className="text-red-400">*</span>}
          </span>
          <AutoTextarea
            value={p.evidence_interpretation || ''}
            onChange={(v) => set('evidence_interpretation', v || null)}
            placeholder="Human input required"
            className={`mt-0.5 text-sm leading-relaxed ${isHumanEmpty('evidence_interpretation', p.evidence_interpretation) ? 'italic text-gray-400' : 'text-gray-800'}`}
          />
        </div>

        {/* Maturity to validate */}
        <div className={`rounded border p-3 ${isHumanEmpty('maturity_to_validate', p.maturity_to_validate) ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'}`}>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
            What the pilot will test {isHumanEmpty('maturity_to_validate', p.maturity_to_validate) && <span className="text-red-400">*</span>}
          </span>
          <AutoTextarea
            value={p.maturity_to_validate || ''}
            onChange={(v) => set('maturity_to_validate', v || null)}
            placeholder="Human input required"
            className={`mt-0.5 text-sm leading-relaxed ${isHumanEmpty('maturity_to_validate', p.maturity_to_validate) ? 'italic text-gray-400' : 'text-gray-800'}`}
          />
        </div>
      </section>

      {/* 05 · The ask */}
      <section>
        <div className={SECTION_STYLE.border}>
          <span className={SECTION_STYLE.label}>05 · The ask</span>
        </div>

        {/* Total ask — base + $100k M&E, computed at render */}
        {(() => {
          const raw = p.funding_ask_base || '';
          const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
          const total = !isNaN(num) ? `USD $${(num + 100000).toLocaleString('en-US')}` : '—';
          return (
            <>
              <div className="mb-1 flex items-baseline gap-3">
                <span className="text-2xl font-medium text-gray-900">{total}</span>
                {p.funding_ask_duration && <span className="text-sm text-gray-500">· {p.funding_ask_duration}</span>}
              </div>
              <p className="mb-4 text-[11px] text-gray-400">Includes $100,000 for independent monitoring and evaluation.</p>
            </>
          );
        })()}

        <div className="grid grid-cols-2 gap-4">
          {/* Funding covers */}
          <div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Funding covers</span>
            {p.funding_covers.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {p.funding_covers.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm italic text-gray-400">Not specified</p>
            )}
          </div>

          {/* Ask / funder outcome */}
          <div className={`rounded border p-3 ${isHumanEmpty('ask_funder_outcome', p.ask_funder_outcome) ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'}`}>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
              What we ask from you {isHumanEmpty('ask_funder_outcome', p.ask_funder_outcome) && <span className="text-red-400">*</span>}
            </span>
            <AutoTextarea
              value={p.ask_funder_outcome || ''}
              onChange={(v) => set('ask_funder_outcome', v || null)}
              placeholder="Human input required"
              className={`mt-0.5 text-sm leading-relaxed ${isHumanEmpty('ask_funder_outcome', p.ask_funder_outcome) ? 'italic text-gray-400' : 'text-gray-800'}`}
            />
          </div>
        </div>

        {/* Track record note */}
        {org.track_record_description && (
          <p className="mt-4 text-xs italic text-gray-400">{org.track_record_description}</p>
        )}
      </section>
    </div>
  );
}
