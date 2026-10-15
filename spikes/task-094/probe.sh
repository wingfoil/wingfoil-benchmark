#!/usr/bin/env bash
# task-094 (plan-004 step 3-bis, dl-019): the Codex adapter spike.
#   F1     the release, the source of its --json events, its auth storage and its limit messages (free)
#   F2     the binary, in the run image built with AGENT_NAME=codex (free)
#   LOGIN  prints the command the approver runs by hand to log in (dl-019 bound 3); runs nothing
#   P0     one real Codex session, S3@1.0 step 1 in the baseline arm, outside the runner, then one resume with
#          approver policy v1's reply to a question; needs BENCH_SPIKE_CONFIRM=1, never repeated (its out/P0 exists)
#   READ   passes P0's streams through the adapter's own reader (the built dist/)
#   SCAN   the secret scan: no value of the credential in out/ or this directory; ends every stage that ran Codex
# BENCH_SPIKE_FAKE=1 rehearses P0, READ and SCAN with a stub `codex` and a fake credential: no session, no quota (F3).
# Usage: probe.sh F1 | F2 | LOGIN | [BENCH_SPIKE_CONFIRM=1 | BENCH_SPIKE_FAKE=1] probe.sh P0 READ SCAN
set -euo pipefail
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SPIKE_DIR/../.." && pwd)"
# Output in the main checkout's ignored out/ (multi-session directive), whichever checkout runs this.
MAIN="$(git -C "$SPIKE_DIR" worktree list --porcelain | sed -n '1s/^worktree //p')"
FAKE="${BENCH_SPIKE_FAKE:-}"
OUT="${BENCH_SPIKE_OUT:-$MAIN/spikes/task-094/out${FAKE:+/fake}}"; mkdir -p "$OUT"
VERSION="${AGENT_VERSION:-$(cat "$OUT/candidate.txt" 2>/dev/null || cat "$OUT/../candidate.txt" 2>/dev/null || true)}"
IMAGE="bench-spike-task-094-codex-$VERSION"
MODEL="gpt-6.1-sol"; EFFORT="medium"
CODEX_HOME_IN=/home/node/.codex-run
# dl-019 bound 2: the credential lives here, outside every checkout; in a rehearsal, a fake one under out/fake/.
AUTH_FILE="${BENCH_CODEX_AUTH_FILE:-$HOME/.codex-bench/auth.json}"
[ -z "$FAKE" ] || AUTH_FILE="$OUT/fake-auth.json"
# The credential's values before the session: a refresh during it writes new ones, and the scan looks for both.
BEFORE_VALUES=""
REPLY='No further input is available. Make the most reasonable choice, record it, and proceed.'

# The values to scan for: every string of 16 characters or more in the credential but last_refresh, as the adapter's
# codexSecrets takes them. Printed to a descriptor only, never to the console.
secrets() {
  node -e 'const t=require("fs").readFileSync(process.argv[1],"utf8");const out=new Set();
    const walk=(n,k)=>{if(typeof n==="string"){if(k!=="last_refresh"&&n.length>=16)out.add(n)}
      else if(n&&typeof n==="object")for(const [kk,v] of Object.entries(n))walk(v,kk)};
    walk(JSON.parse(t));process.stdout.write([...out].join("\n"))' "$AUTH_FILE"
}

fresh_dist() { # P0 and READ load the built dist/: no source file may be newer than it
  [ -f "$REPO/dist/agents/index.js" ] || { echo "no dist/: npm run build"; exit 64; }
  # No pipe: under pipefail, find killed by grep -q's early exit would make a stale dist/ pass (review round 5).
  if [ -n "$(find "$REPO/src" -name '*.ts' -newer "$REPO/dist/agents/index.js" -print -quit)" ]; then
    echo "dist/ is older than src/: npm run build"; exit 64
  fi
}

