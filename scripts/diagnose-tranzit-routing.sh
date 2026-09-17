#!/bin/sh
# Run on the Docker host to verify Traefik can see the app routers.
set -eu

echo "== networks =="
docker network ls | grep -E 'octobot|logistika' || true

echo "== app containers =="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -iE 'logistika|NAME' || docker ps --format 'table {{.Names}}\t{{.Status}}' | head -20

echo "== app on octobot-net =="
docker network inspect octobot-net --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null | tr ' ' '\n' | grep -i logistika || echo "(no logistika container on octobot-net)"

echo "== traefik container =="
docker ps --format '{{.Names}}' | grep -i traefik || echo "(no traefik name match)"

echo "== local health via docker exec (first matching app) =="
APP=$(docker ps --format '{{.Names}}' | grep -i logistika | head -1 || true)
if [ -n "${APP:-}" ]; then
  docker exec "$APP" wget -qO- http://127.0.0.1:3001/api/health || docker exec "$APP" node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>r.text()).then(console.log)"
else
  echo "app container not found"
fi

echo "== public check =="
curl -sI --max-time 10 https://tranzit.az/ | head -15 || true
curl -s --max-time 10 https://tranzit.az/ | head -c 80; echo
