# AITID — AI Threat Intelligence Dashboard

Real-time threat intelligence for AI models and distribution vectors. Monitors OpenAI, Anthropic Claude, Microsoft Copilot, and OSS/HuggingFace models across supply chain, MCP, IDE extension, and API attack surfaces.

Test branch note: this README includes a small edit on the `test` branch.

## Stack

- **Frontend**: Astro (SSR) — deployed to Vercel
- **API**: Astro API routes on Vercel Serverless Functions
- **Pipeline**: Vercel Cron Jobs (every 6 hours)
- **Storage**: Vercel KV (Upstash Redis)
- **Classifier**: Claude API (model configurable via env var)
- **Sources**: NVD, GitHub Advisory DB, CISA KEV, JFrog, npm

---

## Deploy to Vercel (15 minutes)

### 1. Push to GitHub Enterprise

```bash
cd aitid
git init
git remote add origin https://your-ghe-instance/your-org/aitid.git
git add .
git commit -m "Initial AITID deployment"
git push -u origin main
```

### 2. Create Vercel project

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import from GitHub (connect your GHE instance if needed)
3. Select the `aitid` repo
4. Framework preset: **Astro**
5. Click **Deploy** (first deploy will use seed data — that's fine)

### 3. Add Vercel KV storage

1. In your Vercel project → **Storage** → **Create Database** → **KV**
2. Connect the KV database to your project
3. Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` — no manual step needed

### 4. Set environment variables

In Vercel project → **Settings** → **Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Required for live classification |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Or `claude-opus-4-5` for higher accuracy |
| `CRON_SECRET` | random string | Protects pipeline trigger endpoint |
| `GITHUB_TOKEN` | `ghp_...` | Optional — increases GHSA rate limit from 60→5000/hr |
| `NVD_API_KEY` | from nvd.nist.gov | Optional — increases NVD rate limit |
| `SIEM_TYPE` | `sentinel` / `splunk` / etc. | Leave blank until ready |
| `SIEM_WEBHOOK_URL` | your SIEM endpoint | Leave blank until ready |
| `SIEM_SECRET` | your SIEM token | Leave blank until ready |
| `SIEM_MIN_SEVERITY` | `high` | Minimum severity to forward to SIEM |

### 5. Trigger first pipeline run

After deploy, seed the KV store with live data:

```bash
curl -X POST https://your-aitid.vercel.app/api/pipeline/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"lookbackDays": 30}'
```

This runs a 30-day backfill. Takes ~2-5 minutes depending on advisory volume.

From then on, Vercel Cron runs the pipeline automatically every 6 hours.

---

## Manual pipeline trigger

```bash
# Normal run (last 7 days)
curl -X POST https://your-aitid.vercel.app/api/pipeline/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Force reclassify everything (useful after changing ANTHROPIC_MODEL)
curl -X POST https://your-aitid.vercel.app/api/pipeline/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"lookbackDays": 14, "forceReclassify": true}'
```

---

## API reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/threats` | GET | All threats, sorted by blended severity |
| `/api/threats?model=openai-gpt4o` | GET | Filter by model tag |
| `/api/threats?severity=critical` | GET | Filter by severity |
| `/api/threats?type=supply-chain` | GET | Filter by threat type |
| `/api/threats?q=mcp` | GET | Full-text search |
| `/api/stats` | GET | Dashboard metrics |
| `/api/pipeline/run` | POST | Trigger pipeline (requires Authorization header) |

---

## SIEM integration

Once you have the dashboard running, enable SIEM forwarding by adding env vars:

```bash
SIEM_TYPE=sentinel
SIEM_WEBHOOK_URL=https://your-workspace.azure.com/...
SIEM_SECRET=your-shared-key
SIEM_MIN_SEVERITY=high  # critical | high | medium
```

Threats above the minimum severity are automatically forwarded as STIX 2.1 objects.

Supported targets:
- **Microsoft Sentinel** — Log Analytics workspace ingestion API
- **Splunk** — HTTP Event Collector (HEC)
- **Elastic** — Elasticsearch ingest API
- **CrowdStrike Falcon** — Custom IOC / event API
- **Generic webhook** — Any REST endpoint

---

## Customising the model list

Edit `src/lib/types.ts` to add or remove model tags, then update the `MODEL_FILTERS` object in `src/pages/index.astro` to match.

---

## Local development

```bash
npm install
cp .env.example .env
# Fill in at minimum ANTHROPIC_API_KEY

# Run without KV (uses in-memory store + seed data)
npm run dev

# Run pipeline locally to test classifiers
npm run pipeline:seed   # loads seed threats into local store
npm run pipeline:run    # runs live pipeline against real APIs
```

---

## Architecture

```
Vercel Cron (every 6h)
    │
    ▼
/api/pipeline/run
    │
    ├── fetchAllSources()        ← NVD, GHSA, CISA KEV, JFrog, npm
    │       └── isAIRelevant()   ← keyword filter for AI/ML signals
    │
    ├── classifyBatch()          ← Claude API enrichment
    │       └── toStruct Threat  ← severity, score, TTPs, IOCs, mitigations
    │
    ├── saveThreat()             ← Vercel KV
    └── computeAndSaveStats()    ← dashboard metrics
    
Dashboard (Astro SSR)
    ├── /                        ← server-rendered shell + metrics
    ├── /api/threats             ← cached JSON, 5min TTL
    └── /api/stats               ← cached JSON, 60s TTL
```

3-26-2-36
