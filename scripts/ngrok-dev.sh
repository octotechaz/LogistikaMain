#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok tapılmadı. Quraşdırın: brew install ngrok/ngrok/ngrok"
  exit 1
fi

if [[ -z "${NGROK_AUTHTOKEN:-}" ]]; then
  if [[ -f "$HOME/Library/Application Support/ngrok/ngrok.yml" ]]; then
    :
  elif [[ -f "$HOME/.config/ngrok/ngrok.yml" ]]; then
    :
  else
    echo "NGROK_AUTHTOKEN təyin edin: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "  export NGROK_AUTHTOKEN=..."
    exit 1
  fi
fi

stop_pattern() {
  pkill -f "$1" 2>/dev/null || true
}

echo "Köhnə ngrok prosesləri dayandırılır..."
stop_pattern "ngrok start --config=$ROOT/scripts/ngrok.yml"
stop_pattern "ngrok http 3001"

for port in 3001 3005 4001; do
  if ! lsof -i :"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port dinləmir. Əvvəlcə dev serverləri işə salın: npm run dev"
    exit 1
  fi
done

echo "Ngrok tunelləri açılır..."
NGROK_CONFIG="$HOME/Library/Application Support/ngrok/ngrok.yml"
if [[ ! -f "$NGROK_CONFIG" && -f "$HOME/.config/ngrok/ngrok.yml" ]]; then
  NGROK_CONFIG="$HOME/.config/ngrok/ngrok.yml"
fi
if [[ -f "$NGROK_CONFIG" ]]; then
  NGROK_START_CONFIG="$NGROK_CONFIG,$ROOT/scripts/ngrok.yml"
  ngrok start --config="$NGROK_START_CONFIG" --all --log=stdout > /tmp/az-logistika-ngrok.log 2>&1 &
else
  ngrok start --config="$ROOT/scripts/ngrok.yml" --all --log=stdout > /tmp/az-logistika-ngrok.log 2>&1 &
fi
NGROK_PID=$!
echo "$NGROK_PID" > /tmp/az-logistika-ngrok.pid

for _ in $(seq 1 45); do
  if curl -sf http://127.0.0.1:4040/api/tunnels >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

node "$ROOT/scripts/ngrok-sync-env.mjs"

echo ""
echo "Dev serverlər ngrok env ilə yenidən başladılır..."

stop_pattern "concurrently"
stop_pattern "next dev --port 3001"
stop_pattern "next start -p 3001"
stop_pattern "octo-admin/index.js"
stop_pattern "tsx backend/src/server.ts"
sleep 1

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
# shellcheck disable=SC1091
source "$ROOT/.env.ngrok"
set +a

export NODE_ENV="${NODE_ENV:-development}"

exec npm run dev
