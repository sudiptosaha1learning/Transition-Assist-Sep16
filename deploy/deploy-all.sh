#!/usr/bin/env bash
# Deploys all 7 backend microservices to Cloud Run.
#
# IMPORTANT: this does NOT use Docker, docker-compose, or a Dockerfile.
# `gcloud run deploy --source` hands your source dir to Google Cloud
# Buildpacks, which detects the Procfile + requirements.txt and builds
# the container FOR you, remotely, on Google's infrastructure. You never
# run `docker build` and don't need Docker installed locally.
#
# Prereqs:
#   - gcloud CLI installed and authenticated (`gcloud auth login`)
#   - backend/.env filled in (OPENAI_API_KEY at minimum)
#   - A Qdrant Cloud cluster (and Neo4j AuraDB, if you want the graph
#     view) already created — see ../README.md "Managed services" section
#
# Usage:
#   cd backend
#   cp .env.example .env   # fill in values
#   ../deploy/deploy-all.sh

set -euo pipefail
cd "$(dirname "$0")/../backend"

if [ ! -f .env ]; then
  echo "Missing backend/.env — copy .env.example to .env and fill in values first."
  exit 1
fi
set -a; source .env; set +a

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID in backend/.env}"
: "${GCP_REGION:=us-central1}"
: "${OPENAI_API_KEY:?Set OPENAI_API_KEY in backend/.env}"

gcloud config set project "$GCP_PROJECT_ID" >/dev/null

# Common env vars passed to every service. Cloud Run injects PORT itself —
# do not set it here.
COMMON_ENV="OPENAI_API_KEY=${OPENAI_API_KEY},GEMINI_API_KEY=${GEMINI_API_KEY:-},LLM_MODEL=${LLM_MODEL:-gpt-4o-mini},QDRANT_URL=${QDRANT_URL:-},QDRANT_API_KEY=${QDRANT_API_KEY:-}"

deploy_service() {
  local svc="$1"
  local dir="services/$svc"
  local extra_env="${2:-}"
  local env_vars="$COMMON_ENV"
  [ -n "$extra_env" ] && env_vars="${env_vars},${extra_env}"

  echo ""
  echo "════════════════════════════════════════════════"
  echo " Deploying lumina-$svc"
  echo "════════════════════════════════════════════════"
  gcloud run deploy "lumina-$svc" \
    --source "$dir" \
    --region "$GCP_REGION" \
    --allow-unauthenticated \
    --min-instances=0 \
    --max-instances=3 \
    --memory=512Mi \
    --set-env-vars="$env_vars" \
    --set-build-env-vars="GOOGLE_PYTHON_VERSION=3.13"
}

has_element() {
  local element="$1"
  shift
  for el in "$@"; do
    if [ "$el" == "$element" ]; then
      return 0
    fi
  done
  return 1
}

# Decide which services to deploy based on CLI arguments
SERVICES=("$@")
if [ ${#SERVICES[@]} -eq 0 ]; then
  SERVICES=(triage docgen codeintel indexer itsm docs debt-scanner)
fi

echo "Services selected for deployment: ${SERVICES[*]}"

if has_element triage "${SERVICES[@]}"; then
  deploy_service triage        "PG_URL=${PG_URL:-}"
fi
if has_element docgen "${SERVICES[@]}"; then
  deploy_service docgen
fi
if has_element codeintel "${SERVICES[@]}"; then
  deploy_service codeintel
fi
if has_element indexer "${SERVICES[@]}"; then
  deploy_service indexer       "NEO4J_URI=${NEO4J_URI:-},NEO4J_USER=${NEO4J_USER:-neo4j},NEO4J_PASSWORD=${NEO4J_PASSWORD:-}"
fi
if has_element itsm "${SERVICES[@]}"; then
  deploy_service itsm          "SNOW_INSTANCE=${SNOW_INSTANCE:-},SNOW_USER=${SNOW_USER:-},SNOW_PASSWORD=${SNOW_PASSWORD:-}"
fi
if has_element docs "${SERVICES[@]}"; then
  deploy_service docs
fi
if has_element debt-scanner "${SERVICES[@]}"; then
  deploy_service debt-scanner
fi

echo ""
echo "════════════════════════════════════════════════"
echo " All services deployed. Fetching URLs..."
echo "════════════════════════════════════════════════"
for svc in triage docgen codeintel indexer itsm docs debt-scanner; do
  url=$(gcloud run services describe "lumina-$svc" --region "$GCP_REGION" --format='value(status.url)')
  echo "$svc -> $url"
done

echo ""
echo "Next step: paste these URLs into frontend/.env.local as VITE_TRIAGE_URL,"
echo "VITE_DOCGEN_URL, etc. (see frontend/.env.example), then:"
echo "  cd ../frontend && npm install && npm run build"
echo "and deploy the resulting dist/ folder to any static host — e.g."
echo "  gcloud storage buckets create gs://YOUR_BUCKET --location=$GCP_REGION"
echo "  gcloud storage cp -r dist/* gs://YOUR_BUCKET"
echo "  gcloud storage buckets update gs://YOUR_BUCKET --web-main-page-suffix=index.html"
echo "or Firebase Hosting (`firebase deploy`) if you prefer a CLI you already know."
