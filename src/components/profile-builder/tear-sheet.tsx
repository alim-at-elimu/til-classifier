"use client";

import { FileText, X } from "lucide-react";

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

// ────────────────────────────────────────────────────────────────────────────
// Helper Components
// ────────────────────────────────────────────────────────────────────────────

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "amber" | "outline";
}) {
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  const variants = {
    default: "bg-stone-100 text-stone-700",
    amber: "text-white",
    outline: "border border-stone-300 text-stone-600",
  };
  return (
    <span
      className={`${base} ${variants[variant]}`}
      style={variant === "amber" ? { backgroundColor: AMBER } : undefined}
    >
      {children}
    </span>
  );
}

function WebAugmentedBadge() {
  return (
    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
      Web sourced
    </span>
  );
}

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
    <div className="relative border-2 border-dashed border-stone-300 rounded-lg p-4 bg-stone-50/50">
      <div className="absolute -top-2.5 left-3">
        <NeedsInputBadge />
      </div>
      <p className="text-stone-400 italic text-sm mt-2">
        {children || "Human input required"}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 mb-3">
      {children}
    </h3>
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
      className={`relative ${isFlagged ? "pl-3" : ""}`}
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

// ────────────────────────────────────────────────────────────────────────────
// TearSheet Component
// ────────────────────────────────────────────────────────────────────────────

interface TearSheetProps {
  innovation: Innovation;
  innovator: Innovator;
  onDeleteDocument?: (documentPath: string) => void;
}

