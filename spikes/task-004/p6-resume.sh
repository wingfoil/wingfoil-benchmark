#!/usr/bin/env bash
# P6 — question 3: does --resume continue the session P4 started, under the same id, in the same
# container? The reply is the neutral approver's policy v1 answer to a question.
source "$(dirname "$0")/lib.sh"
ensure_container
id="$(cat "$OUT/p4-session-id.txt")"
resume p6-resume "$id" 'No further input is available. Make the most reasonable choice, record it, and proceed.'
echo "--- ids seen in the resumed stream ---"
node -e '
const fs = require("node:fs");
const ids = new Set();
for (const l of fs.readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean)) {
  try { const e = JSON.parse(l); if (e.session_id) ids.add(e.session_id); } catch {}
}
console.log([...ids].join("\n"));
' "$OUT/p6-resume.jsonl"
echo "started as: $id"
outcome p6-resume
