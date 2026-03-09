// ─────────────────────────────────────────────────────────────────────────────
// TIL RFP Classifier Engine v3.4 — extracted for batch pipeline
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// RUBRIC v3 — single source of truth
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
// PROMPT BUILDERS
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
    `Score 3 = minimum acceptable. Most competent proposals cluster 3–4. Score 5 requires evidence beyond compliance.`,
    `══════════════════════════════════════════════════════════════`,
  ].join("\n");
  return [header, ...dim.sub.map(buildSubBlock)].join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING RULES
// ─────────────────────────────────────────────────────────────────────────────
const CONSERVATIVE_RULES = `══════════════════════════════════════════════════════════════
MANDATORY CONSERVATIVE SCORING RULES — apply to every score
══════════════════════════════════════════════════════════════
1. When genuinely borderline between two adjacent scores, assign the LOWER score. Record both candidates and the tension in the borderline fields.
2. Annex references — TWO CASES, apply strictly:
   CASE A — Narrative explicitly references an annex (e.g. "see Annex B", "refer to the attached MoU", "as set out in Annex C"): score with benefit of the doubt, treating the referenced content as present. Set "panel_verify" to a short string quoting the specific reference (e.g. "Narrative cites 'see Annex B for signed MoU' — panel to confirm content on receipt"). Do NOT set panel_verify to null in this case.
   CASE B — No explicit annex reference in the narrative text for this sub-criterion: apply strict conservative scoring. No benefit of the doubt. Set "panel_verify" to null.
3. Evidence Anchoring: if no evidence can be found for a sub-criterion, score it 1. Do not infer or extrapolate beyond what the proposal text explicitly states.
4. Score 5 requires concrete, verifiable evidence clearly exceeding the score-4 threshold. When in doubt between 4 and 5, assign 4.
5. Score calibration: most competent proposals cluster between 3 and 4. Score 5 is rare. Score inflation is a classification error.
6. Cross-reference: if the narrative claims government partnership but Annex B contains no letter of support AND no explicit reference to an annex is made, score Documented Engagement based on documentation actually present, not the narrative claim.
7. Technology and platform cost at scale — adequacy test: for cost ownership trajectory and steady-state fiscal sustainability, if the highest-cost at-scale item (technology licensing, AI inference, platform hosting, vendor subscription) relies on speculative or exploratory language ("one possible option", "will explore", "may be needed", "could be absorbed") rather than a confirmed funding mechanism or named budget line, award 3 not 4, regardless of how well the non-digital costs are covered.`;

const EVIDENCE_FORMAT = `══════════════════════════════════════════════════════════════
EVIDENCE FORMAT — required for every gate and sub-criterion
══════════════════════════════════════════════════════════════
- "extract": verbatim quote (max 50 words) that most directly justifies the score. Use quotation marks. Write "No evidence found." if absent.
- "interpretation": 1 sentence (2 max if genuinely complex) stating why the extract justifies the score. Write in plain English for a non-technical reviewer. Never reference internal field names.
- "rubric_anchor": copy the COMPLETE indicator text from the rubric for the score level awarded.
- "borderline": null if unambiguous. If genuinely borderline, one sentence naming the tension. Also populate "borderline_rubric_low" and "borderline_rubric_high".
- "panel_verify": null unless Case A annex rule applies.`;

const GATE_RULES = `══════════════════════════════════════════════════════════════
HARD GATES — evaluate in sequence, flag failures
══════════════════════════════════════════════════════════════
A score of 1 or 2 on any gate = FLAG as gate failure. Still score all dimensions. The panel needs full scores to make informed decisions.
Gate scores do not contribute to the weighted score. If any gate scores 1 or 2, set all_gates_passed to false but continue scoring all dimensions normally.`;