f1() {
  mkdir -p "$OUT/f1/source"
  npm view @openai/codex dist-tags --json > "$OUT/f1/dist-tags.json"
  npm view @openai/codex time --json > "$OUT/f1/time.json"
  node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).latest)' \
    "$OUT/f1/dist-tags.json" > "$OUT/candidate.txt"
  local v; v="$(cat "$OUT/candidate.txt")"
  npm view "@openai/codex@$v" dist.integrity > "$OUT/f1/integrity.txt"
  : > "$OUT/f1/sources.txt"
  for path in codex-rs/exec/src/exec_events.rs codex-rs/exec/src/event_processor_with_jsonl_output.rs \
      codex-rs/codex-api/src/sse/responses.rs codex-rs/login/src/auth/storage.rs codex-rs/protocol/src/error.rs \
      codex-rs/models-manager/models.json codex-rs/models-manager/src/manager.rs codex-rs/core/src/config/mod.rs; do
    local url="https://raw.githubusercontent.com/openai/codex/rust-v$v/$path"
    curl -fsSL "$url" -o "$OUT/f1/source/$(echo "$path" | tr / _)"
    echo "$url" >> "$OUT/f1/sources.txt"
  done
  echo "fetched $(date -u +%FT%TZ)" >> "$OUT/f1/sources.txt"
  echo "candidate: $v (latest)"
}

image() { # the run image with Codex, as a campaign builds it (AGENT_NAME=codex)
  [ -n "$VERSION" ] || { echo "no candidate: run F1 first"; exit 64; }
  docker image inspect "$IMAGE" >/dev/null 2>&1 || nice -n 19 docker build -q --build-arg AGENT_NAME=codex \
    --build-arg AGENT_VERSION="$VERSION" -t "$IMAGE" "$REPO/docker/run-image" >/dev/null
}

f2() {
  image
  mkdir -p "$OUT/f2"
  docker run --rm "$IMAGE" codex --version > "$OUT/f2/version.txt" 2>&1
  docker run --rm "$IMAGE" codex exec --help > "$OUT/f2/exec-help.txt" 2>&1
  docker run --rm "$IMAGE" codex exec resume --help > "$OUT/f2/resume-help.txt" 2>&1
  docker run --rm "$IMAGE" codex login --help > "$OUT/f2/login-help.txt" 2>&1
  echo "F2: $(cat "$OUT/f2/version.txt")"
}

login() { # dl-019 bound 3: the approver logs in by hand; this prints the commands and runs nothing
  [ -n "$VERSION" ] || { echo "no candidate: run F1 first"; exit 64; }
  cat <<EOF
install -d -m 700 "\$HOME/.codex-bench" && { [ -e "\$HOME/.codex-bench/auth.json" ] || printf '{}' > "\$HOME/.codex-bench/auth.json"; } && chmod 600 "\$HOME/.codex-bench/auth.json"
docker run --rm -it -e CODEX_HOME=$CODEX_HOME_IN --mount type=bind,source="\$HOME/.codex-bench/auth.json",target=$CODEX_HOME_IN/auth.json $IMAGE codex login --device-auth -c 'cli_auth_credentials_store="file"'
EOF
}

# A stub `codex` for the rehearsal: Codex's --json shape, a refresh of the credential, and the token in its message
# (which the scan must then find in the stream).
STUB='#!/bin/bash
set -euo pipefail
if [ "$2" = resume ]; then echo "{\"type\":\"thread.started\",\"thread_id\":\"019a0000-0000-7000-8000-0000000000f3\"}";
  echo "{\"type\":\"turn.completed\",\"usage\":{\"input_tokens\":200,\"cached_input_tokens\":120,\"cache_write_input_tokens\":20,\"output_tokens\":30,\"reasoning_output_tokens\":5}}"; exit 0; fi
printf "{\"tokens\":{\"access_token\":\"%s-refreshed\"}}" "$(sed -n "s/.*\"access_token\":\"\([^\"]*\)\".*/\1/p" "$CODEX_HOME/auth.json")" > "$CODEX_HOME/auth.json.new" && cat "$CODEX_HOME/auth.json.new" > "$CODEX_HOME/auth.json" && rm "$CODEX_HOME/auth.json.new"
echo hello > hello.txt
echo "{\"type\":\"thread.started\",\"thread_id\":\"019a0000-0000-7000-8000-0000000000f3\"}"
echo "{\"type\":\"item.completed\",\"item\":{\"id\":\"i\",\"type\":\"agent_message\",\"text\":\"${PLANT:-done}\"}}"
echo "{\"type\":\"turn.completed\",\"usage\":{\"input_tokens\":100,\"cached_input_tokens\":40,\"cache_write_input_tokens\":10,\"output_tokens\":20,\"reasoning_output_tokens\":5}}"'

