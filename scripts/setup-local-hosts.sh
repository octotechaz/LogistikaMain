#!/usr/bin/env bash
set -euo pipefail

# Optional offline hosts (lvh.me already resolves to 127.0.0.1 via DNS).
# Prefer lvh.me — no sudo needed. This script is only for tranzit.test offline.

HOSTS_FILE="${HOSTS_FILE:-/etc/hosts}"
MARKER_BEGIN="# tranzit local begin"
MARKER_END="# tranzit local end"
BLOCK=$(cat <<'EOF'
# tranzit local begin
127.0.0.1 tranzit.test portal.tranzit.test admin.tranzit.test
# tranzit local end
EOF
)

if [[ ! -w "$HOSTS_FILE" ]]; then
  echo "Need write access to $HOSTS_FILE — re-run with sudo:"
  echo "  sudo npm run hosts:local"
  echo
  echo "Or skip this and use lvh.me (no hosts file):"
  echo "  http://lvh.me:3001"
  echo "  http://portal.lvh.me:3001"
  echo "  http://admin.lvh.me:3005"
  exit 1
fi

tmp="$(mktemp)"
if grep -qE '# tranzit( local|\.az local) begin' "$HOSTS_FILE"; then
  awk '
    /^# tranzit( local|\.az local) begin$/ {skip=1; next}
    /^# tranzit( local|\.az local) end$/ {skip=0; next}
    !skip {print}
  ' "$HOSTS_FILE" > "$tmp"
else
  cp "$HOSTS_FILE" "$tmp"
fi

printf "\n%s\n" "$BLOCK" >> "$tmp"
cat "$tmp" > "$HOSTS_FILE"
rm -f "$tmp"

echo "Updated $HOSTS_FILE (optional offline aliases)."
echo "Default local URLs (no hosts needed):"
echo "  http://lvh.me:3001"
echo "  http://portal.lvh.me:3001"
echo "  http://admin.lvh.me:3005"