const CALIBRATION_ADDITIONS_CALL1 = `══════════════════════════════════════════════════════════════
SCORING DECISION RULES — CALL 1
══════════════════════════════════════════════════════════════
These are binding decision rules. Apply them before awarding any score. They override general conservative rules where they conflict.

── named_counterparts ──
IF named institutional units with defined responsibilities across multiple levels (national AND district/county or equivalent) → score 5. Individual names are not required. Decision rights do not need to be separately stated if the units have specified delivery, oversight, and accountability functions. In government systems where staff are deployed by unit and role rather than by individual name, named institutional units (e.g., DEE Monitoring and Evaluation Unit, regional inspectorates, IEF planners) with specified delivery roles across national and sub-national levels satisfy score 5. Do not penalise the absence of individual names where the proposal names units with clear functions at multiple levels and documents active engagement with those units.
IF named individuals or units at only one level, OR responsibilities are vague or generic → score 4.

── documented_engagement ──
IF referenced annex establishes formal institutional authorisation for work this pilot directly extends, AND narrative explicitly references that annex → score 5. A pilot-specific letter is not required if the authorisation covers ongoing work the proposal explicitly extends.
IF letter or MoU exists but does not reference this specific pilot AND no explicit annex reference in narrative → score 4 maximum.

── institutional_home ──
HARD RULE: A letter or authorization that grants permission to engage with government counterparts in an existing workstream does not constitute endorsement of the proposed institutional home for a new pilot. Score 5 requires a documented reference — in a letter, MoU, or recorded meeting — that explicitly confirms or endorses the specific directorate or unit proposed as the institutional anchor for this intervention. General authorization for ongoing work does not satisfy this condition. Where the only documentation references prior or parallel work rather than this specific pilot's institutional placement, score 4 maximum. Exception: where the pilot is explicitly designed as a direct extension or refinement of an existing government-authorized workstream, and the letter or MoU authorizes the specific activities the pilot continues, the authorization covers this intervention. In such cases, score 5 if the institutional home is named, the unit is actively engaged, and the authorization is current.

── government_delivery_roles ──
IF government cadres are named by role (inspectors, school directors, coordinators) with specific tasks, signed participation agreements or documented task allocation, and some indication of frequency or coordination → score 5. Individual names are not required for score 5. The test is whether the delivery structure is operational and documented, not whether individual staff are named in the proposal.

── transition_logic ──
IF proposal names (a) what the pilot will determine, (b) who holds the decision right, AND (c) what evidence will inform the decision → score 5. Confirmed outcomes are not required. Acknowledged uncertainty with a named resolution mechanism is not a weakness.
IF conditions for adoption are named with responsible actors but decision evidence is not specified → score 4.
IF transition depends on recommendations not yet made, OR uses language "based on recommendations from / it is expected that / ideally" → score 3 maximum.

── adoption_timeline ──
IF timeline names the primary bottleneck AND quantifies both pathways (with timeline and cost implications) AND the pilot is designed to resolve which pathway applies → score 5. Every government cycle does not need to be mapped.
IF phased timeline with dependencies mapped to government cycles but no named bottleneck → score 4.
IF timeline uses "ideally / with subsequent funding / could continue" → score 3 maximum.

── capacity_shift ──
Apply in sequence:
TEST 1: Does government own IP, data, and licensing with no dependency on innovator for rights?
TEST 2: Can government operate, maintain, and update the system without the vendor, using its own technical capacity or a competitively replaceable service?

IF non-digital proposal with physical materials co-developed with government AND delivery uses existing government cadres → TEST 2 is satisfied by the delivery model. Score 5 if TEST 1 also satisfied, unless a specific operational dependency is named.
Phased handover language ("progressively assuming," "over time," "as capacity strengthens") does not constitute a specific operational dependency for non-digital proposals. Score 5 applies unless a concrete ongoing technical or operational task is identified that government cannot perform without the innovator.
HARD RULE: The non-digital exception above does not apply to proposals where the core platform or application is proprietary software operated by the vendor. For proprietary platform models, the existing digital scoring rules apply regardless of data ownership arrangements, open standards claims, or competitive replaceability arguments. Government owning data or standards while a vendor operates the platform is score 4 maximum if the dependency is explicitly acknowledged, the maintaining entity is named, and the governance or IP arrangement is described. Score 3 applies when the dependency is unacknowledged, claimed as resolved when it is not, or when the proposal asserts government operational independence that is not credible given the technical architecture described.
IF digital/EdTech AND TEST 1 passed BUT TEST 2 failed (platform proprietary, vendor required for maintenance/updates) → apply the proprietary platform rule above. Score 4 if dependency is explicitly acknowledged as an ongoing requirement and the maintaining entity is named with no claim that government can replace the vendor or operate independently. Score 3 if the proposal claims the dependency is resolved through competitive replaceability, open standards, or vendor-neutral architecture when the core application remains proprietary. Claiming that government can switch vendors is not equivalent to acknowledging the dependency. Competitive replaceability is a resolution claim, not an acknowledgment. The test: does the proposal say "this entity will maintain the platform and government cannot do it alone" (score 4) or does the proposal say "government is not dependent because it can switch vendors" (score 3)?
IF "subsequent funding / will need resources / could continue" language present → score 3 maximum regardless of other factors.
HARD RULE — UNSPECIFIED DESIGN: This rule applies only to dimension scoring. It does not affect gate evaluation (country_theme_fit, scale_duration_compliance, public_system_embedding). Gates must be evaluated solely against their own rubric criteria. Where a proposal explicitly states that the pilot design, tools, or approach will be determined by a future workshop, recommendations process, or prior phase whose outcomes are not yet known, the following three sub-criteria are capped at score 3: capacity_shift, cost_ownership_trajectory, steady_state_fiscal. You cannot assess the fiscal or operational sustainability of a design that has not yet been specified. Trigger phrases include: "based on the recommendations from this workshop", "will support the implementation of those recommendations", "it is expected that this work will result in recommendations", "ideally we would begin", or any construction that makes the pilot design contingent on a future decision not yet made. This rule does not apply where a proposal has a fully specified design and separately references a review or validation workshop.

── cost_ownership_trajectory ──
IF the highest-cost at-scale item is a technology subscription, platform service, or recurring digital cost AND the proposal does not name a confirmed government budget line or procurement mechanism for that cost → score 3 maximum. Language such as "procured as a service through standard government mechanisms" or "will be funded through county budgets" without naming the specific budget line, allocation, or procurement authority is directional but not confirmed. This rule applies even if non-digital delivery costs are well covered by existing government systems.

── steady_state_fiscal ──
IF proposal names specific government budget lines AND references current spending on comparable functions → score 4 minimum.
IF proposal makes generic absorption argument (costs will absorb into existing training/supervision budgets) WITHOUT referencing the budget envelope or current spending levels → score 3 maximum. Naming government budget categories (e.g., "existing professional development budgets," "operational budgets," "routine supervision costs") without referencing current spending levels, per-unit costs at scale, or the size of the budget envelope is a generic absorption argument and scores 3 maximum.
IF highest-cost at-scale item (AI inference, platform subscription, technology licensing) uses "will explore / one possible option / may be needed" → score 3 maximum. This rule applies even if all non-digital costs are well covered.
IMPORTANT: Referencing what government currently spends on a different programme as a cost comparator (e.g., "our solution costs 29% of what the county pays for Programme X") is not the same as identifying a budget line for this intervention. Comparators demonstrate affordability but do not constitute a funding mechanism. Score 4 requires that the proposal identifies where in the government budget this cost will sit, not merely that government could afford it relative to other spending.
HARD RULE: Consumer or household spending patterns (e.g. "parents already spend X on paper materials") are not equivalent to a named government budget line. Where the fiscal sustainability argument relies on replacing parent or household expenditure rather than referencing a specific government budget allocation, spending envelope, or confirmed procurement line, the score is 3 maximum.`;

