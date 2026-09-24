#!/usr/bin/env bash
# P1 — question 4: which of the REQ-RUN-04 flags the pinned version actually has, and how the agent
# is told where its configuration lives. No session, no cost.
source "$(dirname "$0")/lib.sh"

docker run --rm "$IMAGE" claude --help > "$OUT/p1-help.txt" 2>&1 || true
echo "--- REQ-RUN-04 flags ---"
for flag in -p --output-format --verbose --model --session-id --permission-mode --setting-sources \
            --max-budget-usd --resume --mcp-config --strict-mcp-config; do
  if grep -q -- "$flag" "$OUT/p1-help.txt"; then echo "present: $flag"; else echo "ABSENT:  $flag"; fi
done