p0() {
  local dir="$OUT/P0" c="bench-spike-task-094-P0${FAKE:+-fake}"
  [ -n "$FAKE" ] || [ "${BENCH_SPIKE_CONFIRM:-}" = 1 ] || { echo "P0 runs a real Codex session: BENCH_SPIKE_CONFIRM=1"; exit 64; }
  # A session is never repeated without new consent: its output exists from the first redirect on.
  [ ! -e "$dir/session.jsonl" ] || { echo "P0 already ran ($dir): not repeated"; exit 2; }
  fresh_dist
  image
  # A fake credential made at run time, so that no value of it is written in this script (the scan reads the script).
  local fake="at-fake-original-$(od -An -N8 -tx8 /dev/urandom | tr -d ' ')"
  if [ -n "$FAKE" ]; then printf '{"tokens":{"access_token":"%s"}}' "$fake" > "$AUTH_FILE"; chmod 600 "$AUTH_FILE"; fi
  [ -f "$AUTH_FILE" ] || { echo "no credential file at $AUTH_FILE: the approver logs in first (LOGIN)"; exit 64; }
  if [ -z "$FAKE" ]; then # dl-019 bounds 2 and 7, as the runner's preflight checks them (the built dist/)
    local problem; problem="$(node --input-type=module -e "const m=await import('$REPO/dist/cli/preflight.js');process.stdout.write(m.codexAuthFile(process.argv[1])??'')" "$AUTH_FILE")"
    [ -z "$problem" ] || { echo "credential refused: $problem"; exit 64; }
  fi
  AUTH_FILE="$(realpath "$AUTH_FILE")" # the real path, mounted as the runner mounts it
  BEFORE_VALUES="$(secrets)" # dl-019 bound 6: nothing to scrub, no session
  [ -n "$BEFORE_VALUES" ] || { echo "credential holds no value: log in first (LOGIN)"; exit 64; }
  mkdir -p "$dir"; rm -rf "$dir/workspace"
  cp -r "$REPO/scenarios/S3/1.0/seed" "$dir/workspace"
  cp "$REPO/arms/baseline/manual.md" "$dir/workspace/AGENTS.md"
  git -C "$dir/workspace" init -q && git -C "$dir/workspace" add -A \
    && git -C "$dir/workspace" -c user.name=bench -c user.email=bench@localhost commit -q -m seed
  docker rm -f "$c" >/dev/null 2>&1 || true
  trap 'docker rm -f "'"$c"'" >/dev/null 2>&1 || true; scan' EXIT
  docker run -d --name "$c" --user node --workdir /workspace -e CODEX_HOME="$CODEX_HOME_IN" ${BENCH_SPIKE_PLANT:+-e PLANT=$fake} \
    --mount "type=bind,source=$dir/workspace,target=/workspace" \
    --mount "type=bind,source=$AUTH_FILE,target=$CODEX_HOME_IN/auth.json" "$IMAGE" sleep infinity >/dev/null
  # The runner's config.toml, from the built dist/ (the same bytes the runner writes).
  local config; config="$(node --input-type=module -e "import('$REPO/dist/agents/profile.js').then(m=>process.stdout.write(m.CODEX_CONFIG))")"
  docker exec "$c" sh -c 'printf "%s" "$1" > "$2"' sh "$config" "$CODEX_HOME_IN/config.toml"
  if [ -n "$FAKE" ]; then
    docker exec "$c" sh -c 'mkdir -p /home/node/.local/bin && printf "%s" "$1" > /home/node/.local/bin/codex && chmod +x /home/node/.local/bin/codex' sh "$STUB"
  fi
  local flags=(--json --model "$MODEL" -c "model_reasoning_effort=\"$EFFORT\"" --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check --strict-config)
  printf '%q ' codex exec "${flags[@]}" -- '<prompts/01.md>' > "$dir/command.txt"; echo >> "$dir/command.txt"
  local started; started=$(date +%s%3N)
  docker exec "$c" timeout 3600 codex exec "${flags[@]}" -- "$(cat "$REPO/scenarios/S3/1.0/prompts/01.md")" \
    > "$dir/session.jsonl" 2> "$dir/stderr.txt" || echo "exit $?" > "$dir/exit.txt"
  echo "$(( $(date +%s%3N) - started ))" > "$dir/duration-ms.txt"
  local thread; thread="$(node -e 'for(const l of require("fs").readFileSync(process.argv[1],"utf8").split("\n")){try{const e=JSON.parse(l);if(e.type==="thread.started"){process.stdout.write(e.thread_id);break}}catch{}}' "$dir/session.jsonl")"
  if [ -n "$thread" ]; then
    printf '%q ' codex exec resume --json -c "model_reasoning_effort=\"$EFFORT\"" --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check --strict-config -- "$thread" "$REPLY" >> "$dir/command.txt"; echo >> "$dir/command.txt"
    docker exec "$c" timeout 3600 codex exec resume --json -c "model_reasoning_effort=\"$EFFORT\"" \
      --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check --strict-config -- "$thread" "$REPLY" \
      > "$dir/resume.jsonl" 2> "$dir/resume-stderr.txt" || echo "resume exit $?" >> "$dir/exit.txt"
  fi
  docker exec "$c" sh -c 'ls -la "$CODEX_HOME"' > "$dir/codex-home.txt" 2>&1 || true
  git -C "$dir/workspace" status --short > "$dir/workspace-status.txt"
  echo "P0: $(wc -l < "$dir/session.jsonl") events, resume $(wc -l < "$dir/resume.jsonl" 2>/dev/null || echo 0) events"
}

