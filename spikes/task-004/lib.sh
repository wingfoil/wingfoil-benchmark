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

# The long-lived probe container: the run's workspace, plus the credential file read-only, and
# nothing else. It stays up between probes because P6 resumes a session P4 started (REQ-RUN-07).
ensure_container() {
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then return; fi
  docker create --name "$CONTAINER" \
    --mount "type=bind,src=$WORKSPACE,dst=/workspace" \
    --mount "type=bind,src=$CREDENTIALS,dst=/home/node/.claude/.credentials.json,readonly" \
    --user node --workdir /workspace "$IMAGE" sleep infinity > /dev/null
  docker start "$CONTAINER" > /dev/null
  docker exec "$CONTAINER" sh -c 'ls -ld /home/node/.claude; ls -l /home/node/.claude' \
    > "$OUT/p7-config-dir-ownership.txt" 2>&1 || true
}

# One headless session, recorded. $1 = label, $2 = model, $3 = prompt, $4 = session id.
session() {
  local label="$1" model="$2" prompt="$3" id="$4"
  check_ceiling
  echo "--- $label ($model, session $id)"
  set +e
  timeout 180 docker exec --interactive=false "$CONTAINER" \
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