const CALIBRATION_ADDITIONS_CALL2 = `══════════════════════════════════════════════════════════════
SCORING DECISION RULES — CALL 2
══════════════════════════════════════════════════════════════
These are binding decision rules. Apply them before awarding any score. They override general conservative rules where they conflict.

── pilot_learning_architecture ──
Score 5 requires BOTH of the following. If either is absent, score 4 maximum.
  CONDITION A (design architecture): named arms, comparison logic, allocation rationale.
  CONDITION B (measurement specification): named instrument or observation protocol, outcome being measured, who administers it, and at what frequency.
"We will measure teaching practice" is NOT specification. "TIL's external evaluation will assess outcomes" is NOT specification. "We will track implementation fidelity" is NOT specification.
IF CONDITION A present AND CONDITION B absent → score 4. Do not award 5.
BINDING CHECK: Before awarding score 5, verify that the proposal names at least one specific measurement instrument (e.g., a named classroom observation tool, a specific rubric, a validated assessment) with who administers it and when. If the only measurement references are "external evaluation," "SISO observations," "monitoring data," "usage logs," or unspecified "teaching practice assessment," CONDITION B is not met. Score 4 maximum.
Score 4 requires that CONDITION A is fully met: named arms with clearly differentiated variables, an explicit counterfactual, and allocation logic that prevents contamination. A factorial or multi-arm design label is not sufficient if the comparison logic is implicit rather than explicit. If the arms are named but the counterfactual is not clearly specified, or if the variables being isolated are not explicitly stated per arm, score 3.
HARD RULE: Conditional commitment language in the learning design is not equivalent to a named comparison design. Phrases such as "could be conducted", "a comparison could be considered", "it would be possible to", or any construction that does not commit to the design as proposed scores 3 maximum regardless of the quality of the surrounding design logic. A learning architecture that might happen is not a learning architecture.

── decision_useful_evidence ──
TIL funds an independent external evaluation for every selected innovator. Deferring learning outcome measurement to TIL's external evaluation is correct practice. Do not penalise it.
IF proposal specifies intermediate indicators, data sources, and collection frequency for its own implementation monitoring → score 4.
IF implementation monitoring plan is thin or intermediate indicators are poorly specified → score 3.
HARD CEILING: Score 4 requires that the implementation monitoring plan is specific to this pilot: named indicators, named data sources, named collection frequency. A monitoring framework that is explicitly contingent on a future workshop outcome or recommendations process is not a specified monitoring plan — score 3 maximum.

── government_decision_mechanisms ──
Score on whether a named government body is positioned to make an adoption decision based on pilot evidence. A well-designed pilot alone is not sufficient, but a pilot that is explicitly designed to answer the adoption questions combined with a government body mandated to act on those answers constitutes a decision mechanism.

IF named forum with explicit adoption mandate AND adoption criteria linked to pilot evidence AND go/no-go logic specifying both pathways with decision-maker named → score 5.
IF named forum with adoption mandate AND criteria linked to evidence BUT go/no-go logic absent → score 4.
IF some adoption criteria or government review referenced BUT no named forum, no responsible actor, no timing → score 3.
IF only named structures are a coordination/monitoring committee OR a lessons-learned workshop OR co-design meetings → score 2. These are not decision mechanisms.

Hard rule: Do not infer a decision forum from pilot design logic alone. A committee qualifies as a decision forum when BOTH conditions hold: (a) the committee has an explicit mandate linked to scale-up planning or adoption decisions, AND (b) the pilot design produces the specific evidence the committee needs to decide. Go/no-go logic can be embedded in the pilot design rather than stated as a separate committee protocol. If the pilot is explicitly designed to answer the questions that determine whether to scale, and a named government-chaired body is mandated to act on those findings, that combination constitutes a decision mechanism. Score 5 applies when the committee mandate, the pilot evidence, and the scale-up pathways are connected in the proposal. A committee that only reviews progress, shares findings, or provides recommendations without a mandate linked to adoption does not qualify regardless of who chairs it or whether it is backed by an MOU. Concrete scoring examples: a government-chaired Pilot Oversight Committee mandated to prepare a national scale-up plan, where the pilot tests the two questions that determine the scale-up pathway, and both pathways are quantified with cost and timeline implications = score 5. A Joint Steering Committee established by MOU that oversees implementation and provides recommendations for scale-up, but where the adoption criteria are not linked to specific pilot evidence and go/no-go pathways are not quantified = score 3. A coordination committee or co-design platform with no adoption mandate = score 2.
Hard rule: HARD CEILING FOR WEAK MECHANISMS: Where the only named government structures are (a) a coordination or co-design committee with no mandate linked to scale-up decisions, (b) a lessons-learned or recommendations workshop, or (c) general expressions of intent to share findings, the score is 2. A formally constituted committee established by a signed MOU does not automatically lift this score. MOU-backed coordination committees with no adoption mandate, no adoption criteria, and no link to scale-up decisions remain at score 2. Score 3 requires at least one specific, measurable condition linked to pilot evidence that is named in the proposal.

── learning_outcome_evidence_chain ──
IF stated hypothesis ends at improved teaching practice AND does not address how practice change translates to student learning → score 2. General references to "improved learning" elsewhere in the narrative do not rescue a hypothesis that stops at teacher practice.
IF causal chain explicitly includes the teacher-practice-to-student-learning link, even if asserted rather than operationalised → score 3 minimum.
Score 4 requires that the pilot measurement design explicitly captures BOTH teacher practice AND student learning with named instruments or specified measures for each. If the pilot measures teaching practice with specified instruments but defers student learning measurement entirely to TIL's external evaluation without specifying its own learning outcome measures, the score is 3. The chain from practice to learning is asserted, not designed for.
HARD CEILING: Where the stated hypothesis ends at improved instructional practice and the word "learning" or "outcomes" appears only in general narrative elsewhere but NOT in the causal hypothesis itself, the score is 2. This ceiling is not lifted by external evidence citations or general learning ambitions stated elsewhere in the proposal.

── team_timeline_realism ──
IF staffing plan names individuals with LOE AND timeline is phased with milestones AND dependencies are mapped → score 4.
Score 5 requires additionally: contingency planning for at least one named risk, AND cross-dependency mapping showing how delays in one phase affect subsequent phases. A detailed plan without contingencies is score 4, not 5.

── adoption_timeline ──
Score 5 requires ALL THREE of the following: (1) primary bottleneck named explicitly, (2) both pathways quantified with timeline AND cost implications, (3) pilot is designed to resolve which pathway applies. Naming a bottleneck without quantifying both pathways is score 4 maximum. Qualitative descriptions of pathway differences ("simpler scaling" vs "requires investment") without numerical timelines or cost estimates do not satisfy condition (2).`;