read_streams() { # the adapter's own reading of P0's streams, through the built dist/
  fresh_dist
  node --input-type=module -e "
    import { readFileSync, writeFileSync } from 'node:fs';
    const { readCodexSession } = await import('$REPO/dist/agents/index.js');
    const lines = (f) => { try { return readFileSync(f, 'utf8').split('\n').filter(Boolean); } catch { return []; } };
    const step = readCodexSession(lines('$OUT/P0/session.jsonl'), { model: '$MODEL', usdToEur: 0.8851 });
    const resume = readCodexSession(lines('$OUT/P0/resume.jsonl'), { model: '$MODEL', usdToEur: 0.8851, before: step.totals, threadId: step.threadId });
    const brief = (s) => ({ outcome: s.outcome, error: s.error, threadId: s.threadId, usage: s.usage, totals: s.totals, models: s.models, finalMessage: s.finalMessage });
    // Whether 0.162.1's resume reports the thread's total, the step's included, or restarts its count (REQ-RUN-09 1.32).
    const raw = (f) => { let t; for (const l of lines(f)) { try { const e = JSON.parse(l); if (e.type === 'turn.completed') t = e.usage; } catch {} } return t; };
    const [a, b] = [raw('$OUT/P0/session.jsonl'), raw('$OUT/P0/resume.jsonl')];
    const resumeTotal = a === undefined || b === undefined ? 'not observed'
      : Object.keys(a).every((k) => (b[k] ?? 0) >= a[k])
        ? 'consistent with the thread total (every field at or above the step\'s; a restarted, larger count cannot be excluded)'
        : 'restarted (a field below the step\'s)';
    writeFileSync('$OUT/P0/adapter.json', JSON.stringify({ step: brief(step), resume: brief(resume), resumeTotal }, null, 2) + '\n');
    console.log('READ: the resume reports ' + resumeTotal);
    console.log('READ: step ' + step.outcome + ', ' + step.usage.costUsd.toFixed(4) + ' USD; resume ' + resume.outcome + ', ' + resume.usage.costUsd.toFixed(4) + ' USD (API-equivalent, price-table)');
  "
}

scan() { # exit 3 when the scan cannot run, 4 when it finds a value
  local values; values="$(printf '%s\n%s' "$BEFORE_VALUES" "$(secrets 2>/dev/null || true)" | sed '/^$/d')"
  [ -n "$values" ] || { echo "secret scan failed: no value to scan for"; exit 3; }
  local found rc=0
  # Only a rehearsal keeps its (fake) credential under out/; a real one is outside both directories.
  local exclude=(); [ -z "$FAKE" ] || exclude=(--exclude="$(basename "$AUTH_FILE")")
  found="$(grep -rlFf <(printf '%s\n' "$values") "$OUT" "$SPIKE_DIR" ${exclude[@]+"${exclude[@]}"} 2>/dev/null)" || rc=$?
  [ "$rc" -le 1 ] || { echo "secret scan failed: grep exit $rc"; exit 3; }
  if [ -n "$found" ]; then echo "secret scan: a credential value is in $(echo "$found" | wc -l) file(s):"; echo "$found"; exit 4; fi
  echo "secret scan: clean"
}

for stage in "$@"; do
  case "$stage" in
    F1) f1 ;;
    F2) f2 ;;
    LOGIN) login ;;
    P0) p0 ;;
    READ) read_streams ;;
    SCAN) scan ;;
    *) echo "unknown stage: $stage"; exit 64 ;;
  esac
done
