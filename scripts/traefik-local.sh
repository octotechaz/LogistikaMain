#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="tranzit-traefik-local"
DYNAMIC="$ROOT/traefik/dynamic.local.yml"

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop, then retry:"
  echo "  npm run traefik:local"
  exit 1
fi

docker rm -f "$NAME" >/dev/null 2>&1 || true

docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  -p 80:80 \
  --add-host=host.docker.internal:host-gateway \
  -v "$DYNAMIC:/etc/traefik/dynamic.yml:ro" \
  traefik:v3.3 \
  --api.dashboard=false \
  --providers.file.filename=/etc/traefik/dynamic.yml \
  --providers.file.watch=true \
  --entrypoints.web.address=:80 \
  --log.level=INFO

echo "Traefik local is up on :80"
echo "  http://tranzit.test          → public"
echo "  http://portal.tranzit.test   → portal"
echo "  http://admin.tranzit.test    → admin"
