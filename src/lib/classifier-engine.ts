// ─────────────────────────────────────────────────────────────────────────────
// TIL RFP Classifier Engine v4.1 — step boundary fixes
//
// What changed from v4.0:
//   1. named_counterparts: step 4 no longer stops; forces explicit two-level check
//   2. government_delivery_roles: step 4 no longer stops; forces documentation check
//   3. cost_ownership_trajectory: step 1 enumerates non-qualifying phrases by name
//      including "procured as a service through standard government mechanisms" and
//      deferred financial agreements
//   4. steady_state_fiscal: steps 1-3 tightened; household comparator and programme
//      comparator explicitly named as non-qualifying; mandatory score 3 where both apply
//
// What changed from v3.4.1:
//   - Stacked IF/AND/BUT/UNLESS conditional rules replaced with explicit
//     numbered decision steps per sub-criterion. The model follows a path,
//     not a rule wall.
//   - Score 4/5 boundaries made explicit and binary for the sub-criteria
//     that showed variance in calibration (government_depth, adoption_readiness,
//     government_decision_mechanisms).
//   - Panel flag instructions moved into the decision steps that trigger them,
//     not stated as separate paragraphs. Reduces the chance the model reads
//     the rule but forgets the flag.
//   - Cost realism rules preserved verbatim from v3.4.1 — they were stable
//     and working.
//   - learning_outcome_evidence_chain carve-out preserved verbatim.
//   - All rubric anchor texts, schema, scoring math, and gate logic unchanged.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// RUBRIC v3 — single source of truth (unchanged from v3.4.1)
// ─────────────────────────────────────────────────────────────────────────────
const RUBRIC = {
  gates: [
    {
      id: "country_theme_fit",
      name: "Country and Theme Fit",
      source: "RFP Section 1 (The Innovation); Section 2 (Pilot Design); Section 3 (Context and Government Partnership)",
      anchors: {
        1: { label: "Clear non-compliance",       text: "Solution does not align with any Innovation Agenda theme description." },
        2: { label: "Major structural ambiguity",  text: "Country/theme selection unclear or contradictory; weak or missing link to one of the four Innovation Themes." },
        3: { label: "Meets minimum",               text: "Eligible country and theme stated but rationale is thin; limited reference to Innovation Agenda or problem fit." },
        4: { label: "Fully compliant",             text: "Eligible country and one Innovation Theme clearly stated; narrative aligns with theme description and FLN focus." },
        5: { label: "Strong contextual grounding", text: "Explicit fit to Innovation Theme with context-specific FLN rationale and references to system constraints or opportunities." },
      },
    },
    {
      id: "scale_duration_compliance",
      name: "Scale and Duration Compliance",
      source: "RFP Section 2.1 (Target geography and participants); Section 2.2 (Implementation timeline)",
      anchors: {
        1: { label: "Clear non-compliance",       text: "Pilot duration outside 6 to 12 month range or fewer than 200 teachers reached." },
        2: { label: "Major structural ambiguity",  text: "Key parameters missing or unclear (duration, teacher count, arms); numbers inconsistent across sections." },
        3: { label: "Meets minimum",               text: "Meets minimum parameters but scale or duration not consistently specified across proposal sections." },
        4: { label: "Fully compliant",             text: "Clear 6 to 12 month plan and eligible scale (200+ teachers) stated consistently with timeline and budget." },
        5: { label: "Strong contextual grounding", text: "Clear reference and response to RFP guidance on scale and duration; phasing logic explained." },
      },
    },
    {
      id: "public_system_embedding",
      name: "Public System Embedding",
      source: "RFP Section 3.2 (Integration with government systems); Section 3.3 (Government role during pilot); Annex B",
      anchors: {
        1: { label: "Clear non-compliance",       text: "Little or no defined role for government counterparts; parallel delivery model." },
        2: { label: "Major structural ambiguity",  text: "Mentions government involvement but delivery and integration roles unclear; reliance on parallel implementation implied." },
        3: { label: "Meets minimum",               text: "Some government roles noted but integration into existing structures and workflows is partial or untested." },
        4: { label: "Fully compliant",             text: "Government cadres and structures used for delivery are specified; roles largely align to existing routines." },
        5: { label: "Strong contextual grounding", text: "Pilot design clearly embeds within government routines (supervision, PLC, curriculum); government leads key delivery functions." },
      },
    },
  ],
  dimensions: [
    {
      id: "government_depth",
      name: "Government Depth & Institutional Anchoring",
      call: 1,
      core_question: "Is the government relationship real and operational, or aspirational?",
      sub: [
        {
          id: "named_counterparts",
          name: "Named government counterparts and roles",
          source: "RFP Section 3.1 (Nature and depth of government engagement); Annex B",
          anchors: {
            1: { label: "No credible engagement",  text: "No counterpart or focal point identified; no ministry unit named." },
            2: { label: "Aspirational only",       text: "General statements of partnership (e.g., 'working with the Ministry') without named focal points, units, or responsibilities." },
            3: { label: "Shallow engagement",      text: "Some specific counterparts or units mentioned but roles, responsibilities, or frequency of engagement not fully defined." },
            4: { label: "Strong, defined roles",   text: "Named individuals or units (title and department) with specified responsibilities during pilot (approvals, oversight, delivery, data review)." },
            5: { label: "Deep embeddedness",       text: "Named counterparts across levels (ministry and district) with time commitments and decision rights; co-leadership evident." },
          },
        },
        {
          id: "documented_engagement",
          name: "Documented engagement (letter, MoU, TWG)",
          source: "RFP Section 3.1 (Nature and depth of government engagement); Annex B (Letters of Government Support)",
          anchors: {
            1: { label: "No credible engagement", text: "No supporting documentation, no explanation of ongoing engagement." },
            2: { label: "Aspirational only",       text: "References to prior conversations without documentation; vague claims of government interest." },
            3: { label: "Shallow engagement",      text: "Some evidence of prior interaction but no formal documentation referencing this specific pilot." },
            4: { label: "Strong, defined roles",   text: "Letters of support, MoU, or evidence of TWG participation included; documents reference the proposed pilot and roles." },
            5: { label: "Deep embeddedness",       text: "Signed MoUs and letters of support with specifics on government commitments, resource allocation, and governance." },
          },
        },
        {
          id: "institutional_home",
          name: "Institutional home identified",
          source: "RFP Section 4.3 (Institutional anchoring); Section 3.1",
          anchors: {
            1: { label: "No credible engagement", text: "No institutional home identified." },
            2: { label: "Aspirational only",       text: "No clear department, directorate, or agency identified; Ministry referenced broadly." },
            3: { label: "Shallow engagement",      text: "Likely home suggested with a plausible rationale; not yet confirmed but consistent with how similar programs sit in the system." },
            4: { label: "Strong, defined roles",   text: "Specific directorate or unit identified with a stated basis for that choice; innovator describes having raised this with government counterparts even if not yet formally confirmed." },
            5: { label: "Deep embeddedness",       text: "Institutional home named and evidenced; at least one documented conversation or written reference from government confirming or endorsing the proposed home." },
          },
        },
        {
          id: "government_delivery_roles",
          name: "Government delivery roles identified",
          source: "RFP Section 3.3 (Government role during pilot); Section 3.2 (Integration with government systems)",
          anchors: {
            1: { label: "No credible engagement", text: "No government delivery role specified." },
            2: { label: "Aspirational only",       text: "Government delivery role implied but not specified; unclear which cadres deliver which activities." },
            3: { label: "Shallow engagement",      text: "Cadres listed (e.g., inspectors, coaches) but tasks, frequency, and supervision structure are vague." },
            4: { label: "Strong, defined roles",   text: "Cadres and tasks specified with some indication of frequency and coordination structure; roles are plausible given the context described." },
            5: { label: "Deep embeddedness",       text: "Government leads core delivery with named individuals or units, clear task allocation, and a credible accountability structure; time commitments or decision rights referenced." },
          },
        },
      ],
    },
    {
      id: "adoption_readiness",
      name: "Adoption Readiness",
      call: 1,
      core_question: "Is there a credible path from pilot to government ownership?",
      sub: [
        {
          id: "transition_logic",
          name: "Clear pilot to scale transition logic",
          source: "RFP Section 4.1 (What it takes to get from pilot to scaling); Section 4.4 (Your organisation's role after the pilot)",
          anchors: {
            1: { label: "No credible pathway",          text: "No mention of adoption transition." },
            2: { label: "Conceptual but unrealistic",   text: "Scale-up referenced but no conditions, decision points, or responsible actors identified." },
            3: { label: "Plausible but incomplete",     text: "Some conditions for adoption identified but decision points are vague and responsible actors are either missing or unnamed." },
            4: { label: "Clear and credible",           text: "Key conditions for adoption stated with named decision points and responsible government units; innovator is honest about what remains uncertain." },
            5: { label: "Decision-ready",               text: "Comprehensive adoption logic with conditions, decision rights, responsible actors, and an explicit account of what could block adoption and how that risk is managed." },
          },
        },
        {
          id: "capacity_shift",
          name: "Plan for government capacity shift",
          source: "RFP Section 4.1 (What it takes to get from pilot to scaling); Cost Template Tab 3 (Scale-Up Pathway); Annex B",
          anchors: {
            1: { label: "No credible pathway",          text: "No plan for government to take on functions; roles remain with applicant throughout." },
            2: { label: "Conceptual but unrealistic",   text: "Capacity building mentioned but not scheduled; IP and licensing arrangements not addressed; handover responsibilities unclear." },
            3: { label: "Plausible but incomplete",     text: "Some training or TA plan described; IP and licensing model referenced but not fully resolved; timelines or ownership arrangements incomplete." },
            4: { label: "Clear and credible",           text: "Clear plan for shifting core functions to government with roles and support described; IP and licensing arrangements stated and compatible with government ownership." },
            5: { label: "Decision-ready",               text: "Detailed capacity shift plan with phased handover; IP and licensing model explicitly designed for government ownership; innovator's residual role after handover is defined and time-bound." },
          },
        },
        {
          id: "adoption_timeline",
          name: "Realistic adoption timeline",
          source: "RFP Section 4.2 (Theory of scale); Cost Template Tab 3 (Scale-Up Pathway: timeline and sequencing)",
          anchors: {
            1: { label: "No credible pathway",          text: "No mention of adoption timeline." },
            2: { label: "Conceptual but unrealistic",   text: "Timeline stated but takes no account of government planning cycles, budget processes, or procurement timelines; appears arbitrarily set." },
            3: { label: "Plausible but incomplete",     text: "Timeline plausible in duration but dependencies on government cycles, policy approvals, or budget allocations are not mapped; sequencing is linear without contingency." },
            4: { label: "Clear and credible",           text: "Phased timeline with key dependencies mapped to government planning and budget cycles; sequencing logic is explained and realistic for the context." },
            5: { label: "Decision-ready",               text: "Timeline accounts for government cycle realities with explicit sequencing, dependencies, and at least one identified bottleneck with a mitigation approach." },
          },
        },
      ],
    },
    {
      id: "cost_realism",
      name: "Cost Realism & Fiscal Fit",
      call: 1,
      core_question: "Do the numbers hold, and can government afford this at scale?",
      sub: [
        {
          id: "pilot_unit_cost",
          name: "Pilot unit cost credibility",
          source: "RFP Section 5.1 (What the pilot costs and who pays); Cost Template Tab '1. Pilot Costs'",
          anchors: {
            1: { label: "Opaque or unrealistic",    text: "No per-teacher or per-activity unit costs; budget is lump sum or activity-level with no cost drivers identified; funding split between TIL, applicant, and government not stated." },
            2: { label: "Major gaps",               text: "Some unit costs present but key drivers missing or implausible; government in-kind contribution implied but not described or valued; material inconsistencies between narrative and budget." },
            3: { label: "Plausible but incomplete", text: "Unit costs stated for main activities with partial assumptions; government contribution described but not fully quantified; minor gaps or inconsistencies remain." },
            4: { label: "Clear fiscal model",       text: "Unit costs stated for all major activities; assumptions explicit; TIL, applicant, and government contributions specified and valued; consistent across narrative and budget." },
            5: { label: "Decision-ready",           text: "Fully specified unit costs with transparent assumptions; government in-kind contribution costed and integrated; figures consistent and cross-checkable across all submitted materials." },
          },
        },
        {
          id: "cost_ownership_trajectory",
          name: "Cost ownership trajectory",
          source: "RFP Section 5.3 (What sustained delivery costs at scale); Cost Template Tab '2. At Scale'",
          anchors: {
            1: { label: "Opaque or unrealistic",    text: "No description of who performs or funds delivery functions at scale; scale picture assumes continued external delivery with no government absorption." },
            2: { label: "Major gaps",               text: "Scale delivery acknowledged but funding sources not distinguished; no indication of which costs government absorbs versus which remain externally funded." },
            3: { label: "Plausible but incomplete", text: "Some description of which functions and costs shift to government at scale; directional but incomplete; reasoning thin or high-cost items left unaddressed." },
            4: { label: "Clear fiscal model",       text: "Clear description of delivery functions at scale with explicit funding attribution; government-absorbable costs distinguished from those requiring new allocation or external support; reasoning stated." },
            5: { label: "Decision-ready",           text: "Fully articulated scale funding picture; government existing budget absorbs core recurring costs; any residual external reliance named, scoped, and time-bound; reasoning is honest about the weakest points." },
          },
        },
        {
          id: "steady_state_fiscal",
          name: "Steady-state fiscal architecture",
          source: "RFP Section 5.2 (Technology ownership and residual costs); Section 5.3; Cost Template Tab '2. At Scale' and Tab '4. Technology Costs'",
          anchors: {
            1: { label: "Opaque or unrealistic",    text: "No consideration of steady-state funding; continued donor support assumed without acknowledgement; no pathway to government-led financing described." },
            2: { label: "Major gaps",               text: "Government sustainability acknowledged in general terms; no specific budget lines identified; core cost drivers at full scale not addressed." },
            3: { label: "Plausible but incomplete", text: "Some government affordability reasoning provided; one or more budget lines identified for cost absorption but material reliance on external funding remains unresolved and unaddressed." },
            4: { label: "Clear fiscal model",       text: "Clear argument for fiscal sustainability grounded in existing or near-term government spending; weakest point in the affordability case identified; residual external costs limited and acknowledged." },
            5: { label: "Decision-ready",           text: "Compelling sustainability case with named government budget lines and current spending references; gap between what government currently spends and what this requires is surfaced and addressed; no unacknowledged donor dependency in the operating model." },
          },
        },
      ],
    },
    {
      id: "innovation_quality",
      name: "Innovation Quality & Technical Clarity",
      call: 2,
      core_question: "Is the intervention well specified, and is the pilot designed to answer the right questions?",
      sub: [
        {
          id: "problem_solution_fit",
          name: "Problem and solution fit",
          source: "RFP Section 1.1 (The specific problem in context); Section 1.2 (What are you testing)",
          anchors: {
            1: { label: "Poor or absent",          text: "No articulation of the FLN problem in context; solution appears disconnected from any stated problem or government system." },
            2: { label: "Generic",                 text: "Generic FLN problem statement with limited local evidence; solution plausible in theory but weak explanation of why it fits this context, these users, or existing curriculum and supervision structures." },
            3: { label: "Some specificity",        text: "Some context specificity in both problem and solution; causal link between them is directional but under-specified; curriculum or supervision alignment referenced but not fully explained." },
            4: { label: "Context-grounded",        text: "Clear, context-grounded problem statement with a well-argued solution fit; explicit adaptations to context, target users, and existing curriculum or supervision standards described." },
            5: { label: "Detailed and specific",   text: "Detailed articulation of the specific FLN problem with triangulated local evidence; solution directly addresses identified drivers with context-responsive adaptations; alignment with curriculum and supervision structures demonstrated, not just asserted." },
          },
        },
        {
          id: "operational_clarity",
          name: "Operational clarity (what changes in practice)",
          source: "RFP Section 1.3 (What the innovation consists of); Section 2.4 (Implementation data you will generate)",
          anchors: {
            1: { label: "Unclear",          text: "Unclear description of what users do differently; components and routines not specified." },
            2: { label: "High-level only",  text: "High-level description of components but limited detail on routines, workflow integration, or roles." },
            3: { label: "Partial",          text: "Describes key activities and some workflow change, but gaps remain in cadence, materials, or responsibilities." },
            4: { label: "Mostly clear",     text: "Operational plan mostly clear: routines, cadence, roles, and required materials or technology are specified and feasible." },
            5: { label: "Fully specified",  text: "Specific hypothesis and causal chain around intervention, including changes to existing processes; low-connectivity practicalities addressed." },
          },
        },
        {
          id: "pilot_learning_architecture",
          name: "Pilot learning architecture",
          source: "RFP Section 1.2 (What are you testing); Section 2.3 (What the pilot is designed to answer)",
          anchors: {
            1: { label: "Absent",                  text: "No articulation of what the pilot is designed to test or answer." },
            2: { label: "Vague",                   text: "General reference to testing or piloting without a stated learning question or comparison logic." },
            3: { label: "Partial",                 text: "Learning question implied but comparison design (A/B, variant, phased rollout) is vague or missing; unclear what evidence the pilot would produce." },
            4: { label: "Clear and credible",      text: "Stated learning question with a comparison or variant design that can generate useful evidence; arms and variables identified." },
            5: { label: "Decision-ready design",   text: "Explicit learning question tied to a well-specified comparison design; arms, sample logic, and expected decision pathways articulated." },
          },
        },
        {
          id: "team_timeline_realism",
          name: "Team and timeline realism",
          source: "RFP Section 2.2 (Implementation timeline); Section 6 (Team and Organisational Capacity); Annex D (Team CVs)",
          anchors: {
            1: { label: "No credible plan",    text: "No mention of implementation plan; team composition unclear." },
            2: { label: "Unrealistic",         text: "Staffing and timeline mentioned but appear unrealistic or misaligned with activities and scale; implausible staffing ratios or missing key roles." },
            3: { label: "Partial",             text: "Feasible at a high level but incomplete: roles, time allocation, or logistics assumptions not fully specified." },
            4: { label: "Clear and feasible",  text: "Clear staffing plan and phased timeline with milestones, dependencies, and responsible owners; FTE or LOE provided." },
            5: { label: "Detailed and robust", text: "Detailed staffing plan, implementation timeline with contingencies, and clear monitoring and risk mitigation systems." },
          },
        },
      ],
    },
    {
      id: "evidence_strength",
      name: "Evidence Strength & Decision Relevance",
      call: 2,
      core_question: "Does the pilot generate evidence that is credible, decision-useful, and connected to learning outcomes?",
      sub: [
        {
          id: "decision_useful_evidence",
          name: "Comprehension of decision-useful evidence",
          source: "RFP Section 2.4 (Implementation data you will generate); Annex C (Evidence Summary)",
          anchors: {
            1: { label: "No comprehension",      text: "No credible monitoring or evidence plan; outcomes, indicators, or sample sizes are not specified." },
            2: { label: "Minimal",               text: "Minimal plan focused on activities and outputs; limited outcome indicators and no sample size or instrument detail." },
            3: { label: "Partial",               text: "Plausible measurement plan with key indicators but incomplete detail on instruments, sample, or validation approach." },
            4: { label: "Clear and credible",    text: "Clear measurement plan with indicators, instruments, sample assumptions, and quality assurance approach; plan is consistent with the pilot design described elsewhere." },
            5: { label: "Decision-ready",        text: "Detailed measurement plan with sample size justification and external validation approach; explicitly addresses what the evidence will and will not be able to show." },
          },
        },
        {
          id: "government_decision_mechanisms",
          name: "Government decision mechanisms",
          source: "RFP Section 4 (Pathway from Pilot to Adoption); Annex B; Annex C",
          anchors: {
            1: { label: "Absent",              text: "No mention of how evidence will inform government adoption decisions." },
            2: { label: "Generic",             text: "Government interest in results referenced but no adoption criteria, decision forum, or responsible decision-makers identified." },
            3: { label: "Partial",             text: "Some adoption criteria or metrics mentioned but the specific forum, timing, or responsible actors for reviewing evidence are unclear." },
            4: { label: "Clear and credible",  text: "Named government decision forum and responsible units identified; adoption criteria linked to pilot evidence outputs; timing of evidence review aligned to government decision cycles." },
            5: { label: "Decision-ready",      text: "Specific adoption metrics agreed or discussed with government; governance structure for evidence review named; go/no-go criteria explicit and grounded in what the pilot measurement plan can actually produce." },
          },
        },
        {
          id: "learning_outcome_evidence_chain",
          name: "Learning outcome evidence chain",
          source: "RFP Section 1.6 (Evidence of effectiveness); Section 2.3 (What the pilot is designed to answer); Annex C",
          anchors: {
            1: { label: "No connection",          text: "No connection drawn between the intervention and student learning outcomes; pilot measures activities or outputs only." },
            2: { label: "Weak",                   text: "Learning outcomes referenced in general terms but no causal logic articulated; unclear how changes in teacher practice would translate to student learning." },
            3: { label: "Plausible but asserted", text: "Plausible causal chain from intervention to teacher practice change to learning outcomes described; pilot measures teaching practice with some outcome indicators but the link between the two is asserted rather than designed for." },
            4: { label: "Clear and credible",     text: "Clear causal chain articulated with teaching practice as the proximate outcome and student learning as the distal outcome; measurement design captures both with credible instruments and a comparison approach." },
            5: { label: "Rigorous",               text: "Rigorous causal design that directly tests the link between the intervention, teacher practice change, and student learning outcomes; measurement approach is capable of producing decision-useful evidence on whether children are learning more." },
          },
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDERS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function buildGateBlock(gate: any): string {
  const lines = [`GATE: ${gate.name.toUpperCase()}\nSource: ${gate.source}`];
  for (let s = 1; s <= 5; s++) lines.push(`${s} — ${gate.anchors[s].label}: ${gate.anchors[s].text}`);
  return lines.join("\n");
}
function buildSubBlock(sub: any): string {
  const lines = [`SUB-CRITERION: ${sub.id}`, `Full name: ${sub.name}`, `Source: ${sub.source}`];
  for (let s = 1; s <= 5; s++) lines.push(`${s} — ${sub.anchors[s].label}: ${sub.anchors[s].text}`);
  return lines.join("\n");
}
function buildDimBlock(dim: any): string {
  const header = [
    `══════════════════════════════════════════════════════════════`,
    `DIMENSION: ${dim.name.toUpperCase()}`,
    `20% | 20 points | Core question: ${dim.core_question}`,
    `Score 3 = minimum acceptable. Most competent proposals cluster 3–4. Score 5 is rare and requires evidence beyond compliance.`,
    `══════════════════════════════════════════════════════════════`,
  ].join("\n");
  return [header, ...dim.sub.map(buildSubBlock)].join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSERVATIVE DEFAULTS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const CONSERVATIVE_RULES = `══════════════════════════════════════════════════════════════
MANDATORY CONSERVATIVE SCORING DEFAULTS
══════════════════════════════════════════════════════════════
1. When genuinely borderline between two adjacent scores, assign the LOWER score. Record both candidates in the borderline fields.
2. Annex references — two cases:
   CASE A: Narrative explicitly references an annex ("see Annex B", "refer to the attached MoU"): score with benefit of the doubt. Set panel_verify to a short string quoting the specific reference. Do NOT set panel_verify to null.
   CASE B: No explicit annex reference: apply strict conservative scoring. Set panel_verify to null.
3. If no evidence can be found for a sub-criterion, score 1. Do not infer beyond what the proposal states.
4. Score 5 requires concrete evidence clearly exceeding the score-4 threshold. When in doubt between 4 and 5, assign 4.
5. Score calibration: most competent proposals cluster 3–4. Score 5 is rare. Score inflation is a classification error.
6. Technology at scale: if the highest-cost at-scale item relies on speculative language ("will explore", "one possible option", "may be needed") rather than a confirmed funding mechanism, award 3 not 4 regardless of how well non-digital costs are covered.`;

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE FORMAT (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const EVIDENCE_FORMAT = `══════════════════════════════════════════════════════════════
EVIDENCE FORMAT — required for every gate and sub-criterion
══════════════════════════════════════════════════════════════
- "extract": verbatim quote (max 150 words) from the proposal justifying the score. Use quotation marks. Write "No evidence found." if absent.
- "interpretation": 1–2 sentences in plain English stating why the extract justifies the score. Never reference internal field names.
- "rubric_anchor": copy the COMPLETE indicator text for the score level awarded.
- "borderline": null if unambiguous. If genuinely borderline, one sentence naming the tension. Also populate borderline_rubric_low and borderline_rubric_high.
- "panel_verify": null by default. Populate with a "P:" string only when a decision step below instructs it.`;

// ─────────────────────────────────────────────────────────────────────────────
// GATE RULES (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const GATE_RULES = `══════════════════════════════════════════════════════════════
HARD GATES — evaluate in sequence
══════════════════════════════════════════════════════════════
A score of 1 or 2 on any gate = gate failure. Set all_gates_passed to false. Continue scoring all dimensions — the panel needs full scores.
Gate scores do not contribute to the weighted total.`;

// ─────────────────────────────────────────────────────────────────────────────
// CALL 1 DECISION PROTOCOLS
// Sequential steps replace stacked conditionals.
// Each sub-criterion has a numbered decision path. Follow steps in order.
// Stop at the first step that yields a definitive score.
// ─────────────────────────────────────────────────────────────────────────────
const DECISION_PROTOCOLS_CALL1 = `══════════════════════════════════════════════════════════════
SCORING DECISION PROTOCOLS — CALL 1
Follow each protocol in step order. Stop at the first definitive score.
These protocols override the conservative defaults where they conflict.
══════════════════════════════════════════════════════════════

━━━ named_counterparts ━━━
STEP 1: Does the proposal name zero government counterparts, focal points, or ministry units?
  → YES: score 1. Stop.
STEP 2: Are counterparts described only in general terms ("the Ministry", "government partners") with no named unit, title, or responsibility?
  → YES: score 2. Stop.
STEP 3: Are some specific units or individuals named but without specified responsibilities, or at only one level of government?
  → YES: score 3. Stop.
STEP 4: Are named units or individuals present at ONE level (national OR district/county) WITH specified responsibilities during the pilot (approvals, oversight, delivery, data review)?
  → YES: before stopping at 4, check step 5.
STEP 5: Are named units or individuals present at BOTH national AND district/county level, each with specified responsibilities?
  → YES: score 5. Stop.
  → NO: score 4. Stop.
NOTE: Individual names are not required for score 5. Named institutional units with specified delivery, oversight, and accountability functions across two levels satisfy step 5. Example: a Deputy Director-General chairing a monthly Pilot Oversight Committee (national) AND District Directors of Education as committee members with district oversight responsibilities (district) = score 5.

━━━ documented_engagement ━━━
STEP 1: Is there no documentation and no explanation of ongoing engagement?
  → YES: score 1. Stop.
STEP 2: Is engagement described only through vague claims or references to prior conversations with no documentation?
  → YES: score 2. Stop.
STEP 3: Is there evidence of prior interaction but no formal document referencing this specific pilot?
  → YES: score 3. Stop.
STEP 4: Does a formal document exist (letter, MoU, TWG participation) that references the proposed pilot and government roles?
  → YES: score 4. Stop. Exception: if the document establishes formal institutional authorisation for work this pilot explicitly extends, AND the narrative references that document, proceed to step 5.
STEP 5: Does the document (a) establish authorisation covering this pilot's specific activities, AND (b) include specifics on government commitments, resource allocation, or governance?
  → YES: score 5. Stop.
  → NO to either condition: score 4. Stop.

━━━ institutional_home ━━━
STEP 1: Is no institutional home identified?
  → YES: score 1. Stop.
STEP 2: Is the Ministry referenced broadly with no specific department, directorate, or agency named?
  → YES: score 2. Stop.
STEP 3: Is a plausible home suggested but not yet raised with government counterparts?
  → YES: score 3. Stop.
STEP 4: Is a specific directorate or unit identified AND has the innovator raised this with government counterparts (even if not yet formally confirmed)?
  → YES: score 4. Stop.
STEP 5: Is the institutional home named AND is there a documented written reference from government (letter, MoU, meeting record) explicitly confirming or endorsing that specific unit as the anchor for this intervention?
  → YES: score 5. Stop.
  → NO: score 4. Stop.
NOTE: General authorisation for ongoing work does not satisfy step 5 unless the letter or MoU explicitly covers this intervention's institutional placement.

━━━ government_delivery_roles ━━━
STEP 1: Is no government delivery role specified?
  → YES: score 1. Stop.
STEP 2: Is a government role implied but not specified — unclear which cadres deliver which activities?
  → YES: score 2. Stop.
STEP 3: Are cadres named (inspectors, coaches, coordinators) but tasks, frequency, and supervision structure are vague?
  → YES: score 3. Stop.
STEP 4: Are cadres named with specific tasks AND some indication of frequency or coordination structure?
  → YES: before stopping at 4, check step 5.
STEP 5: Do government cadres lead core delivery with clear task allocation, a credible accountability structure, AND documented participation (signed agreement, formal task allocation, or referenced annex)?
  → YES: score 5. Stop.
  → NO to documented participation: score 4. Stop.
NOTE: Example of score 5 — SISOs conducting routine PLC monitoring visits on a defined schedule, with GES retaining ownership of all key implementation decisions and District Directors named as committee members with formal oversight responsibilities = score 5.

━━━ transition_logic ━━━
STEP 1: Does the proposal contain language making the pilot design contingent on a future workshop, recommendations process, or prior phase not yet complete ("based on recommendations from", "it is expected that", "ideally we would begin")?
  → YES: score 3 maximum for this sub-criterion. Apply step 2 within that ceiling.
STEP 2 (only if no cap from step 1): Is there no mention of adoption transition at all?
  → YES: score 1. Stop.
STEP 3: Is scale-up referenced but with no conditions, decision points, or responsible actors?
  → YES: score 2. Stop.
STEP 4: Are some conditions identified but decision points vague and responsible actors missing or unnamed?
  → YES: score 3. Stop.
STEP 5: Does the proposal state (a) what the pilot will determine, AND (b) who holds the decision right, AND (c) what evidence will inform that decision?
  → YES: score 5. Stop. Confirmed outcomes are not required. Named uncertainty with a resolution mechanism qualifies.
  → Only (a) and (b) present but not (c): score 4. Stop.
  → Only (a) present: score 3. Stop.

━━━ capacity_shift ━━━
STEP 1: Does the proposal contain language making the design contingent on a future decision not yet made?
  → YES: score 3 maximum. Apply remaining steps within that ceiling.
STEP 2: Does "subsequent funding / will need resources / could continue" language appear?
  → YES: score 3 maximum regardless of other factors.
STEP 3: Is there no plan for government to take on functions?
  → YES: score 1. Stop.
STEP 4: Is capacity building mentioned but unscheduled with IP and licensing unaddressed?
  → YES: score 2. Stop.
STEP 5: Is this a non-digital proposal where materials are co-developed with government AND delivery uses existing government cadres?
  → YES: Does government own IP and data with no dependency on the innovator for rights?
      → YES: score 5 unless a concrete ongoing technical task is identified that government cannot perform without the innovator. If such a task exists: score 4.
      → NO: score 3. Stop.
STEP 6 (digital/EdTech proposals): Does government own IP, data, and licensing with no dependency on the innovator for rights? (TEST 1)
  → NO: score 3. Stop.
STEP 7: Can government operate, maintain, and update the platform without the vendor using its own capacity or a competitively replaceable service? (TEST 2)
  → YES to TEST 2: score 5 if TEST 1 also passed.
  → NO to TEST 2 AND the dependency is explicitly acknowledged AND the maintaining entity is named AND the proposal does not claim government can operate independently: score 4. Stop.
  → NO to TEST 2 AND the proposal claims the dependency is resolved through competitive replaceability, open standards, or vendor-neutral architecture: score 3. Stop. Competitive replaceability is a resolution claim, not an acknowledgment of dependency.

━━━ adoption_timeline ━━━
STEP 1: Does the proposal use "ideally / with subsequent funding / could continue" language?
  → YES: score 3 maximum.
STEP 2: Is there no mention of an adoption timeline?
  → YES: score 1. Stop.
STEP 3: Is a timeline stated but with no account of government planning cycles, budget processes, or procurement timelines?
  → YES: score 2. Stop.
STEP 4: Is the timeline plausible in duration but dependencies on government cycles are not mapped and sequencing has no contingency?
  → YES: score 3. Stop.
STEP 5: Is the timeline phased with dependencies mapped to government planning and budget cycles, and is the sequencing logic explained?
  → YES: score 4. Stop. Proceed to step 6 only if a bottleneck is named.
STEP 6: Does the proposal name the primary bottleneck AND quantify both scale pathways with timeline AND cost implications AND is the pilot designed to resolve which pathway applies?
  → YES to all three: score 5. Stop.
  → YES to bottleneck named but pathways not quantified numerically: score 4. Stop.

━━━ pilot_unit_cost ━━━
STEP 1: Is there no per-teacher or per-activity unit cost; budget is lump sum or activity-level with no cost drivers?
  → YES: score 1. Stop.
STEP 2: Are some unit costs present but key drivers missing or implausible; material inconsistencies between narrative and budget?
  → YES: score 2. Stop.
STEP 3: Are unit costs stated for main activities with partial assumptions; government contribution described but not fully quantified?
  → YES: score 3. Stop.
STEP 4: Are unit costs stated for ALL major activities with explicit assumptions AND TIL, applicant, and government contributions specified and consistent across narrative and budget?
  → YES: score 4. Stop. Proceed to step 5 only if government in-kind is fully costed and integrated.
STEP 5: Are figures consistent and cross-checkable across ALL submitted materials with transparent assumptions and government in-kind costed and integrated?
  → YES: score 5. Stop.
  → NO: score 4. Stop.

━━━ cost_ownership_trajectory ━━━
STEP 1: Is the highest-cost at-scale item a technology subscription, platform service, or recurring digital cost?
  → YES: Does the proposal name a confirmed government budget line or procurement mechanism?
      A confirmed mechanism names the specific budget line, allocation authority, or signed procurement commitment.
      The following phrases are directional and do NOT constitute a confirmed mechanism:
        "procured as a service through standard government mechanisms"
        "county budgets will cover" / "will be funded through existing budgets"
        "no new budget allocation is needed"
        "government will absorb" without a named line item
      Additionally: if the MOU or any referenced agreement explicitly defers financial terms to a future agreement ("a separate agreement shall be developed"), no confirmed mechanism exists regardless of other language.
      → NO confirmed mechanism: score 3. Set panel_verify to "P: Score capped at 3 — recurring digital service cost not confirmed against a named budget line or procurement authority. Panel to probe: what specific budget line or procurement mechanism covers this cost at scale? Has a commitment been secured since submission?" Stop.
      → YES confirmed mechanism: continue to step 2.
  → NO digital cost: continue to step 2.
STEP 2: Is there no description at all of who performs or funds delivery at scale?
  → YES: score 1. Stop.
STEP 3: Is scale delivery acknowledged but funding sources undistinguished?
  → YES: score 2. Stop.
STEP 4: Is there some description of cost shift but reasoning is thin or high-cost items left unaddressed?
  → YES: score 3. Stop.
STEP 5: Is there a clear description of delivery functions at scale with explicit funding attribution AND government-absorbable costs distinguished from those requiring new allocation?
  → YES: score 4. Stop. Proceed to step 6 only if the picture is fully articulated.
STEP 6: Does government's existing budget absorb core recurring costs AND is any residual external reliance named, scoped, and time-bound AND is the reasoning honest about the weakest points?
  → YES: score 5. Stop.
  → NO: score 4. Stop.

━━━ steady_state_fiscal ━━━
STEP 1: Does the highest-cost at-scale digital item use exploratory language ("will explore", "one possible option", "may be needed", "could be absorbed")?
  → YES: score 3. Set panel_verify to "P: Score capped at 3 — highest-cost digital item uses exploratory language on funding mechanism. Panel to probe: has a funding commitment been confirmed since submission? What is the current cost estimate per user at scale, and which government body would carry it?" Stop.
STEP 2: Does the fiscal sustainability argument rely primarily on replacing household or parent expenditure rather than a named government budget line?
  → YES: score 3. Set panel_verify to "P: Score capped at 3 — fiscal sustainability argument rests on replacing household or parent expenditure rather than a named government budget line. Panel to probe: is there a confirmed government procurement line or budget allocation covering this cost independently of household spending?" Stop.
  NOTE: "Parents already spend KES X on paper materials" or equivalent is household expenditure. It is not a government budget line regardless of the cost comparison it enables.
STEP 3: Is a cost comparator used to argue affordability (e.g. "our solution costs 29% of what the county pays for Programme X") without identifying a government budget line for this intervention?
  → YES: this is affordability evidence only, not a funding mechanism. A comparator showing government already spends more on a different programme does not confirm a budget line for this intervention. It cannot lift the score above 3 on its own. Continue to step 4 to check whether a budget line is also named.
  NOTE: Where steps 2 and 3 both apply (household comparator + programme comparator, no named budget line), score 3 is mandatory regardless of how compelling the affordability case appears.
STEP 4: Does the proposal name a specific government budget line AND reference current spending on comparable functions?
  → YES: score 4 minimum. Continue to step 5.
  → NO: score 3. Stop.
STEP 5: Is the weakest point in the affordability case identified and acknowledged, with residual external costs limited?
  → YES: score 4. Stop. Proceed to step 6 only if the case is compelling and complete.
STEP 6: Is there a compelling sustainability case with named budget lines, current spending references, gap analysis between current and required spending, AND no unacknowledged donor dependency?
  → YES: score 5. Stop.
  → NO: score 4. Stop.`;

// ─────────────────────────────────────────────────────────────────────────────
// CALL 2 DECISION PROTOCOLS
// ─────────────────────────────────────────────────────────────────────────────
const DECISION_PROTOCOLS_CALL2 = `══════════════════════════════════════════════════════════════
SCORING DECISION PROTOCOLS — CALL 2
Follow each protocol in step order. Stop at the first definitive score.
These protocols override the conservative defaults where they conflict.
══════════════════════════════════════════════════════════════

━━━ problem_solution_fit ━━━
STEP 1: Is there no articulation of the FLN problem; solution disconnected from any government system?
  → YES: score 1. Stop.
STEP 2: Is the problem statement generic with limited local evidence and weak contextual fit?
  → YES: score 2. Stop.
STEP 3: Is there some context specificity but the causal link is directional and under-specified?
  → YES: score 3. Stop.
STEP 4: Is there a clear context-grounded problem statement with well-argued solution fit AND explicit adaptations to context, target users, and existing curriculum or supervision standards?
  → YES: score 4. Stop. Proceed to step 5 only if local evidence is triangulated.
STEP 5: Is the problem articulated with triangulated local evidence AND the solution directly addresses identified drivers with adaptations demonstrated rather than asserted?
  → YES: score 5. Stop.
  → NO: score 4. Stop.

━━━ operational_clarity ━━━
STEP 1: Is the description of what users do differently absent or unclear; components and routines not specified?
  → YES: score 1. Stop.
STEP 2: Is there only a high-level description with limited detail on routines, workflow integration, or roles?
  → YES: score 2. Stop.
STEP 3: Are key activities and some workflow change described but with gaps in cadence, materials, or responsibilities?
  → YES: score 3. Stop.
STEP 4: Are routines, cadence, roles, and required materials or technology specified and feasible?
  → YES: score 4. Stop. Proceed to step 5 only if low-connectivity practicalities are also addressed.
STEP 5: Is a specific causal chain articulated including changes to existing processes AND low-connectivity practicalities addressed?
  → YES: score 5. Stop.
  → NO: score 4. Stop.

━━━ pilot_learning_architecture ━━━
STEP 1: Does the proposal use conditional language for the comparison design ("could be conducted", "a comparison could be considered", "it would be possible to")?
  → YES: score 3 maximum. The design must be committed to, not hypothetical.
STEP 2: Is there no articulation of what the pilot is designed to test?
  → YES: score 1. Stop.
STEP 3: Is there only a general reference to testing with no stated learning question or comparison logic?
  → YES: score 2. Stop.
STEP 4: Is a learning question implied but the comparison design is vague or missing?
  → YES: score 3. Stop.
STEP 5 (CONDITION A check): Are named arms present with clearly differentiated variables, an explicit counterfactual, and allocation logic that prevents contamination?
  → NO to any element of condition A: score 3. Stop.
  → YES to all of condition A: continue to step 6.
STEP 6 (CONDITION B check): Does the proposal name at least one specific measurement instrument (named classroom observation tool, specific rubric, validated assessment) with who administers it and at what frequency?
  → YES: score 5. Stop.
  → NO: score 4. Stop. References to "external evaluation", "SISO observations", "monitoring data", or unspecified "teaching practice assessment" do not satisfy condition B.

━━━ team_timeline_realism ━━━
STEP 1: Is there no implementation plan and team composition unclear?
  → YES: score 1. Stop.
STEP 2: Is staffing or timeline mentioned but unrealistic or misaligned with activities?
  → YES: score 2. Stop.
STEP 3: Is the plan feasible at a high level but roles, time allocation, or logistics not fully specified?
  → YES: score 3. Stop.
STEP 4: Is there a clear staffing plan with phased timeline, milestones, dependencies, responsible owners, AND FTE or LOE provided?
  → YES: score 4. Stop. Proceed to step 5 only if contingencies are present.
STEP 5: Does the plan include contingency planning for at least one named risk AND cross-dependency mapping showing how delays in one phase affect subsequent phases?
  → YES: score 5. Stop.
  → NO to either: score 4. Stop.

━━━ decision_useful_evidence ━━━
NOTE: TIL funds an independent external evaluation for every selected innovator. Deferring learning outcome measurement to TIL's external evaluation is correct practice. Do not penalise it.
STEP 1: Is the monitoring framework explicitly contingent on a future workshop outcome or recommendations process?
  → YES: score 3 maximum.
STEP 2: Is there no credible monitoring plan; outcomes, indicators, or sample sizes absent?
  → YES: score 1. Stop.
STEP 3: Is the plan focused on activities and outputs with limited outcome indicators and no instrument detail?
  → YES: score 2. Stop.
STEP 4: Is there a plausible measurement plan with key indicators but incomplete detail on instruments, sample, or validation?
  → YES: score 3. Stop.
STEP 5: Are named indicators, named data sources, named collection frequency, AND quality assurance approach present AND consistent with the pilot design?
  → YES: score 4. Stop. Proceed to step 6 only if sample size justification is explicit.
STEP 6: Is there a detailed plan with sample size justification, external validation approach, AND explicit statement of what the evidence will and will not show?
  → YES: score 5. Stop.
  → NO: score 4. Stop.

━━━ government_decision_mechanisms ━━━
STEP 1: Are the only named government structures coordination committees, lessons-learned workshops, or co-design meetings with no mandate linked to scale-up decisions?
  → YES: score 2. A formally constituted MOU-backed committee without an adoption mandate remains score 2.
STEP 2: Is there no mention of how evidence will inform government adoption decisions?
  → YES: score 1. Stop.
STEP 3: Is there only a general reference to government interest in results with no adoption criteria, forum, or responsible decision-maker?
  → YES: score 2. Stop.
STEP 4: Are some adoption criteria or metrics mentioned but the forum, timing, or responsible actors are unclear?
  → YES: score 3. Stop.
STEP 5: Is a named government decision forum present AND adoption criteria linked to pilot evidence outputs AND timing aligned to government decision cycles?
  → YES: score 4. Stop. Proceed to step 6 only if go/no-go logic is explicit.
STEP 6: Is go/no-go logic present specifying both pathways with a named decision-maker AND specific adoption metrics agreed or discussed with government?
  → YES: score 5. Stop.
  → NO: score 4. Stop.
NOTE: A government-chaired body qualifies as a decision forum when BOTH conditions hold: (a) explicit mandate linked to scale-up or adoption decisions, AND (b) the pilot produces the specific evidence needed to decide. A committee that only reviews progress or provides recommendations without an adoption mandate does not qualify regardless of who chairs it.

━━━ learning_outcome_evidence_chain ━━━
STEP 1: Does the stated hypothesis end at improved teaching practice AND does the word "learning" or "outcomes" appear ONLY in general narrative but NOT in the causal hypothesis itself?
  → YES: score 2. General learning ambitions elsewhere in the proposal do not lift this score. Stop.
STEP 2: Does the causal chain explicitly include the teacher-practice-to-student-learning link, even if asserted rather than operationalised?
  → NO: score 2. Stop.
  → YES: score 3 minimum. Continue to step 3.
STEP 3 (GOVERNMENT DATA SYSTEM CARVE-OUT): Does the proposal satisfy ALL THREE conditions:
  (a) Named comparison design with arms, explicit counterfactual, and allocation logic; AND
  (b) Names a government-operated data system that routinely captures learner outcome data as part of its existing function (e.g. national mobile school reporting platform, standardised national assessment system); AND
  (c) Explicitly states the pilot will use that system to analyse the relationship between the intervention and learner outcomes?
  → YES to all three: score 4 is available. Continue to step 4.
  → NO to any condition: continue to step 4 without the carve-out.
STEP 4: Does the pilot measurement design explicitly capture BOTH teacher practice AND student learning with named instruments or specified measures for each?
  → YES: score 4. Stop. This step is also satisfied by step 3 carve-out.
  → NO: score 3. Set panel_verify to "P: Score reflects hypothesis boundary or deferred learning measurement. Panel to probe: does the applicant's government data system capture learner outcome data the pilot can draw on? Is a student learning instrument planned alongside TIL's external evaluation?" Stop.
STEP 5: Is there a rigorous causal design that directly tests the intervention-practice-learning chain AND a measurement approach capable of producing decision-useful evidence on whether children are learning more?
  → YES: score 5. Stop.
  → NO: score 4. Stop.`;

// ─────────────────────────────────────────────────────────────────────────────
// UNSPECIFIED DESIGN RULE (unchanged — applies across both calls)
// ─────────────────────────────────────────────────────────────────────────────
const UNSPECIFIED_DESIGN_RULE = `══════════════════════════════════════════════════════════════
UNSPECIFIED DESIGN RULE
══════════════════════════════════════════════════════════════
This rule applies to dimension scoring only, not to gates.
Where a proposal explicitly states that the pilot design, tools, or approach will be determined by a future workshop, recommendations process, or prior phase whose outcomes are not yet known, the following sub-criteria are capped at score 3:
  capacity_shift, cost_ownership_trajectory, steady_state_fiscal, transition_logic, adoption_timeline.
Trigger phrases: "based on the recommendations from this workshop", "will support the implementation of those recommendations", "it is expected that this work will result in recommendations", "ideally we would begin", or any construction making the pilot design contingent on a future decision not yet made.
This rule does not apply where a proposal has a fully specified design and separately references a review or validation workshop.`;

// ─────────────────────────────────────────────────────────────────────────────
// JSON SCHEMAS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const SUB_SCHEMA = `{ "score": 0, "extract": "", "interpretation": "", "rubric_anchor": "", "borderline": null, "borderline_rubric_low": null, "borderline_rubric_high": null, "panel_verify": null }`;

const CALL1_JSON_SCHEMA = `{
  "applicant": { "name": "", "country": "", "theme": [] },
  "gates": {
    "country_theme_fit": { "score": 0, "pass": true, "extract": "", "interpretation": "", "rubric_anchor": "" },
    "scale_duration_compliance": { "score": 0, "pass": true, "extract": "", "interpretation": "", "rubric_anchor": "" },
    "public_system_embedding": { "score": 0, "pass": true, "extract": "", "interpretation": "", "rubric_anchor": "" }
  },
  "all_gates_passed": true,
  "dimensions": {
    "government_depth": {
      "named_counterparts": ${SUB_SCHEMA},
      "documented_engagement": ${SUB_SCHEMA},
      "institutional_home": ${SUB_SCHEMA},
      "government_delivery_roles": ${SUB_SCHEMA}
    },
    "adoption_readiness": {
      "transition_logic": ${SUB_SCHEMA},
      "capacity_shift": ${SUB_SCHEMA},
      "adoption_timeline": ${SUB_SCHEMA}
    },
    "cost_realism": {
      "pilot_unit_cost": ${SUB_SCHEMA},
      "cost_ownership_trajectory": ${SUB_SCHEMA},
      "steady_state_fiscal": ${SUB_SCHEMA}
    }
  },
  "call1_partial_raw": 0
}`;

const CALL2_JSON_SCHEMA = `{
  "dimensions": {
    "innovation_quality": {
      "problem_solution_fit": ${SUB_SCHEMA},
      "operational_clarity": ${SUB_SCHEMA},
      "pilot_learning_architecture": ${SUB_SCHEMA},
      "team_timeline_realism": ${SUB_SCHEMA}
    },
    "evidence_strength": {
      "decision_useful_evidence": ${SUB_SCHEMA},
      "government_decision_mechanisms": ${SUB_SCHEMA},
      "learning_outcome_evidence_chain": ${SUB_SCHEMA}
    }
  },
  "consistency_notes": [],
  "summary": "",
  "overall_score": 0,
  "recommendation": ""
}`;

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
export const SYSTEM_PROMPT_CALL1 = [
  `You are a classifier for the Elimu-Soko Teaching Innovation Lab (TIL). You evaluate full RFP proposals. The underlying intervention's evidence base and thematic fit were assessed at EOI stage. Your task is execution quality: can this team deliver a credible pilot, within government systems, at a realistic cost, with a plausible pathway to adoption?

METADATA EXTRACTION — populate the applicant object before scoring:
- name: lead organisation name as stated in the proposal
- country: one of: Ghana, Nigeria, Tanzania, Kenya, Ethiopia, South Africa, Mozambique, Cote d'Ivoire, Senegal
- theme: a JSON array of one or more matching themes. The ONLY valid values are exactly:
  "Theme 1 — Structured Pedagogy"
  "Theme 2 — Teacher Coaching and Mentoring"
  "Theme 3 — EdTech-Enabled Learning"
  "Theme 4 — Assessment for Learning"
  If the proposal clearly fits multiple themes, include all matching themes in the array. Do not concatenate, abbreviate, or invent categories. Example: ["Theme 1 — Structured Pedagogy", "Theme 3 — EdTech-Enabled Learning"]
If pre-filled in the user message, use those values. Never leave these fields empty.`,
  CONSERVATIVE_RULES,
  EVIDENCE_FORMAT,
  GATE_RULES,
  ...RUBRIC.gates.map(buildGateBlock),
  ...RUBRIC.dimensions.filter(d => d.call === 1).map(buildDimBlock),
  UNSPECIFIED_DESIGN_RULE,
  DECISION_PROTOCOLS_CALL1,
  `COST TEMPLATE STRUCTURE:
Tab "1. Pilot Costs": authoritative source for pilot_unit_cost.
Tab "2. At Scale": authoritative source for cost_ownership_trajectory.
Tab "3. Scale-Up Pathway": authoritative source for adoption_timeline and transition_logic.
Tab "4. Technology Costs": required for steady_state_fiscal where technology is involved.
Tab "5. Summary": cross-checking totals only.
Where narrative and template are inconsistent, score on the weaker of the two.`,
  `OUTPUT — valid JSON only, no markdown, no preamble:\n${CALL1_JSON_SCHEMA}`,
].join("\n\n");

export const SYSTEM_PROMPT_CALL2 = [
  `You are a classifier for the Elimu-Soko Teaching Innovation Lab (TIL). You are completing the evaluation of a full RFP proposal by scoring the final two dimensions, writing consistency notes, and producing the overall recommendation.`,
  CONSERVATIVE_RULES,
  EVIDENCE_FORMAT,
  ...RUBRIC.dimensions.filter(d => d.call === 2).map(buildDimBlock),
  UNSPECIFIED_DESIGN_RULE,
  DECISION_PROTOCOLS_CALL2,
  `══════════════════════════════════════════════════════════════
CONSISTENCY NOTES
══════════════════════════════════════════════════════════════
Write 3 to 5 notes (1–2 sentences each) identifying:
- Alignments and inconsistencies across proposal sections
- Narrative claims not supported by documentation in the submitted materials
- Tensions between scale-up ambition and fiscal model
- Gaps between the stated hypothesis and the measurement design

SUMMARY: Exactly 2 sentences. First: the single most significant strength, stated concretely. Second: the single most significant gap, stated concretely. Never use internal field names.

RECOMMENDATION: One sentence naming the decision and primary reason. Thresholds: 85–100 Excellent, 75–84 Good, 60–74 Weak, below 60 Fail.

OVERALL SCORE: Set to 0. The system computes the final scaled score.`,
  `OUTPUT — valid JSON only, no markdown, no preamble:\n${CALL2_JSON_SCHEMA}`,
].join("\n\n");

// ─────────────────────────────────────────────────────────────────────────────
// JSON PARSING (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export function safeParseJSON(raw: string): any {
  if (!raw || typeof raw !== "string") return null;
  const attempts = [
    () => JSON.parse(raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim()),
    () => {
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s !== -1 && e > s) return JSON.parse(raw.slice(s, e + 1));
      throw new Error();
    },
    () => {
      const s = raw.indexOf("{");
      if (s === -1) throw new Error();
      let frag = raw.slice(s).replace(/```/g, "");
      let b = 0, br = 0, inS = false, esc = false;
      for (const c of frag) {
        if (esc) { esc = false; continue; }
        if (c === "\\" && inS) { esc = true; continue; }
        if (c === '"') { inS = !inS; continue; }
        if (inS) continue;
        if (c === "{") b++; else if (c === "}") b--;
        else if (c === "[") br++; else if (c === "]") br--;
      }
      let rep = frag.trimEnd().replace(/,\s*$/, "");
      if (inS) rep += '"';
      for (let i = 0; i < br; i++) rep += "]";
      for (let i = 0; i < b; i++) rep += "}";
      return JSON.parse(rep);
    },
  ];
  for (const fn of attempts) { try { return fn(); } catch { } }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING MATH (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export const DIM_DEFS: Record<string, string[]> = {
  government_depth: ["named_counterparts", "documented_engagement", "institutional_home", "government_delivery_roles"],
  adoption_readiness: ["transition_logic", "capacity_shift", "adoption_timeline"],
  cost_realism: ["pilot_unit_cost", "cost_ownership_trajectory", "steady_state_fiscal"],
  innovation_quality: ["problem_solution_fit", "operational_clarity", "pilot_learning_architecture", "team_timeline_realism"],
  evidence_strength: ["decision_useful_evidence", "government_decision_mechanisms", "learning_outcome_evidence_chain"],
};

export const DIM_MAX: Record<string, number> = {
  government_depth: 20,
  adoption_readiness: 15,
  cost_realism: 15,
  innovation_quality: 20,
  evidence_strength: 15,
};

export function getDimScaled(dimData: any, dimKey: string): number {
  if (!dimData) return 0;
  const raw = DIM_DEFS[dimKey].reduce((sum, sub) => {
    return sum + (dimData[sub]?.score || 0);
  }, 0);
  return Math.round((raw / DIM_MAX[dimKey]) * 20);
}

export function computeTotals(call1: any, call2: any): {
  dims: Record<string, number | null>;
  total: number;
  rec: string;
  gatesPassed: boolean;
} | null {
  if (!call1) return null;
  const d1 = call1.dimensions;
  const d2 = call2?.dimensions;
  const dims: Record<string, number | null> = {
    government_depth: getDimScaled(d1?.government_depth, "government_depth"),
    adoption_readiness: getDimScaled(d1?.adoption_readiness, "adoption_readiness"),
    cost_realism: getDimScaled(d1?.cost_realism, "cost_realism"),
    innovation_quality: d2 ? getDimScaled(d2.innovation_quality, "innovation_quality") : null,
    evidence_strength: d2 ? getDimScaled(d2.evidence_strength, "evidence_strength") : null,
  };
  const total = Object.values(dims).reduce<number>((s, v) => s + (v ?? 0), 0);
  let rec = "Fail";
  if (total >= 85) rec = "Excellent";
  else if (total >= 75) rec = "Good";
  else if (total >= 60) rec = "Weak";
  return { dims, total, rec, gatesPassed: call1.all_gates_passed ?? true };
}

// ─────────────────────────────────────────────────────────────────────────────
// RUBRIC ANCHOR INJECTION (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export function injectRubricAnchors(call1: any, call2: any): void {
  for (const gate of RUBRIC.gates) {
    const g = call1?.gates?.[gate.id];
    if (g && g.score >= 1 && g.score <= 5) {
      g.rubric_anchor = gate.anchors[g.score as 1|2|3|4|5].text;
    }
  }
  for (const dim of RUBRIC.dimensions) {
    const src = dim.call === 1 ? call1?.dimensions : call2?.dimensions;
    const dimData = src?.[dim.id];
    if (!dimData) continue;
    for (const sub of dim.sub) {
      const s = dimData[sub.id];
      if (s && s.score >= 1 && s.score <= 5) {
        s.rubric_anchor = sub.anchors[s.score as 1|2|3|4|5].text;
      }
    }
  }
}