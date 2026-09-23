#!/usr/bin/env bash
# P8 — question 6: does any known secret value appear in what a run stores? The Design said the
# comparison would be by digest; a digest cannot be computed over every substring, so the
# comparison is a literal search whose OUTPUT is only a count. No value is ever printed.
source "$(dirname "$0")/lib.sh"

scan_for() { # $1 = human name, $2 = the value to look for
  local name="$1" value="$2" hits=0 file
  [ -z "$value" ] && { echo "$name: not available, not scanned"; return; }
  for file in "$OUT"/*.jsonl "$OUT"/*.err "$OUT"/*.log; do
    [ -e "$file" ] || continue
    if grep -F -q -- "$value" "$file" 2>/dev/null; then
      hits=$((hits + 1))
      echo "  FOUND in $(basename "$file")"
    fi
  done
  if [ -d "$WORKSPACE" ] && grep -R -F -q -- "$value" "$WORKSPACE" 2>/dev/null; then
    hits=$((hits + 1)); echo "  FOUND in the workspace"
  fi
  echo "$name: $hits files hold it"
}

scan_for "the long-lived token" "$(token)"
for field in accessToken refreshToken; do
  value="$(node -e '
    const fs = require("node:fs");
    try {
      const o = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      process.stdout.write(String(o.claudeAiOauth?.[process.argv[2]] ?? ""));
    } catch { /* no credential file: nothing to scan for */ }
  ' "$CREDENTIALS" "$field")"
  scan_for "the OAuth $field" "$value"
done
echo "--- what the session itself wrote into the container's home ---"
docker exec "$CONTAINER" sh -c 'ls -la /home/node/.claude 2>&1 | head -20'
