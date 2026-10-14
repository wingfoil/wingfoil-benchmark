#!/usr/bin/env bash
# task-093 (dl-007 proposal 1, dl-015, bug-012, bug-016): the agent pin for v0.2, checked on the three models.
# F1 the release and its CHANGELOG, F2 the binary, both free; P1-P3 one real session of S3@1.0 step 1 in the baseline
# arm per model, each capped at --max-budget-usd 2.50 (under the 3 EUR consented at task-093's gate, c241d37), the
# total refused over 7.50 USD. READ passes each stream through the adapter's own reader (the built dist/).
# BENCH_SPIKE_FAKE=1 rehearses P1-P3 with a stub `claude` that replays a recorded stream: no token, no spending (F3).
# Usage: probe.sh F1 | F2 | [BENCH_SPIKE_CONFIRM=1 | BENCH_SPIKE_FAKE=1] probe.sh P1 [P2 P3] | probe.sh READ
set -euo pipefail
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SPIKE_DIR/../.." && pwd)"
# Real-agent runs keep their output in the main checkout (multi-session directive), whichever checkout runs this.
MAIN="$(git -C "$SPIKE_DIR" worktree list --porcelain | sed -n '1s/^worktree //p')"
FAKE="${BENCH_SPIKE_FAKE:-}"
OUT="${BENCH_SPIKE_OUT:-$MAIN/spikes/task-093/out${FAKE:+/fake}}"; mkdir -p "$OUT"
TOKEN_FILE="${BENCH_AGENT_TOKEN_FILE:-$HOME/.claude/bench-token}"
CEILING_USD="7.50"; SESSION_CAP_USD="2.50"
VERSION="${AGENT_VERSION:-$(cat "$OUT/../candidate.txt" 2>/dev/null || cat "$OUT/candidate.txt" 2>/dev/null || true)}"
IMAGE="bench-spike-task-093-agent-$VERSION"

spent() { { cat "$OUT"/P*/session.jsonl 2>/dev/null || true; } | node -e 'let s=0;for(const l of require("fs").readFileSync(0,"utf8").split("\n")){try{const e=JSON.parse(l);if(e.type==="result")s+=e.total_cost_usd??0}catch{}}process.stdout.write(s.toFixed(4))'; }
check() { # refuse a session that could take the total over the ceiling
  local s; s=$(spent); echo "spent so far: $s USD of $CEILING_USD"
  node -e "process.exit(Number('$s')+Number('$SESSION_CAP_USD')>Number('$CEILING_USD')?1:0)" \
    || { echo "ceiling: $s + $SESSION_CAP_USD USD would pass $CEILING_USD; stopping"; exit 2; }
}

f1() { # the release: dist-tags, dates, the CHANGELOG between 2.1.291 and latest
  mkdir -p "$OUT/f1"
  npm view @anthropic-ai/claude-code dist-tags --json > "$OUT/f1/dist-tags.json"
  npm view @anthropic-ai/claude-code time --json > "$OUT/f1/time.json"
  node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).latest)' \
    "$OUT/f1/dist-tags.json" > "$OUT/candidate.txt"
  local v; v="$(cat "$OUT/candidate.txt")"
  (cd "$OUT/f1" && rm -rf package anthropic-ai-claude-code-*.tgz && npm pack -q "@anthropic-ai/claude-code@$v" >/dev/null \
    && tar -xzf anthropic-ai-claude-code-*.tgz)
  npm view "@anthropic-ai/claude-code@$v" dist.integrity > "$OUT/f1/integrity.txt"
  ls "$OUT/f1/package" > "$OUT/f1/files.txt"
  echo "candidate: $v (latest); stable: $(node -e 'process.stdout.write(require(process.argv[1]).stable??"-")' "$OUT/f1/dist-tags.json")"
}