// ─────────────────────────────────────────────────────────────────────────────
// JSON SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────
const SUB_SCHEMA = `{ "score": 0, "extract": "", "interpretation": "", "rubric_anchor": "", "borderline": null, "borderline_rubric_low": null, "borderline_rubric_high": null, "panel_verify": null }`;

const CALL1_JSON_SCHEMA = `{
  "applicant": { "name": "", "country": "", "theme": "" },
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
  `You are a classifier for the Elimu-Soko Teaching Innovation Lab (TIL). You evaluate full RFP proposals. The underlying intervention's evidence base and thematic fit were assessed at EOI stage. Your task is execution quality: can this team deliver a credible pilot, within government systems, at a realistic cost, with a plausible pathway to adoption, and a measurement design capable of generating decision-useful evidence on learning outcomes?

METADATA EXTRACTION — populate the applicant object before scoring:
- name: lead organisation name as stated in the proposal
- country: must be one of: Ghana, Nigeria, Tanzania, Kenya, Ethiopia, South Africa, Mozambique, Cote d'Ivoire, Senegal
- theme: match to one of: Theme 1 — Structured Pedagogy, Theme 2 — Teacher Coaching and Mentoring, Theme 3 — EdTech-Enabled Learning, Theme 4 — Assessment for Learning
If Organisation, Country, or Theme are pre-filled in the user message, use those values. If a field says "(extract from document)", extract it from the proposal text. Never leave these fields empty.`,
  CONSERVATIVE_RULES,
  EVIDENCE_FORMAT,
  GATE_RULES,
  ...RUBRIC.gates.map(buildGateBlock),
  ...RUBRIC.dimensions.filter(d => d.call === 1).map(buildDimBlock),
  CALIBRATION_ADDITIONS_CALL1,
  `COST TEMPLATE STRUCTURE — reference by tab name when scoring:
