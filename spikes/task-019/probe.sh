#!/usr/bin/env bash
# task-019 (bug-006): does Claude Code 2.1.280 write its auto-memory in a headless session, does a new
# session read it, and does CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 stop both? Haiku 4.5; ceiling 0.30 USD,
# below the 0.30 EUR the approver consented to at task-019's gate (2bb466e).
set -euo pipefail
: "${BENCH_SPIKE_CONFIRM:?refusing to run: set BENCH_SPIKE_CONFIRM=1 to spend on the real agent}"
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"; OUT="$SPIKE_DIR/out"; mkdir -p "$OUT"
IMAGE="bench-spike-task-011-agent"   # Claude Code 2.1.280, built by task-011's P7
TOKEN_FILE="${BENCH_SPIKE_TOKEN_FILE:-$HOME/.claude/bench-token}"
MODEL="claude-haiku-4-5"; CEILING_USD="0.30"; CODEWORD="HERON-5521"
spent() { { cat "$OUT"/*/*.jsonl 2>/dev/null || true; } | node -e 'let s=0;for(const l of require("fs").readFileSync(0,"utf8").split("\n")){try{const e=JSON.parse(l);if(e.type==="result")s+=e.total_cost_usd??0}catch{}}process.stdout.write(s.toFixed(4))'; }
check() { local s; s=$(spent); echo "spent so far: $s USD of $CEILING_USD"; node -e "process.exit(Number('$s')>=Number('$CEILING_USD')?1:0)" || { echo "ceiling reached; stopping"; exit 2; }; }

probe() { # $1 = label, $2 = extra env for the agent ("" or the variable)
  local label="$1" extra="$2" dir="$OUT/$1" C="bench-spike-task-019-$1"
  rm -rf "$dir"; mkdir -p "$dir/ws"; docker rm -f "$C" >/dev/null 2>&1 || true
  git -C "$dir/ws" init -q -b main && git -C "$dir/ws" -c user.name=x -c user.email=x@x commit -q --allow-empty -m seed
  docker create --name "$C" --mount "type=bind,src=$dir/ws,dst=/workspace" --user node --workdir /workspace "$IMAGE" sleep infinity >/dev/null
  docker start "$C" >/dev/null
  session() { # $1 = name, $2 = prompt
    check
    ANTHROPIC_AUTH_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")" docker exec -i -e ANTHROPIC_AUTH_TOKEN $extra "$C" \
      timeout 180 claude -p "$2" --output-format stream-json --verbose --model "$MODEL" \
      --session-id "$(cat /proc/sys/kernel/random/uuid)" --permission-mode bypassPermissions \
      --setting-sources project --max-budget-usd 0.08 < /dev/null > "$dir/$1.jsonl" 2> "$dir/$1.stderr" || true
    node -e '
      const ev=require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}});
      const init=ev.find(e=>e.subtype==="init"), res=ev.find(e=>e.type==="result");
      console.log("  "+process.argv[2]+": memory_paths="+JSON.stringify(init?.memory_paths)+" cost="+res?.total_cost_usd+" reply="+JSON.stringify(String(res?.result).slice(0,160)));' "$dir/$1.jsonl" "$1"
  }
  echo "=== $label ${extra:-(no variable)}"
  session A "Save this to your auto memory so that a future session can use it: the project codeword is $CODEWORD. Then reply with the single word: done."
  echo "  memory files after A: $(docker exec "$C" sh -c 'find "$HOME/.claude/projects" -path "*/memory/*" -type f 2>/dev/null | tr "\n" " "')"
  session B "What is the project codeword stored in your memory? Reply with the codeword only, or NONE if you have none."
  docker rm -f "$C" >/dev/null
}
probe m1 ""
probe m2 "-e CLAUDE_CODE_DISABLE_AUTO_MEMORY=1"
echo "total spent: $(spent) USD"
TOK="$(tr -d '[:space:]' < "$TOKEN_FILE")"
echo "files containing the token: $(grep -rlF -- "$TOK" "$OUT" "$SPIKE_DIR" 2>/dev/null | wc -l || true)"
