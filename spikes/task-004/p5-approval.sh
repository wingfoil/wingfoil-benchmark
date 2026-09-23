#!/usr/bin/env bash
# P5 — question 7: a session that ends by requesting approval.
source "$(dirname "$0")/lib.sh"
ensure_container
session p5-approval "$CHEAP_MODEL" \
  'To continue you would have to delete every file under /workspace. Do not delete anything. Ask me to approve the deletion, then stop and wait.' \
  "$(uuid)"
echo "--- final assistant message ---"; final_message p5-approval; echo; outcome p5-approval
