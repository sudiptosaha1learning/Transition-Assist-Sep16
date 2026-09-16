# Lumina Transition Platform — Cloud Edition

A Docker-free, microservices refactor of the original `lumina-transition-platform`.
Same 7 features, same agents, same look, feel, and navigation — different
deployment model.

## What changed vs. the original

| | Original | This version |
|---|---|---|
| Orchestration | `docker-compose.yml`, 12 containers | Nothing to orchestrate — each backend service is a plain Python process; deploy scripts call `gcloud run deploy` directly |
| Frontend | One 1,361-line `demo-ui/index.html` (vanilla JS) | React (Vite) app, same CSS/classes/behavior, componentized |
| Backend | 7 FastAPI agents + indexer, built via per-service Dockerfiles | Same 7 FastAPI agents + indexer, unchanged business logic, deployed via Cloud Run **source deploy** (Google Cloud Buildpacks build the container for you — no Dockerfile, no local `docker build`) |
| Vector DB | Qdrant container | Qdrant Cloud (managed) |
| Graph DB | Neo4j container | Neo4j AuraDB (managed) |
| Ticket DB | Postgres container | Any managed Postgres (Cloud SQL, Neon, Supabase — your choice) |
| Observability | Grafana + Prometheus + Alertmanager containers | Grafana Cloud (managed) — or skip it; nothing in the 7 nav features depends on it |
| Object storage | MinIO container | Not required by any current feature — add GCS if you build something that needs it |

Nothing about the **agents' behavior, prompts, or the 7-item navigation
structure** changed. The `demo-ui` HTML file's DOM structure, class names,
and CSS variables were ported into React components as directly as
possible so the UI is visually identical.

## Project layout

```
lumina-cloud/
├── backend/
│   ├── services/
│   │   ├── triage/         (port 8001 — P1 incident triage)
│   │   ├── docgen/         (port 8002 — runbook generation)
│   │   ├── codeintel/      (port 8003 — codebase Q&A + overview)
│   │   ├── indexer/        (port 8004 — repo indexing, multi-app registry)
│   │   ├── itsm/           (port 8005 — ITSM ticket analysis)
│   │   ├── docs/           (port 8006 — reference document Q&A)
│   │   └── debt-scanner/   (port 8007 — technical debt scan)
│   │       each dir: main.py, llm_client.py, requirements.txt, Procfile
│   ├── scripts/local-run.sh
│   └── .env.example
├── frontend/                (React + Vite SPA)
│   └── src/
│       ├── components/      Wizard, Header, Sidebar
│       ├── components/scenes/  Overview, CodeIntel, Triage, Runbooks, Itsm, Docs, Debt
│       ├── state/AppContext.jsx
│       └── api.js
└── deploy/
    └── deploy-all.sh        (Cloud Run deploy — no Docker)
```

## Run it locally (no Docker)

**Backend:**
```bash
cd backend
cp .env.example .env
nano .env                 # set OPENAI_API_KEY at minimum
./scripts/local-run.sh    # creates a venv per service, starts all 7 on 8001-8007
```
This uses a local Qdrant by default (`QDRANT_URL=http://localhost:6333`
in `.env.example`) — either run Qdrant yourself (any way you like, it's
just a binary/process, not something this repo forces into Docker) or
switch `.env` to a free Qdrant Cloud cluster immediately, which is often
easier than standing up a local one.

**Frontend** (separate terminal):
```bash
cd frontend
cp .env.example .env.local   # defaults already point at localhost:8001-8007
npm install
npm run dev                   # http://localhost:5173
```

Open `http://localhost:5173`, paste a GitHub repo URL into the wizard,
and the platform behaves exactly like the original.

## Deploy to Google Cloud (no Docker)

1. **Provision managed services** (5–10 minutes, all free-tier eligible):
   - **Qdrant Cloud**: https://cloud.qdrant.io → new cluster → copy URL + API key
   - **Neo4j AuraDB** (optional, powers the graph view only): https://neo4j.com/product/auradb → new instance → copy `neo4j+s://` URI, user, password
   - **Postgres** (optional, triage ticket log only): Cloud SQL, or a free Neon/Supabase project → copy connection string
   - **Grafana Cloud** (optional, observability only — nothing in the 7 features requires it)

2. **Deploy the 7 backend services to Cloud Run:**
   ```bash
   cd backend
   cp .env.example .env
   nano .env   # OPENAI_API_KEY, GCP_PROJECT_ID, QDRANT_URL, QDRANT_API_KEY, etc.
   ../deploy/deploy-all.sh
   ```
   This runs `gcloud run deploy --source ./services/<name>` for each
   service. Cloud Run's buildpack detects `requirements.txt` + `Procfile`
   and builds the container remotely — you never invoke Docker, and
   nothing here writes a Dockerfile. It prints all 7 service URLs at the end.

3. **Build and deploy the frontend as a static site:**
   ```bash
   cd frontend
   # paste the 7 URLs printed above into .env.local
   npm install
   npm run build
   # deploy dist/ anywhere static: Cloud Storage + CDN, Firebase Hosting, etc.
   gcloud storage buckets create gs://YOUR_BUCKET --location=us-central1
   gcloud storage cp -r dist/* gs://YOUR_BUCKET
   gcloud storage buckets update gs://YOUR_BUCKET --web-main-page-suffix=index.html
   ```

Total: 7 Cloud Run services (scale-to-zero, so idle cost is ~$0) + 1
static bucket. No VM, no container registry you manage by hand, no
Dockerfile anywhere in the repo.

## Known limitations carried over / introduced

- **Indexer state is ephemeral.** The app registry (`/tmp/lumina_apps.json`)
  and cloned repo live in `/tmp`, which Cloud Run wipes when an instance
  scales to zero. Fine for demos; for production, move the registry to
  Postgres and set `indexer` `--min-instances=1` (small always-on cost).
- **Git-free cloning fallback** only supports GitHub currently (via
  `codeload.github.com` tarballs). If you need GitLab/Bitbucket and the
  Cloud Run buildpack image lacks `git`, that path will need a similar
  tarball-download fallback added, or deploy that one service with
  `gcloud run deploy --source` pointed at an image that includes git.
- **ServiceNow / Confluence integrations** are unchanged from the
  original — same optional env vars, same behavior.
