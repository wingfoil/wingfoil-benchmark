# Shared bits of the task-004 probes. Sourced, never run on its own.
# Nothing here prints, copies or commits a credential: the file is referred to by path only.
set -euo pipefail

: "${BENCH_SPIKE_CONFIRM:?refusing to run: set BENCH_SPIKE_CONFIRM=1 to spend on the real agent}"

SPIKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$SPIKE_DIR/out"
IMAGE="bench-spike-task-004"
CONTAINER="bench-spike-task-004"
WORKSPACE="$OUT/workspace"
CREDENTIALS="${BENCH_SPIKE_CREDENTIALS:-$HOME/.claude/.credentials.json}"
# The long-lived token of `claude setup-token`, created by the approver (spike, second run).
TOKEN_FILE="${BENCH_SPIKE_TOKEN_FILE:-$HOME/.claude/bench-token}"
# Which environment variable the pinned version honours: answered by P7, then exported by it.
AUTH_VAR="${BENCH_SPIKE_AUTH_VAR:-ANTHROPIC_AUTH_TOKEN}"
AGENT_VERSION="${BENCH_SPIKE_AGENT_VERSION:-2.1.280}"
CHEAP_MODEL="claude-haiku-4-5"
CAMPAIGN_MODEL="claude-sonnet-5"
# The spike's own ceiling, in USD of API-equivalent cost (task-004 Design).
CEILING_USD="1.00"

mkdir -p "$OUT" "$WORKSPACE"

uuid() { cat /proc/sys/kernel/random/uuid; }

# Sum of total_cost_usd over every result event recorded so far.
spent() { node "$SPIKE_DIR/spent.mjs" "$OUT"; }

# Stop before a probe if the ceiling is already reached.
check_ceiling() {
  local so_far
  so_far="$(spent)"
  if [ "$(node -e "process.stdout.write(String(Number(process.argv[1]) >= Number(process.argv[2])))" "$so_far" "$CEILING_USD")" = "true" ]; then
    echo "ceiling reached: ${so_far} USD of ${CEILING_USD}; stopping" >&2
    exit 2
  fi
  echo "spent so far: ${so_far} USD of ${CEILING_USD}"
}

# The probe container: the run's workspace and nothing else mounted. The credential no longer comes
# in as a mount but as an environment variable on each exec (REQ-RUN-15's second form), so the
# container's configuration never holds it and `docker inspect` cannot show it.
ensure_container() {
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then return; fi
  docker create --name "$CONTAINER" \
    --mount "type=bind,src=$WORKSPACE,dst=/workspace" \
    --user node --workdir /workspace "$IMAGE" sleep infinity > /dev/null
  docker start "$CONTAINER" > /dev/null
}

# The token as the agent must receive it: every space and line break removed. A paste that wrapped
# leaves a newline inside the value, and the agent then fails with an opaque header error (P7).
token() { tr -d '[:space:]' < "$TOKEN_FILE"; }

# One headless session, recorded. $1 = label, $2 = model, $3 = prompt, $4 = session id.
# The token is read at call time and never printed: no `set -x`, no echo of the value.
session() {
  local label="$1" model="$2" prompt="$3" id="$4"
  check_ceiling
  echo "--- $label ($model, session $id)"
  set +e
  timeout 300 docker exec --interactive=false \
    --env "$AUTH_VAR=$(token)" \
    "$CONTAINER" \
    claude -p "$prompt" \
      --output-format stream-json --verbose \
      --model "$model" \
      --session-id "$id" \
      --permission-mode bypassPermissions \
      --setting-sources project \
      --max-budget-usd 0.20 \
    < /dev/null > "$OUT/$label.jsonl" 2> "$OUT/$label.err"
  local code=$?
  set -e
  echo "exit=$code  (124 would mean it blocked until the timeout)"
  return 0
}

# The last assistant message of a recorded session: the material REQ-RUN-06's classifier works on.
final_message() { node "$SPIKE_DIR/final.mjs" "$OUT/$1.jsonl"; }

# What the result event says about the session: the fields REQ-RUN-09 needs, plus the outcome.
outcome() { node "$SPIKE_DIR/outcome.mjs" "$OUT/$1.jsonl"; }

# A reply to a session that ended waiting for input (REQ-RUN-07). $1 = label, $2 = session id,
# $3 = the reply the approver policy gives.
resume() {
  local label="$1" id="$2" reply="$3"
  check_ceiling
  echo "--- $label (resume $id)"
  set +e
  timeout 300 docker exec --interactive=false \
    --env "$AUTH_VAR=$(token)" \
    "$CONTAINER" \
    claude --resume "$id" -p "$reply" \
      --output-format stream-json --verbose \
      --permission-mode bypassPermissions \
      --setting-sources project \
      --max-budget-usd 0.20 \
    < /dev/null > "$OUT/$label.jsonl" 2> "$OUT/$label.err"
  echo "exit=$?"
  set -e
  return 0
}