f2() { # the binary of the candidate, in the run image
  [ -n "$VERSION" ] || { echo "no candidate: run F1 first"; exit 64; }
  docker image inspect "$IMAGE" >/dev/null 2>&1 || docker build -q --build-arg AGENT_NAME=claude-code \
    --build-arg AGENT_VERSION="$VERSION" -t "$IMAGE" "$REPO/docker/run-image" >/dev/null
  mkdir -p "$OUT/f2"
  docker run --rm "$IMAGE" claude --version > "$OUT/f2/version.txt" 2>&1
  docker run --rm "$IMAGE" claude --help > "$OUT/f2/help.txt" 2>&1
  local cmd='B=$(readlink -f $(which claude)); echo "binary: $B";
    for m in claude-sonnet-5-5 claude-opus-5-5 claude-haiku-4-5; do echo "$m: $(grep -a -o "$m" "$B" | wc -l)"; done;
    grep -a -o -E "(defaultEffort|capLevels|supportsXHigh|defaultEffortPinnedAboveServed|costBasis)[^,;]{0,80}" "$B" | sort | uniq -c | sort -rn | head -60;
    echo "--- model blocks"; grep -a -o -E "claude-(sonnet|opus)-5-5[^}]{0,400}|claude-haiku-4-5[^}]{0,400}" "$B" | grep -E "ffort|Levels|XHigh|price|input|cache" | sort -u | head -40'
  printf '%s\n' "$cmd" > "$OUT/f2/command.txt"
  docker run --rm --entrypoint bash "$IMAGE" -c "$cmd" > "$OUT/f2/strings.txt" 2>&1
  echo "F2: $(cat "$OUT/f2/version.txt")"; grep -E '^claude-' "$OUT/f2/strings.txt"
}

session() { # $1 = session, $2 = model, $3 = effort (none for no flag)
  local s="$1" model="$2" effort="$3" dir="$OUT/$1" C="bench-spike-task-093-$1"
  local flags=(); [ "$effort" = none ] || flags=(--effort "$effort")
  if [ -z "$FAKE" ]; then
    : "${BENCH_SPIKE_CONFIRM:?refusing to run: set BENCH_SPIKE_CONFIRM=1 to spend on the real agent}"
    [ -f "$OUT/$s/session.jsonl" ] && { echo "$s has already run: a session is not repeated without new consent"; exit 2; }
  fi
  [ -n "$VERSION" ] || { echo "no candidate: run F1 and F2 first"; exit 64; }
  check
  rm -rf "$dir"; mkdir -p "$dir"; cp -r "$MAIN/scenarios/S3/1.0/seed" "$dir/ws"
  git -C "$dir/ws" init -q -b main && git -C "$dir/ws" add -A \
    && git -C "$dir/ws" -c user.name=seed -c user.email=seed@x commit -q -m seed
  docker rm -f "$C" >/dev/null 2>&1 || true
  docker create --name "$C" --mount "type=bind,src=$dir/ws,dst=/workspace" --user node --workdir /workspace \
    "$IMAGE" sleep infinity >/dev/null
  docker start "$C" >/dev/null
  local claude=(claude)
  if [ -n "$FAKE" ]; then # the stub: prints its arguments to stderr, replays the fixture on stdout
    docker cp "$REPO/test/fixtures/sessions/completed-sonnet.jsonl" "$C:/tmp/fixture.jsonl"
    claude=(sh -c 'printf "%s\n" "$@" >&2; cat /tmp/fixture.jsonl' stub)
  fi
  docker exec "$C" claude --version > "$dir/version.txt" 2>&1 || true
  local prompt; prompt="$(cat "$MAIN/scenarios/S3/1.0/prompts/01.md")"
  local env=(-e CLAUDE_CODE_DISABLE_AUTO_MEMORY=1)
  [ -n "$FAKE" ] || env+=(-e ANTHROPIC_AUTH_TOKEN)
  printf '%s\n' "model=$model" "effort=$effort" "cap=$SESSION_CAP_USD" > "$dir/declared.txt"
  ANTHROPIC_AUTH_TOKEN="$([ -n "$FAKE" ] || tr -d '[:space:]' < "$TOKEN_FILE")" docker exec -i "${env[@]}" "$C" \
    timeout 1800 "${claude[@]}" -p "$prompt" --output-format stream-json --verbose --model "$model" "${flags[@]}" \
    --session-id "$(cat /proc/sys/kernel/random/uuid)" --permission-mode bypassPermissions \
    --setting-sources project --max-budget-usd "$SESSION_CAP_USD" --debug \
    < /dev/null > "$dir/session.jsonl" 2> "$dir/stderr.txt" || echo "exit $?" > "$dir/exit.txt"
  docker exec "$C" sh -c 'cat "$HOME"/.claude/debug/*.txt 2>/dev/null' > "$dir/debug.txt" || true
  docker rm -f "$C" >/dev/null
  git -C "$dir/ws" status --porcelain --untracked-files=all > "$dir/status.txt"
  node -e '
    const fs=require("fs"), d=process.argv[1];
    const ev=fs.readFileSync(d+"/session.jsonl","utf8").trim().split("\n").flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}});
    const init=ev.find(e=>e.subtype==="init"), res=ev.filter(e=>e.type==="result").at(-1);
    const logs=fs.readFileSync(d+"/stderr.txt","utf8")+fs.readFileSync(d+"/debug.txt","utf8");
    const lines=re=>[...new Set(logs.split("\n").filter(l=>re.test(l)).map(l=>l.slice(0,200)))].slice(0,10);
    const effortKeys=init?Object.fromEntries(Object.entries(init).filter(([k])=>/effort|thinking/i.test(k))):null;
    console.log(JSON.stringify({session:process.argv[2], version:fs.readFileSync(d+"/version.txt","utf8").trim(),
      initModel:init?.model, initEffort:effortKeys, initKeys:init?Object.keys(init):null,
      subtype:res?.subtype, isError:res?.is_error, terminalReason:res?.terminal_reason, turns:res?.num_turns,
      durationMs:res?.duration_ms, cost:res?.total_cost_usd, modelUsage:res?.modelUsage,
      effortLines:lines(/effort|thinking/i), unrecognized:lines(/unrecognized/i)}, null, 1));' "$dir" "$s" \
    | tee "$dir/summary.json"
}

