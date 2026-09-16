#!/usr/bin/env bash
# Runs all 7 backend microservices as plain local Python processes.
# No Docker, no docker-compose — just venvs + uvicorn.
#
# Usage:
#   cd backend
#   cp .env.example .env   # fill in OPENAI_API_KEY at minimum
#   ./scripts/local-run.sh
#
# Stop with Ctrl+C (traps and kills all child processes).

set -euo pipefail
cd "$(dirname "$0")/.."   # -> backend/

if [ ! -f .env ]; then
  echo "Missing backend/.env — copy .env.example to .env and fill in OPENAI_API_KEY first."
  exit 1
fi
set -a; source .env; set +a

SERVICES=(triage:8001 docgen:8002 codeintel:8003 indexer:8004 itsm:8005 docs:8006 debt-scanner:8007)
PIDS=()

cleanup() {
  echo ""
  echo "Stopping all services..."
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM

for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  port="${entry##*:}"
  dir="services/$svc"

  if [ ! -d "$dir/.venv" ]; then
    echo "[$svc] creating venv + installing deps (first run only)..."
    python3 -m venv "$dir/.venv"
    "$dir/.venv/bin/pip" install --quiet --upgrade pip
    "$dir/.venv/bin/pip" install --quiet -r "$dir/requirements.txt"
  fi

  echo "[$svc] starting on :$port"
  PORT="$port" "$dir/.venv/bin/uvicorn" main:app --app-dir "$dir" --host 0.0.0.0 --port "$port" \
    > "/tmp/lumina-$svc.log" 2>&1 &
  PIDS+=($!)
done

echo ""
echo "All services starting. Logs: /tmp/lumina-<service>.log"
echo "  triage       http://localhost:8001/health"
echo "  docgen       http://localhost:8002/health"
echo "  codeintel    http://localhost:8003/health"
echo "  indexer      http://localhost:8004/health"
echo "  itsm         http://localhost:8005/health"
echo "  docs         http://localhost:8006/health"
echo "  debt-scanner http://localhost:8007/health"
echo ""
echo "Now in another terminal: cd frontend && npm install && npm run dev"
echo "Press Ctrl+C here to stop all backend services."
wait
