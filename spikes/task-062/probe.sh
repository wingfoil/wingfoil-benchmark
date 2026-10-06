#!/usr/bin/env bash
# task-062 (dl-007): does Claude Code 2.1.280 (v0.1's pin) run claude-haiku-4-5, claude-sonnet-5-5 and
# claude-opus-5-5 headless, which effort does it send, can --effort pin it, and does modelUsage report each model?
# If a model fails, the same on 2.1.291. Ceiling 3.00 USD, under the 3 EUR consented at task-062's gate (9a863c4).
# Usage: BENCH_SPIKE_CONFIRM=1 probe.sh <probe>...   (P1 … P7, see the task's Design)
set -euo pipefail
: "${BENCH_SPIKE_CONFIRM:?refusing to run: set BENCH_SPIKE_CONFIRM=1 to spend on the real agent}"
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"
# Real-agent runs keep their output in the main checkout (multi-session directive), whichever checkout runs this.
MAIN="$(git -C "$SPIKE_DIR" worktree list --porcelain | sed -n '1s/^worktree //p')"
OUT="${BENCH_SPIKE_OUT:-$MAIN/spikes/task-062/out}"; mkdir -p "$OUT"
TOKEN_FILE="${BENCH_AGENT_TOKEN_FILE:-$HOME/.claude/bench-token}"
CEILING_USD="3.00"; PROMPT="Reply with the single word: OK"
OLD_IMAGE="bench-spike-task-011-agent"            # Claude Code 2.1.280, built by task-011's P7
NEW_IMAGE="bench-spike-task-062-agent-2.1.291"

spent() { { cat "$OUT"/*/session.jsonl 2>/dev/null || true; } | node -e 'let s=0;for(const l of require("fs").readFileSync(0,"utf8").split("\n")){try{const e=JSON.parse(l);if(e.type==="result")s+=e.total_cost_usd??0}catch{}}process.stdout.write(s.toFixed(4))'; }
check() { local s; s=$(spent); echo "spent so far: $s USD of $CEILING_USD"; node -e "process.exit(Number('$s')>=Number('$CEILING_USD')?1:0)" || { echo "ceiling reached; stopping"; exit 2; }; }

new_image() {
  docker image inspect "$NEW_IMAGE" >/dev/null 2>&1 && return
  docker build -q --build-arg AGENT_NAME=claude-code --build-arg AGENT_VERSION=2.1.291 \
    -t "$NEW_IMAGE" "$MAIN/docker/run-image" >/dev/null
}

session() { # $1 = probe, $2 = image, $3 = model, $4… = extra flags
  local probe="$1" image="$2" model="$3"; shift 3
  local dir="$OUT/$probe" C="bench-spike-task-062-$probe"
  check
  rm -rf "$dir"; mkdir -p "$dir/ws"; docker rm -f "$C" >/dev/null 2>&1 || true
  git -C "$dir/ws" init -q -b main && git -C "$dir/ws" -c user.name=x -c user.email=x@x commit -q --allow-empty -m seed
  docker create --name "$C" --mount "type=bind,src=$dir/ws,dst=/workspace" --user node --workdir /workspace \
    "$image" sleep infinity >/dev/null
  docker start "$C" >/dev/null
  docker exec "$C" claude --version > "$dir/version.txt" 2>&1 || true
  ANTHROPIC_AUTH_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")" docker exec -i -e ANTHROPIC_AUTH_TOKEN \
    -e CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 "$C" \
    timeout 300 claude -p "$PROMPT" --output-format stream-json --verbose --model "$model" "$@" \
    --session-id "$(cat /proc/sys/kernel/random/uuid)" --permission-mode bypassPermissions \
    --setting-sources project --max-budget-usd 0.40 --debug < /dev/null > "$dir/session.jsonl" 2> "$dir/stderr.txt" \
    || echo "exit $?" > "$dir/exit.txt"
  docker exec "$C" sh -c 'cat "$HOME"/.claude/debug/*.txt 2>/dev/null' > "$dir/debug.txt" || true
  docker rm -f "$C" >/dev/null
  node -e '
    const fs=require("fs"), d=process.argv[1];
    const ev=fs.readFileSync(d+"/session.jsonl","utf8").trim().split("\n").flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}});
    const init=ev.find(e=>e.subtype==="init"), res=ev.find(e=>e.type==="result");
    const effort=[...new Set((fs.readFileSync(d+"/stderr.txt","utf8")+fs.readFileSync(d+"/debug.txt","utf8"))
      .split("\n").filter(l=>/effort|thinking/i.test(l)).map(l=>l.slice(0,200)))].slice(0,8);
    console.log(JSON.stringify({probe:process.argv[2], version:fs.readFileSync(d+"/version.txt","utf8").trim(),
      initModel:init?.model, initKeys:init?Object.keys(init):null, subtype:res?.subtype, isError:res?.is_error,
      result:String(res?.result??"").slice(0,120), cost:res?.total_cost_usd, modelUsage:res?.modelUsage,
      effortLines:effort}, null, 1));' "$dir" "$probe" | tee "$dir/summary.json"
}

for probe in "$@"; do
  case "$probe" in
    P1) session P1 "$OLD_IMAGE" claude-haiku-4-5 ;;
    P2) session P2 "$OLD_IMAGE" claude-sonnet-5-5 ;;
    P3) session P3 "$OLD_IMAGE" claude-opus-5-5 ;;
    P4) session P4 "$OLD_IMAGE" "${P4_MODEL:-claude-opus-5-5}" --effort high ;;
    P5) new_image; session P5 "$NEW_IMAGE" claude-haiku-4-5 ;;
    P6) new_image; session P6 "$NEW_IMAGE" claude-sonnet-5-5 ;;
    P7) new_image; session P7 "$NEW_IMAGE" claude-opus-5-5 ;;
    *) echo "unknown probe $probe"; exit 64 ;;
  esac
done
echo "total spent: $(spent) USD"
# The token is read from a descriptor, never put on a command line.
echo "files containing the token: $(grep -rlFf <(tr -d '[:space:]' < "$TOKEN_FILE") -- "$OUT" "$SPIKE_DIR" 2>/dev/null | wc -l || true)"
