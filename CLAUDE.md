# TIL RFP Classifier

Batch-scores education proposals (RFPs) using Claude AI, with human review and override workflow.

## Tech Stack

- **Next.js 16** (App Router, React 19, TypeScript 5)
- **Tailwind CSS v4** with dark mode (`dark:` variants, OS media query)
- **Supabase** (PostgreSQL) for persistence
- **Anthropic API** (Claude Opus) for scoring
- **Google Drive API** for proposal ingestion via OAuth 2.0
- **XLSX** (`xlsx` package) for cost template extraction

## Commands

```bash
npm run dev       # Dev server on localhost:3000
npm run build     # Production build
npm start         # Start production server
npm run lint      # ESLint
```

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ANTHROPIC_API_KEY=
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Main page: 6 tabs (Batch, Review, Analytics, Longitudinal, Country)
│   ├── layout.tsx                # Root layout with GoogleAuthWrapper
│   └── api/score/route.ts        # Claude scoring endpoint (two-call)
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── google-auth.tsx            # Google OAuth context + token refresh
│   ├── gdrive.ts                 # GDrive folder scanning
│   ├── gdrive-download.ts        # PDF/XLSX download & extraction
│   ├── batch-runner.ts           # Batch orchestration + resume
│   └── classifier-engine.ts      # Rubric, prompts, scoring schema (v4.1)
└── components/
    ├── folder-scanner.tsx         # GDrive root folder input
    ├── preflight-table.tsx        # Proposal manifest before scoring
    ├── batch-progress.tsx         # Live batch progress
    ├── portfolio-table.tsx        # Scored proposals list + filtering + lock
    ├── score-card.tsx             # Detailed review card + overrides + pilot financials
    ├── analytics-dashboard.tsx    # Cross-batch analytics
    ├── longitudinal-view.tsx      # Sub-criterion confirm/override across proposals
    ├── country-view.tsx           # Country-grouped scorecards + HTML export
    └── panelist-picker.tsx        # Reviewer selection modal
```

## Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `batches` | Batch metadata (name, folder, status, version) |
| `proposals` | Proposal records linked to GDrive files |
| `classifier_results` | AI scoring output: `call1_json`, `call2_json`, gates, totals |
| `panel_overrides` | Panelist score overrides/confirms with audit trail |
| `panelists` | Reviewer names and IDs |

## Scoring Architecture

Two sequential Claude API calls per proposal:

- **Call 1**: 3 hard gates + dimensions 1-3 (Government Depth, Adoption Readiness, Cost Realism) + pilot_financials extraction
- **Call 2**: dimensions 4-5 (Innovation Quality, Evidence Strength) + consistency notes + recommendation

### Dimensions & Scaling

All 5 dimensions scored 1-5 raw, then normalized to /20:
```
Math.round((raw / DIM_MAX[dimKey]) * 20)
```
Where `DIM_MAX = { government_depth: 20, adoption_readiness: 15, cost_realism: 15, innovation_quality: 20, evidence_strength: 15 }`

Total = 5 × 20 = 100. Bands: >=85 Excellent, >=75 Good, >=60 Weak, <60 Fail.

### Review Workflow

- All 17 sub-criteria must be confirmed (via `panel_overrides`) before a proposal can be locked
- Score Card and Longitudinal View share `panel_overrides` table — confirms sync automatically
- A "confirm" = `original_score === override_score` with empty rationale; an "override" = different scores
- Lock records who locked (initials shown in portfolio table)

## Key Conventions

- Default model: `claude-opus-4-20250514` (no model selection UI)
- Batch runner retries: 5 attempts with escalating backoff (30s, 60s, 90s, 120s, 150s)
- Stale `classifier_results` deleted on batch resume to avoid unique constraint errors
- Google token auto-refreshes every 60s; retries GDrive downloads on 401
- `pilot_financials` stored inside `call1_json` JSONB — no separate table
- Path alias: `@/*` → `./src/*`

## Deployment

Deployed on **Vercel**. Auto-deploys on push to `main`. Ensure all env vars are set in Vercel project settings.

Body size limit: 20MB (for base64 PDF payloads). Max duration: 600s.