export function TearSheet({ innovation, innovator, onDeleteDocument }: TearSheetProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-stone-100 py-10 px-4">
      <article className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Header */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <header className="px-8 pt-8 pb-6 border-b border-stone-100">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-stone-900 tracking-tight leading-tight">
                {innovator.name ?? "Organisation Name"}
              </h1>
              <p className="mt-2 text-stone-600 text-sm leading-relaxed max-w-2xl">
                {innovator.track_record_description ?? (
                  <span className="italic text-stone-400">
                    Track record description not provided
                  </span>
                )}
              </p>
              {/* Meta pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                {innovator.country && <Badge variant="outline">{innovator.country}</Badge>}
                {innovator.founded_year && (
                  <Badge variant="outline">Est. {innovator.founded_year}</Badge>
                )}
                {innovator.team_size && (
                  <Badge variant="outline">Team: {innovator.team_size}</Badge>
                )}
                {innovator.org_type && <Badge variant="outline">{innovator.org_type}</Badge>}
                {innovator.african_led && <Badge variant="amber">African-led</Badge>}
              </div>
            </div>
            {/* Stage & Evidence badges */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {innovation.stage && <Badge variant="amber">{innovation.stage}</Badge>}
              {innovation.evidence_status && (
                <Badge variant="default">{innovation.evidence_status}</Badge>
              )}
            </div>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Innovation Title & Theme */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="px-8 py-6 bg-stone-50 border-b border-stone-100">
          {innovation.theme && (
            <p className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-1">
              Theme: {innovation.theme}
            </p>
          )}
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: AMBER }}
          >
            {innovation.name ?? "Innovation Name"}
          </h2>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Investment Thesis (always placeholder per spec) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="px-8 py-6 border-b border-stone-100">
          <SectionLabel>Investment Thesis</SectionLabel>
          <Placeholder>
            Why is this innovator worth investing in? What makes the timing right?
          </Placeholder>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Problem & Opportunity */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="px-8 py-6 border-b border-stone-100">
          <div className="grid md:grid-cols-2 gap-8">
            <FieldWrapper
              fieldName="problem_statement"
              confidenceFlags={innovation.confidence_flags}
              webAugmentedFields={innovation.web_augmented_fields}
            >
              <SectionLabel>Problem</SectionLabel>
              {innovation.problem_statement ? (
                <p className="text-stone-700 text-sm leading-relaxed">
                  {innovation.problem_statement}
                </p>
              ) : (
                <Placeholder />
              )}
            </FieldWrapper>

            <FieldWrapper
              fieldName="opportunity_statement"
              confidenceFlags={innovation.confidence_flags}
              webAugmentedFields={innovation.web_augmented_fields}
            >
              <SectionLabel>Opportunity</SectionLabel>
              {innovation.opportunity_statement ? (
                <p className="text-stone-700 text-sm leading-relaxed">
                  {innovation.opportunity_statement}
                </p>
              ) : (
                <Placeholder />
              )}
            </FieldWrapper>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* How It Works */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="px-8 py-6 border-b border-stone-100">
          <SectionLabel>How It Works</SectionLabel>
          {innovation.model_steps.length > 0 ? (
            <ol className="space-y-4">
              {innovation.model_steps.map((step, idx) => (
                <li key={idx} className="flex gap-4">
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: AMBER }}
                  >
                    {idx + 1}
                  </span>
                  <p className="text-stone-700 text-sm leading-relaxed pt-0.5">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <Placeholder />
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Pilot Scope */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="px-8 py-6 border-b border-stone-100">
          <SectionLabel>Pilot Scope</SectionLabel>
          <FieldWrapper
            fieldName="pilot_scope"
            confidenceFlags={innovation.confidence_flags}
            webAugmentedFields={innovation.web_augmented_fields}
          >
            {innovation.pilot_scope ? (
              <p className="text-stone-700 text-sm leading-relaxed">
                {innovation.pilot_scope}
              </p>
            ) : (
              <Placeholder />
            )}
          </FieldWrapper>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Two-Column: Government Relationships + Evidence */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="px-8 py-6 border-b border-stone-100">
          <div className="flex flex-col md:flex-row gap-0 md:gap-0">
            {/* Government Relationships */}
            <div className="flex-1 pr-0 md:pr-8 pb-6 md:pb-0 border-b md:border-b-0 md:border-r border-stone-200">
              <SectionLabel>Government Relationships</SectionLabel>
              {innovation.government_relationships.length > 0 ? (
                <ul className="space-y-3">
                  {innovation.government_relationships.map((rel, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-stone-700 leading-relaxed"
                    >
                      <span className="font-medium">{rel.country}</span>
                      <span className="text-stone-400"> — </span>
                      <span>{rel.ministry}</span>
                      <span className="text-stone-400"> ({rel.status})</span>
                      {rel.focal_point && (
                        <span
                          className="ml-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: AMBER }}
                        >
                          Focal
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <Placeholder />
              )}
            </div>

            {/* Evidence Stats */}
            <div className="flex-1 pl-0 md:pl-8 pt-6 md:pt-0">
              <SectionLabel>Evidence</SectionLabel>
              {innovation.evidence_stats.length > 0 ? (
                <div className="space-y-4">
                  {innovation.evidence_stats.map((stat, idx) => (
                    <div
                      key={idx}
                      className="pl-4"
                      style={{ borderLeft: `3px solid ${AMBER}` }}
                    >
                      <p
                        className="text-2xl font-bold tracking-tight"
                        style={{ color: AMBER }}
                      >
                        {stat.number}
                      </p>
                      <p className="text-stone-700 text-sm leading-snug">
                        {stat.label}
                      </p>
                      <p className="text-stone-400 text-xs mt-1">{stat.source}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <Placeholder />
              )}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Economics */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="px-8 py-6 border-b border-stone-100">
          <SectionLabel>Economics</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Cost per teacher now */}
            <div className="pl-4" style={{ borderLeft: `3px solid ${AMBER}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">
                Cost / Teacher Now
              </p>
              <p className="text-xl font-bold text-stone-900">
                {innovation.cost_per_teacher_now ?? "—"}
              </p>
            </div>
            {/* Cost per teacher at scale */}
            <div className="pl-4" style={{ borderLeft: `3px solid ${AMBER}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">
                Cost / Teacher at Scale
              </p>
              <p className="text-xl font-bold text-stone-900">
                {innovation.cost_per_teacher_scale ?? "—"}
              </p>
            </div>
            {/* Marginal cost */}
            <div className="pl-4" style={{ borderLeft: `3px solid ${AMBER}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">
                Marginal Cost at Scale
              </p>
              <p className="text-sm font-medium text-stone-700 leading-snug">
                {innovation.marginal_cost_at_scale ?? "—"}
              </p>
            </div>
            {/* Funding Ask */}
            <div className="pl-4" style={{ borderLeft: `3px solid ${AMBER}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 mb-1">
                Funding Ask
              </p>
              <p className="text-xl font-bold text-stone-900">
                {innovation.funding_ask_base ?? "—"}
              </p>
              {innovation.funding_ask_duration && (
                <p className="text-xs text-stone-500 mt-0.5">
                  {innovation.funding_ask_duration}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Maturity Assessment */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="px-8 py-6 border-b border-stone-100">
          <SectionLabel>Maturity Assessment</SectionLabel>
          <div className="border border-stone-200 rounded-lg overflow-hidden">
            {/* Demonstrated */}
            <div className="flex">
              <div className="w-36 shrink-0 bg-stone-100 px-4 py-3 border-r border-stone-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">
                  Demonstrated
                </span>
              </div>
              <div className="flex-1 px-4 py-3 bg-white">
                <FieldWrapper
                  fieldName="maturity_demonstrated"
                  confidenceFlags={innovation.confidence_flags}
                  webAugmentedFields={innovation.web_augmented_fields}
                >
                  {innovation.maturity_demonstrated ? (
                    <p className="text-stone-700 text-sm leading-relaxed">
                      {innovation.maturity_demonstrated}
                    </p>
                  ) : (
                    <Placeholder />
                  )}
                </FieldWrapper>
              </div>
            </div>
            {/* To Validate (always placeholder) */}
            <div className="flex border-t border-stone-200">
              <div className="w-36 shrink-0 bg-stone-100 px-4 py-3 border-r border-stone-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">
                  To Validate
                </span>
              </div>
              <div className="flex-1 px-4 py-3 bg-white">
                <Placeholder />
              </div>
            </div>
            {/* Outlook (always placeholder) */}
            <div className="flex border-t border-stone-200">
              <div className="w-36 shrink-0 bg-stone-100 px-4 py-3 border-r border-stone-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">
                  Outlook
                </span>
              </div>
              <div className="flex-1 px-4 py-3 bg-white">
                <Placeholder />
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* The Ask */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="px-8 py-6 border-b border-stone-100">
          <SectionLabel>The Ask</SectionLabel>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">
                For Funders
              </p>
              <Placeholder />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-2">
                For Governments
              </p>
              <Placeholder />
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Adoption Pathway */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <section className="px-8 py-6 border-b border-stone-100">
          <SectionLabel>Adoption Pathway</SectionLabel>
          {innovation.adoption_pathway_bullets.length > 0 ? (
            <ul className="space-y-2">
              {innovation.adoption_pathway_bullets.map((bullet, idx) => (
                <li key={idx} className="flex gap-3 text-stone-700 text-sm leading-relaxed">
                  <span style={{ color: AMBER }}>✓</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Placeholder />
          )}
        </section>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Source Documents */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {innovation.documents.length > 0 && (
          <section className="px-8 py-6">
            <SectionLabel>Source Documents</SectionLabel>
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                      Document
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                      Size
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                      Uploaded
                    </th>
                    <th className="w-12 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {innovation.documents.map((doc, idx) => (
                    <tr
                      key={idx}
                      className={`${idx !== innovation.documents.length - 1 ? "border-b border-stone-100" : ""} hover:bg-stone-50/50 transition-colors`}
                    >
                      <td className="px-4 py-3">
                        <a
                          href={doc.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-stone-700 hover:text-stone-900 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{doc.name}</span>
                        </a>
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {doc.type}
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {formatFileSize(doc.size)}
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {formatDate(doc.uploaded_at)}
                      </td>
                      <td className="px-4 py-3">
                        {onDeleteDocument && (
                          <button
                            onClick={() => onDeleteDocument(doc.path)}
                            className="p-1.5 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            aria-label={`Delete ${doc.name}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </article>
    </div>
  );
}

export default TearSheet;
