#!/usr/bin/env bash
# task-024: how does Claude Code 2.1.280 stop at --max-budget-usd? C1: a first invocation cut off by
# its cap (how the stream ends, how far past the cap the cost goes, whether usage is reported before
# the result event). C2: what a resume's cap is compared against — the session's running total, or
# the resume's own cost. Haiku 4.5; ceiling 0.30 USD, as the approver consented at task-024's gate
# (bfc386e).
set -euo pipefail
: "${BENCH_SPIKE_CONFIRM:?refusing to run: set BENCH_SPIKE_CONFIRM=1 to spend on the real agent}"
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"; OUT="$SPIKE_DIR/out"; mkdir -p "$OUT"
IMAGE="bench-spike-task-011-agent"   # Claude Code 2.1.280, built by task-011's P7
TOKEN_FILE="${BENCH_SPIKE_TOKEN_FILE:-$HOME/.claude/bench-token}"
MODEL="claude-haiku-4-5"; CEILING_USD="0.30"
spent() { { cat "$OUT"/*/*.jsonl 2>/dev/null || true; } | node -e 'const s=new Map();for(const l of require("fs").readFileSync(0,"utf8").split("\n")){try{const e=JSON.parse(l);if(e.type==="result")s.set(e.session_id,Math.max(s.get(e.session_id)??0,e.total_cost_usd??0))}catch{}}process.stdout.write([...s.values()].reduce((a,b)=>a+b,0).toFixed(4))'; }
check() { local s; s=$(spent); echo "  spent so far: $s USD of $CEILING_USD"; node -e "process.exit(Number('$s')>=Number('$CEILING_USD')-0.06?1:0)" || { echo "ceiling too close; stopping"; exit 2; }; }
report() { node "$SPIKE_DIR/report.mjs" "$1"; }

container() { # $1 = label
  local dir="$OUT/$1" C="bench-spike-task-024-$1"
  rm -rf "$dir"; mkdir -p "$dir/ws"; docker rm -f "$C" >/dev/null 2>&1 || true
  git -C "$dir/ws" init -q -b main && git -C "$dir/ws" -c user.name=x -c user.email=x@x commit -q --allow-empty -m seed
  docker create --name "$C" --mount "type=bind,src=$dir/ws,dst=/workspace" --user node --workdir /workspace \
    -e CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 "$IMAGE" sleep infinity >/dev/null
  docker start "$C" >/dev/null
}
claude_in() { # $1 = label, $2 = output name, then the claude arguments
  local label="$1" name="$2"; shift 2
  check
  local started; started=$(date +%s)
  set +e
  ANTHROPIC_AUTH_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")" docker exec -i -e ANTHROPIC_AUTH_TOKEN \
    "bench-spike-task-024-$label" timeout 240 claude "$@" < /dev/null > "$OUT/$label/$name.jsonl" 2> "$OUT/$label/$name.stderr"
  echo "$?" > "$OUT/$label/$name.exit"
  set -e
  echo "$(( $(date +%s) - started ))" > "$OUT/$label/$name.seconds"
  report "$OUT/$label/$name"
}
COMMON=(--output-format stream-json --verbose --permission-mode bypassPermissions --setting-sources project)

echo "=== C1: a first invocation cut off by --max-budget-usd 0.04"
container c1
claude_in c1 cut -p "Create twenty files, f01.txt to f20.txt, each holding its own number. Use one separate tool call per file, one file at a time. Then reply with the single word: done." \
  --model "$MODEL" --session-id "$(cat /proc/sys/kernel/random/uuid)" "${COMMON[@]}" --max-budget-usd 0.04
echo "  files created: $(ls "$OUT/c1/ws" | tr '\n' ' ')"
docker rm -f bench-spike-task-024-c1 >/dev/null

echo "=== C2: a resume whose cap is below the session's running total, above what the resume needs"
container c2
SID="$(cat /proc/sys/kernel/random/uuid)"
claude_in c2 first -p "Reply with the single word: ready." --model "$MODEL" --session-id "$SID" "${COMMON[@]}" --max-budget-usd 0.20
FIRST=$(node -e 'const l=require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").map(x=>{try{return JSON.parse(x)}catch{return{}}}).find(e=>e.type==="result");process.stdout.write(String(l?.total_cost_usd??0))' "$OUT/c2/first.jsonl")
CAP=$(node -e "process.stdout.write((Number('$FIRST')*0.6).toFixed(4))")
echo "  first cost $FIRST USD; resume cap $CAP USD"
claude_in c2 resume --resume "$SID" -p "Create the file resumed.txt holding the word resumed, then reply with the single word: done." "${COMMON[@]}" --max-budget-usd "$CAP"
echo "  files created: $(ls "$OUT/c2/ws" | tr '\n' ' ')"
docker rm -f bench-spike-task-024-c2 >/dev/null

echo "total spent: $(spent) USD"
TOK="$(tr -d '[:space:]' < "$TOKEN_FILE")"
echo "files containing the token: $(grep -rlF -- "$TOK" "$OUT" "$SPIKE_DIR" 2>/dev/null | wc -l || true)"
