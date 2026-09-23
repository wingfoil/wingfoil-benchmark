#!/usr/bin/env bash
# P4 — question 7: a session that ends by asking. Its final message is the material REQ-RUN-06's
# classifier is written from, and its session id is what P6 resumes.
source "$(dirname "$0")/lib.sh"
ensure_container
id="$(uuid)"; echo "$id" > "$OUT/p4-session-id.txt"
session p4-question "$CHEAP_MODEL" \
  'I want you to add a caching layer to this project. Before writing anything, ask me the single question you most need answered to proceed. Ask only the question and stop; do not create or change any file.' \
  "$id"
echo "--- final assistant message ---"; final_message p4-question; echo; outcome p4-question