Tab "1. Pilot Costs": Real numbers. Pilot parameters (teacher counts, duration, arms), full cost-of-delivery breakdown split between TIL-funded, applicant-funded, and government in-kind. This is the authoritative source for pilot_unit_cost.
Tab "2. At Scale": Qualitative. Who performs each delivery function during the pilot vs. at scale, with reasoning. Authoritative source for cost_ownership_trajectory.
Tab "3. Scale-Up Pathway": Qualitative. What needs to change to get from pilot to scale, who is responsible, dependencies, and sequencing. Authoritative source for adoption_timeline and transition_logic.
Tab "4. Technology Costs": Vendor-set. Annual post-pilot technology costs (hosting, licensing, maintenance). Required for steady_state_fiscal where technology is involved.
Tab "5. Summary": Auto-calculated from Tabs 1 and 4. Use for cross-checking totals only.
Where narrative (Section 5) and template are inconsistent, score based on the weaker of the two. If no template is submitted and cost data is embedded in the narrative, assess from that material.`,
  `OUTPUT — valid JSON only, no markdown, no preamble:\n${CALL1_JSON_SCHEMA}`,
].join("\n\n");

export const SYSTEM_PROMPT_CALL2 = [
  `You are a classifier for the Elimu-Soko Teaching Innovation Lab (TIL). You are completing the evaluation of a full RFP proposal by scoring the final two dimensions, writing consistency notes, and producing the overall recommendation.`,
  CONSERVATIVE_RULES,
  EVIDENCE_FORMAT,
  ...RUBRIC.dimensions.filter(d => d.call === 2).map(buildDimBlock),
  CALIBRATION_ADDITIONS_CALL2,
  `══════════════════════════════════════════════════════════════
CONSISTENCY NOTES
══════════════════════════════════════════════════════════════
Write 3 to 5 notes (1–2 sentences each) identifying:
- Alignments and inconsistencies across proposal sections
- Narrative claims not supported by documentation actually present in the submitted materials
- Tensions between scale-up ambition and fiscal model
- Gaps between the stated hypothesis and the measurement design

SUMMARY: Exactly 2 sentences. First sentence: the single most significant strength, stated concretely. Second sentence: the single most significant gap, stated concretely. Never use internal field names.

RECOMMENDATION: One sentence that names the decision and the primary reason for it. Use the recommendation label that corresponds to the call1_scaled_partial plus your Call 2 sub-criterion scores. The label thresholds are: 85–100 Excellent, 75–84 Good, 60–74 Weak, below 60 Fail.

OVERALL SCORE: Set to 0. The system computes the final scaled score.`,
  `OUTPUT — valid JSON only, no markdown, no preamble:\n${CALL2_JSON_SCHEMA}`,
].join("\n\n");

// ─────────────────────────────────────────────────────────────────────────────
// JSON PARSING
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
// SCORING MATH
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