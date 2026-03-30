"use client";

// ────────────────────────────────────────────────────────────────────────────
// Interfaces (immutable per spec)
// ────────────────────────────────────────────────────────────────────────────

interface Innovator {
  id?: string;
  name: string | null;
  country: string | null;
  org_type: string | null;
  founded_year: string | null;
  team_size: string | null;
  african_led: boolean | null;
  track_record_description: string | null;
}

interface EvidenceStat {
  number: string;
  label: string;
  source: string;
}

interface GovernmentRelationship {
  country: string;
  ministry: string;
  status: string;
  focal_point?: boolean;
}

interface DocumentRecord {
  name: string;
  path: string;
  type: string;
  size: number;
  uploaded_at: string;
}

interface Innovation {
  innovator_id: string | null;
  name: string | null;
  theme:
    | "Individual Teacher Support"
    | "Group Coaching and Peer Learning"
    | "Closing the Data-to-Action Loop"
    | "Finding and Spreading What Already Works"
    | null;
  stage: "Proof" | "Pilot-ready" | "Scaling" | null;
  evidence_status: "Established" | "Promising" | "Emerging" | null;
  investment_thesis: string | null;
  problem_statement: string | null;
  opportunity_statement: string | null;
  model_steps: string[];
  adoption_pathway_bullets: string[];
  evidence_stats: EvidenceStat[];
  evidence_interpretation: string | null;
  cost_per_teacher_now: string | null;
  cost_per_teacher_scale: string | null;
  marginal_cost_at_scale: string | null;
  funding_ask_base: string | null;
  funding_ask_duration: string | null;
  funding_covers: string[];
  ask_funder_outcome: string | null;
  government_relationships: GovernmentRelationship[];
  quote: string | null;
  quote_attribution: string | null;
  pilot_scope: string | null;
  maturity_demonstrated: string | null;
  maturity_to_validate: string | null;
  maturity_outlook: string | null;
  ask_for_funders: string | null;
  ask_for_governments: string | null;
  confidence_flags: string[];
  web_augmented_fields: string[];
  file_updated_fields: string[];
  documents: DocumentRecord[];
  status?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const AMBER = "#EF9F27";
const M_AND_E_ADDITION = 100_000;

// ────────────────────────────────────────────────────────────────────────────
// Helper Components
// ────────────────────────────────────────────────────────────────────────────

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

function Placeholder({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative border-2 border-dashed border-stone-300 rounded-lg p-5 bg-stone-50/50">
      <div className="absolute -top-2.5 left-3">
        <NeedsInputBadge />
      </div>
      <p className="text-stone-400 italic text-sm mt-2">
        {children || "Human input required"}
      </p>
    </div>
  );
}

function ChapterHeading({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3">
        <span
          className="text-5xl font-black tracking-tighter"
          style={{ color: AMBER }}
        >
          {number}
        </span>
        <div>
          <span
            className="block h-0.5 w-8 mb-2"
            style={{ backgroundColor: AMBER }}
          />
          <h2 className="text-xl font-bold uppercase tracking-wide text-stone-900">
            {title}
          </h2>
        </div>
      </div>
    </div>
  );
}

function WebAugmentedBadge() {
  return (
    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
      Web sourced
    </span>
  );
}

function FieldWrapper({
  fieldName,
  confidenceFlags,
  webAugmentedFields,
  children,
}: {
  fieldName: string;
  confidenceFlags: string[];
  webAugmentedFields: string[];
  children: React.ReactNode;
}) {
  const isFlagged = confidenceFlags.includes(fieldName);
  const isWebSourced = webAugmentedFields.includes(fieldName);

  return (
    <div
      className={`relative ${isFlagged ? "pl-4" : ""}`}
      style={isFlagged ? { borderLeft: `3px solid ${AMBER}` } : undefined}
    >
      {children}
      {isWebSourced && (
        <div className="mt-1">
          <WebAugmentedBadge />
        </div>
      )}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold uppercase tracking-widest text-stone-500 mb-3">
      {children}
    </h4>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// InvestmentProposition Component
// ────────────────────────────────────────────────────────────────────────────

interface InvestmentPropositionProps {
  innovation: Innovation;
  innovator: Innovator;
}

export function InvestmentProposition({
  innovation,
  innovator,
}: InvestmentPropositionProps) {
  // Compute total funding ask with M&E addition
  const baseFunding = innovation.funding_ask_base
    ? parseFloat(innovation.funding_ask_base.replace(/[^0-9.]/g, ""))
    : 0;
  const totalFunding = baseFunding + M_AND_E_ADDITION;
  const formattedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(totalFunding);

  return (
    <div className="min-h-screen bg-stone-100 py-12 px-4">
      <article className="max-w-3xl mx-auto">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Document Header */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <header className="mb-12 pb-8 border-b-2 border-stone-200">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-2">
            Investment Proposition
          </p>
          <h1 className="text-4xl font-black tracking-tight text-stone-900 leading-tight">
            {innovation.name ?? "Innovation Name"}
          </h1>
          <p className="mt-3 text-lg text-stone-600">
            {innovator.name ?? "Organisation Name"}
          </p>
        </header>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 01 · What Is This Innovation */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="01" title="What Is This Innovation" />

          {/* Investment Thesis (always placeholder) */}
          <div className="mb-8">
            <Placeholder>
              Why is this innovator worth investing in? What makes the timing right?
            </Placeholder>
          </div>

          {/* Problem */}
          <div className="mb-8">
            <SubLabel>Problem</SubLabel>
            <FieldWrapper
              fieldName="problem_statement"
              confidenceFlags={innovation.confidence_flags}
              webAugmentedFields={innovation.web_augmented_fields}
            >
              {innovation.problem_statement ? (
                <p className="text-stone-700 leading-relaxed">
                  {innovation.problem_statement}
                </p>
              ) : (
                <Placeholder />
              )}
            </FieldWrapper>
          </div>

          {/* Opportunity */}
          <div className="mb-8">
            <SubLabel>Opportunity</SubLabel>
            <FieldWrapper
              fieldName="opportunity_statement"
              confidenceFlags={innovation.confidence_flags}
              webAugmentedFields={innovation.web_augmented_fields}
            >
              {innovation.opportunity_statement ? (
                <p className="text-stone-700 leading-relaxed">
                  {innovation.opportunity_statement}
                </p>
              ) : (
                <Placeholder />
              )}
            </FieldWrapper>
          </div>

          {/* What Is Novel */}
          <div>
            <SubLabel>What Is Novel</SubLabel>
            {innovation.model_steps.length > 0 ? (
              <ul className="space-y-4">
                {innovation.model_steps.map((step, idx) => (
                  <li key={idx} className="flex gap-4">
                    <span
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5"
                      style={{ backgroundColor: AMBER }}
                    >
                      {idx + 1}
                    </span>
                    <p className="text-stone-700 leading-relaxed flex-1">
                      {step}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Placeholder />
            )}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 02 · Pathway to Adoption and Scale */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="02" title="Pathway to Adoption and Scale" />

          {innovation.adoption_pathway_bullets.length > 0 ? (
            <ul className="space-y-4 mb-6">
              {innovation.adoption_pathway_bullets.map((bullet, idx) => (
                <li
                  key={idx}
                  className="flex gap-4 text-stone-700 leading-relaxed"
                >
                  <span
                    className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-white text-xs mt-0.5"
                    style={{ backgroundColor: AMBER }}
                  >
                    ✓
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Placeholder />
          )}

          <div
            className="mt-6 p-4 rounded-lg border-l-4"
            style={{ borderColor: AMBER, backgroundColor: "rgba(239, 159, 39, 0.08)" }}
          >
            <p className="text-stone-700 text-sm font-medium">
              This can be adopted and scaled within existing government systems and budgets.
            </p>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 03 · Economics */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="03" title="Economics" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Cost per teacher now */}
            <div
              className="bg-white rounded-lg p-4 border border-stone-200"
              style={{ borderLeftWidth: "4px", borderLeftColor: AMBER }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">
                Cost / Teacher Now
              </p>
              <p className="text-2xl font-black text-stone-900">
                {innovation.cost_per_teacher_now ?? "—"}
              </p>
            </div>

            {/* Cost per teacher at scale */}
            <div
              className="bg-white rounded-lg p-4 border border-stone-200"
              style={{ borderLeftWidth: "4px", borderLeftColor: AMBER }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">
                Cost / Teacher at Scale
              </p>
              <p className="text-2xl font-black text-stone-900">
                {innovation.cost_per_teacher_scale ?? "—"}
              </p>
            </div>

            {/* Marginal cost */}
            <div
              className="bg-white rounded-lg p-4 border border-stone-200"
              style={{ borderLeftWidth: "4px", borderLeftColor: AMBER }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">
                Marginal Cost at Scale
              </p>
              <p className="text-sm font-semibold text-stone-700 leading-snug">
                {innovation.marginal_cost_at_scale ?? "—"}
              </p>
            </div>

            {/* Funding Ask */}
            <div
              className="bg-white rounded-lg p-4 border border-stone-200"
              style={{ borderLeftWidth: "4px", borderLeftColor: AMBER }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">
                Funding Ask
              </p>
              <p className="text-2xl font-black text-stone-900">
                {innovation.funding_ask_base ?? "—"}
              </p>
              {innovation.funding_ask_duration && (
                <p className="text-xs text-stone-500 mt-1">
                  {innovation.funding_ask_duration}
                </p>
              )}
            </div>
          </div>

          {/* Funding Covers */}
          {innovation.funding_covers.length > 0 && (
            <div className="bg-stone-50 rounded-lg p-5 border border-stone-200">
              <SubLabel>Funding Covers</SubLabel>
              <ul className="space-y-2">
                {innovation.funding_covers.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 text-stone-700 text-sm leading-relaxed"
                  >
                    <span className="text-stone-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 04 · Evidence */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="04" title="Evidence" />

          {innovation.evidence_stats.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {innovation.evidence_stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-5 border border-stone-200"
                  style={{ borderLeftWidth: "4px", borderLeftColor: AMBER }}
                >
                  <p
                    className="text-3xl font-black tracking-tight mb-1"
                    style={{ color: AMBER }}
                  >
                    {stat.number}
                  </p>
                  <p className="text-stone-700 text-sm leading-snug mb-2">
                    {stat.label}
                  </p>
                  <p className="text-stone-400 text-xs">{stat.source}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-8">
              <Placeholder />
            </div>
          )}

          {/* Evidence Interpretation (always placeholder) */}
          <div className="mb-8">
            <SubLabel>What This Signals</SubLabel>
            <Placeholder />
          </div>

          {/* What the Pilot Will Test (To Validate - always placeholder) */}
          <div>
            <SubLabel>What the Pilot Will Test</SubLabel>
            <Placeholder />
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* 05 · The Ask */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="mb-16">
          <ChapterHeading number="05" title="The Ask" />

          {/* Total Funding with M&E */}
          <div className="mb-8 text-center">
            <p
              className="text-5xl font-black tracking-tight"
              style={{ color: AMBER }}
            >
              {formattedTotal}
            </p>
            {innovation.funding_ask_duration && (
              <p className="text-stone-600 mt-1">
                {innovation.funding_ask_duration}
              </p>
            )}
            <p className="text-xs text-stone-400 mt-2">
              Includes $100,000 for independent monitoring and evaluation.
            </p>
          </div>

          {/* Funding Covers (repeated for Ask section context) */}
          {innovation.funding_covers.length > 0 && (
            <div className="mb-8 bg-stone-50 rounded-lg p-5 border border-stone-200">
              <SubLabel>Funding Covers</SubLabel>
              <ul className="grid md:grid-cols-2 gap-3">
                {innovation.funding_covers.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 text-stone-700 text-sm leading-relaxed"
                  >
                    <span style={{ color: AMBER }}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What We Ask From You (always placeholder) */}
          <div className="mb-8">
            <SubLabel>What We Ask From You</SubLabel>
            <Placeholder />
          </div>

          {/* Track Record Footer */}
          {innovator.track_record_description && (
            <div
              className="p-5 rounded-lg border-l-4"
              style={{
                borderColor: AMBER,
                backgroundColor: "rgba(239, 159, 39, 0.05)",
              }}
            >
              <p className="text-stone-700 text-sm leading-relaxed italic">
                {innovator.track_record_description}
              </p>
            </div>
          )}
        </section>


      </article>
    </div>
  );
}

export default InvestmentProposition;
