#!/usr/bin/env bash
# P2 — questions 1 and 2: does a headless session ever block, and what does the stream carry?
# stdin is closed and the call runs under a wall-clock timeout, so "it waits" shows up as exit 124.
source "$(dirname "$0")/lib.sh"
ensure_container
session p2-trivial "$CHEAP_MODEL" 'Reply with the single word: ready' "$(uuid)"
echo "--- config dir as the container sees it ---"; cat "$OUT/p7-config-dir-ownership.txt"
echo "--- stderr ---"; head -5 "$OUT/p2-trivial.err"
echo "--- event types ---"; node -e '
const fs = require("node:fs");
const lines = fs.readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean);
for (const l of lines) { try { const e = JSON.parse(l); console.log(e.type, e.subtype ?? ""); } catch { console.log("(not json)", l.slice(0, 80)); } }
' "$OUT/p2-trivial.jsonl"