read_back() { # each stream through the adapter's reader, as a step would read it
  [ -f "$REPO/dist/agents/claude-code.js" ] || (cd "$REPO" && npx tsc -p tsconfig.build.json)
  for d in "$OUT"/P*/; do
    node --input-type=module -e '
      import { readSession } from "'"$REPO"'/dist/agents/claude-code.js";
      import fs from "node:fs";
      const d=process.argv[1], lines=fs.readFileSync(d+"session.jsonl","utf8").split("\n").filter(Boolean);
      const s=readSession(lines, 0.8851);
      fs.writeFileSync(d+"adapter.json", JSON.stringify(s, null, 1));
      console.log(d.split("/").at(-2), JSON.stringify(s).slice(0, 600));' "$d"
  done
}

scan() { # the token is read from a descriptor, never put on a command line; a scan that cannot run says so
  local tf="$TOKEN_FILE"; [ -n "$FAKE" ] && tf="${BENCH_SPIKE_FAKE_TOKEN:?the rehearsal scans for a fake token file}"
  [ -s "$tf" ] && [ -n "$(tr -d '[:space:]' < "$tf" | head -c 1)" ] || { echo "secret scan failed: no token to look for"; exit 3; }
  local scan=("$OUT"); case "$OUT" in "$SPIKE_DIR"/*) ;; *) scan+=("$SPIKE_DIR") ;; esac
  set +e; local hits; hits="$(grep -rlFf <(tr -d '[:space:]' < "$tf") -- "${scan[@]}" 2>/dev/null)"; local rc=$?; set -e
  [ "$rc" -le 1 ] || { echo "secret scan failed: grep exited $rc"; exit 3; }
  echo "files containing the token: $(printf '%s' "$hits" | grep -c . || true)"
  [ -z "$hits" ] || { printf '%s\n' "$hits"; exit 4; }
}

ran=""
for stage in "$@"; do
  case "$stage" in
    F1) f1 ;;
    F2) f2 ;;
    P1) session P1 claude-haiku-4-5 "${P1_EFFORT:-none}"; ran=1 ;;
    P2) session P2 claude-sonnet-5-5 "${P2_EFFORT:-high}"; ran=1 ;;
    P3) session P3 claude-opus-5-5 "${P3_EFFORT:-high}"; ran=1 ;;
    READ) read_back ;;
    *) echo "unknown stage $stage"; exit 64 ;;
  esac
done
if [ -n "$ran" ]; then echo "total spent: $(spent) USD"; scan; fi
