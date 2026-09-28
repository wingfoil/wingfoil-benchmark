#!/usr/bin/env bash
# task-024, C3: what a session killed by `timeout` (SIGTERM, then SIGKILL) leaves in its stream —
# a result event with its cost, or nothing — which decides what step_time_s can record. Haiku 4.5,
# --max-budget-usd 0.05, within the 0.30 USD the approver consented at task-024's gate (bfc386e).
set -euo pipefail
: "${BENCH_SPIKE_CONFIRM:?refusing to run: set BENCH_SPIKE_CONFIRM=1 to spend on the real agent}"
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"; OUT="$SPIKE_DIR/out"; dir="$OUT/c3"
IMAGE="bench-spike-task-011-agent"; TOKEN_FILE="${BENCH_SPIKE_TOKEN_FILE:-$HOME/.claude/bench-token}"
C="bench-spike-task-024-c3"
rm -rf "$dir"; mkdir -p "$dir/ws"; docker rm -f "$C" >/dev/null 2>&1 || true
git -C "$dir/ws" init -q -b main && git -C "$dir/ws" -c user.name=x -c user.email=x@x commit -q --allow-empty -m seed
docker create --name "$C" --mount "type=bind,src=$dir/ws,dst=/workspace" --user node --workdir /workspace \
  -e CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 "$IMAGE" sleep infinity >/dev/null
docker start "$C" >/dev/null
started=$(date +%s)
set +e
ANTHROPIC_AUTH_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")" docker exec -i -e ANTHROPIC_AUTH_TOKEN "$C" \
  timeout -k 5 8 claude -p "Create twenty files, f01.txt to f20.txt, each holding its own number. Use one separate tool call per file, one file at a time. Then reply with the single word: done." \
  --model claude-haiku-4-5 --session-id "$(cat /proc/sys/kernel/random/uuid)" --output-format stream-json --verbose \
  --permission-mode bypassPermissions --setting-sources project --max-budget-usd 0.05 < /dev/null > "$dir/killed.jsonl" 2> "$dir/killed.stderr"
echo "$?" > "$dir/killed.exit"
set -e
echo "$(( $(date +%s) - started ))" > "$dir/killed.seconds"
node "$SPIKE_DIR/report.mjs" "$dir/killed"
echo "  files created: $(ls "$dir/ws" | tr '\n' ' ')"
echo "  processes left in the container: $(docker exec "$C" sh -c 'ps -eo comm | grep -c claude' || true)"
docker rm -f "$C" >/dev/null
TOK="$(tr -d '[:space:]' < "$TOKEN_FILE")"
echo "files containing the token: $(grep -rlF -- "$TOK" "$OUT" "$SPIKE_DIR" 2>/dev/null | wc -l || true)"
