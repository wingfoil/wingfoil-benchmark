#!/usr/bin/env bash
# P8: no session. Every file P7 recorded, scanned for the token; counts only, the value is never printed.
source "$(dirname "$0")/lib.sh"
TOKEN_FILE="${BENCH_SPIKE_TOKEN_FILE:-$HOME/.claude/bench-token}"
TOK="$(tr -d '[:space:]' < "$TOKEN_FILE")"
hits=$(grep -rlF -- "$TOK" "$OUT" "$REPO_DIR/spikes/task-011" 2>/dev/null | wc -l || true)
tail=$(grep -rlF -- "${TOK: -12}" "$OUT" "$REPO_DIR/spikes/task-011" 2>/dev/null | wc -l || true)
echo "files containing the token: $hits; containing its last 12 characters: $tail"
