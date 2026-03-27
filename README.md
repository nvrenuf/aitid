# ThreatParallax

ThreatParallax is an AI Threat Intelligence Platform for security leaders and analysts tracking model-linked threats, distribution vectors, operational exposure, and conservative regional map context across the current non-production deployment.

Phase III keeps the existing Vercel deployment model and current repo name in place while extending the route-based product with a dedicated Threats workflow, canonical threat detail pages, clearer evidence framing, and more operational Threat Map drilldowns. Domain cutover remains out of scope.

## Product surfaces

- `/overview`: primary leadership and analyst workspace, including the existing dashboard/feed internals
- `/threats`: operator-oriented corpus scanning with search, filters, and sort controls
- `/threats/[slug]`: canonical threat detail pages for direct review and deep linking
- `/threat-map`: conservative map surface for observed infrastructure and exposure geography
- `/research`: light methodology, source, and cadence framing

## Stack

- Frontend: Astro SSR
- API: Astro API routes on Vercel Serverless Functions
- Pipeline: Vercel Cron Job (every 15 minutes)
- Storage: Vercel KV (Upstash Redis)
- Classifier: Claude API
- Sources: NVD, GitHub Advisory DB, CISA KEV, JFrog, npm

## Deploy to Vercel

### 1. Push the repo

```bash
git init
git remote add origin https://github.com/your-org/aitid.git
git add .
git commit -m "Initial ThreatParallax deployment"
git push -u origin main
```

### 2. Create the Vercel project

1. Open `vercel.com` and create a new project.
2. Import the repository.
3. Select the `aitid` repo.
4. Use the `Astro` framework preset.
5. Deploy. The first deploy can run against seed data.

### 3. Add KV storage

1. In the Vercel project, open `Storage`.
2. Create a `KV` database.
3. Connect it to the project so `KV_REST_API_URL` and `KV_REST_API_TOKEN` are injected automatically.

### 4. Set environment variables

Add these in Vercel project settings:

| Variable | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Required for live classification |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Optional override |
| `CRON_SECRET` | random string | Protects the pipeline trigger endpoint |
| `GITHUB_TOKEN` | `ghp_...` | Optional, raises GHSA rate limits |
| `NVD_API_KEY` | from `nvd.nist.gov` | Optional, raises NVD rate limits |
| `SIEM_TYPE` | `sentinel` / `splunk` / etc. | Leave blank until needed |
| `SIEM_WEBHOOK_URL` | your SIEM endpoint | Leave blank until needed |
| `SIEM_SECRET` | your SIEM token | Leave blank until needed |
| `SIEM_MIN_SEVERITY` | `high` | Minimum severity forwarded |

### 5. Trigger the first pipeline run

```bash
curl -X POST https://your-aitid.vercel.app/api/pipeline/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"lookbackDays": 30}'
```

This performs an initial backfill. After that, Vercel Cron runs the pipeline automatically every 15 minutes.

## Manual pipeline trigger

```bash
# Standard run
curl -X POST https://your-aitid.vercel.app/api/pipeline/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Force reclassification
curl -X POST https://your-aitid.vercel.app/api/pipeline/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"lookbackDays": 14, "forceReclassify": true}'
```

## API reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/threats` | GET | All threats, sorted by blended severity |
| `/api/threats?model=openai-gpt4o` | GET | Filter by model tag |
| `/api/threats?severity=critical` | GET | Filter by severity |
| `/api/threats?type=supply-chain` | GET | Filter by threat type |
| `/api/threats?q=mcp` | GET | Full-text search |
| `/api/stats` | GET | Dashboard metrics |
| `/api/threat-map` | GET | Threat Map dataset, regional aggregation, and coverage limits |
| `/api/pipeline/run` | POST | Trigger pipeline, requires authorization |

## SIEM integration

Once the dashboard is running, enable forwarding with:

```bash
SIEM_TYPE=sentinel
SIEM_WEBHOOK_URL=https://your-workspace.azure.com/...
SIEM_SECRET=your-shared-key
SIEM_MIN_SEVERITY=high
```

Threats above the configured minimum severity are forwarded as STIX 2.1 objects.

Supported targets:

- Microsoft Sentinel
- Splunk HEC
- Elastic
- CrowdStrike Falcon
- Generic webhook

## Local development

```bash
npm install
cp .env.example .env

# Run without KV
npm run dev

# Run smoke tests
npm test

# Seed local data
npm run pipeline:seed

# Run the live pipeline locally
npm run pipeline:run
```

## Architecture

```text
Vercel Cron (every 15 minutes)
  |
  v
/api/pipeline/run
  |
  +-- fetchAllSources()
  +-- classifyBatch()
  +-- saveThreat()
  +-- computeAndSaveStats()

Dashboard (Astro SSR)
  +-- /overview
  +-- /threats
  +-- /threats/[slug]
  +-- /threat-map
  +-- /research
  +-- /api/threats
  +-- /api/stats
  +-- /api/threat-map
```
