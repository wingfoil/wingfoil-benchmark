#!/usr/bin/env bash
# task-102 (plan-005 W15, dl-022 arm A, dl-024): the Codex models spike. One real session per model of the Codex
# baseline campaign, S3@1.0 step 1 in the baseline arm, outside the runner, at effort medium, never repeated, to read
# what the campaign rests on: the model id is accepted, the effort is accepted, and how the Plus quota shows.
#   LOGIN            prints the commands the approver runs by hand to log in (dl-024, dl-019 bound 3); runs nothing
#   SOL TERRA LUNA   one real session each (gpt-6.1-sol, gpt-5.6-terra, gpt-6-luna); needs BENCH_SPIKE_CONFIRM=1
#   SCAN             the secret scan: no value of the credential in out/ or this directory; ends every stage that ran
# BENCH_SPIKE_FAKE=1 rehearses a session and the scan with a stub `codex` and a fake credential: no session, no quota.
# Usage: probe.sh LOGIN | [BENCH_SPIKE_CONFIRM=1 | BENCH_SPIKE_FAKE=1] probe.sh SOL SCAN TERRA SCAN LUNA SCAN
# Adapted from spikes/task-094/probe.sh (its P0, without the resume: the consent is one session per model).
set -euo pipefail
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SPIKE_DIR/../.." && pwd)"
# Output in the main checkout's ignored out/ (multi-session directive), whichever checkout runs this.
MAIN="$(git -C "$SPIKE_DIR" worktree list --porcelain | sed -n '1s/^worktree //p')"
FAKE="${BENCH_SPIKE_FAKE:-}"
OUT="${BENCH_SPIKE_OUT:-$MAIN/spikes/task-102/out${FAKE:+/fake}}"; mkdir -p "$OUT"
VERSION="0.162.1" # dl-022's pin (task-094's); 0.164.0 is npm latest on 2026-10-24, with the same models (F1)
IMAGE="bench-spike-task-102-codex-$VERSION"
EFFORT="medium"
CODEX_HOME_IN=/home/node/.codex-run
# dl-024 (dl-019 bound 2): the credential lives here, outside every checkout; in a rehearsal, a fake one under out/fake/.
AUTH_FILE="${BENCH_CODEX_AUTH_FILE:-$HOME/.codex-bench/auth.json}"
[ -z "$FAKE" ] || AUTH_FILE="$OUT/fake-auth.json"
BEFORE_VALUES=""

model_of() { # the approver's option A in task-102
  case "$1" in SOL) echo gpt-6.1-sol ;; TERRA) echo gpt-5.6-terra ;; LUNA) echo gpt-6-luna ;; *) exit 64 ;; esac
}

# The values to scan for: every string of 16 characters or more in the credential but last_refresh, as the adapter's
# codexSecrets takes them. Printed to a descriptor only, never to the console.
secrets() {
  node -e 'const t=require("fs").readFileSync(process.argv[1],"utf8");const out=new Set();
    const walk=(n,k)=>{if(typeof n==="string"){if(k!=="last_refresh"&&n.length>=16)out.add(n)}
      else if(n&&typeof n==="object")for(const [kk,v] of Object.entries(n))walk(v,kk)};
    walk(JSON.parse(t));process.stdout.write([...out].join("\n"))' "$AUTH_FILE"
}

read_one() { # the adapter's own reading of a session, through the built dist/, and every quota or limit sign in it
  local key="$1" model="$2"
  node --input-type=module -e "
    import { readFileSync, writeFileSync } from 'node:fs';
    const { readCodexSession } = await import('$REPO/dist/agents/index.js');
    const lines = (f) => { try { return readFileSync(f, 'utf8').split('\\n').filter(Boolean); } catch { return []; } };
    const s = readCodexSession(lines('$OUT/$key/session.jsonl'), { model: '$model', usdToEur: 0.8917 });
    // Any event or stderr line that speaks of a limit, a quota, a rate or the plan: how the Plus quota shows (F-criterion 1).
    const signs = [...lines('$OUT/$key/session.jsonl'), ...lines('$OUT/$key/stderr.txt')].filter((l) => /limit|quota|rate|plan|credit/i.test(l));
    writeFileSync('$OUT/$key/adapter.json', JSON.stringify({ outcome: s.outcome, error: s.error, threadId: s.threadId, usage: s.usage, models: s.models, quotaSigns: signs }, null, 2) + '\\n');
    console.log('$key: ' + s.outcome + ', ' + s.usage.costUsd.toFixed(4) + ' USD API-equivalent (price-table), ' + signs.length + ' quota or limit sign(s)');
  "
}

fresh_dist() { # a session and its reading load the built dist/: no source file may be newer than it
  [ -f "$REPO/dist/agents/index.js" ] || { echo "no dist/: npm run build"; exit 64; }
  [ -d "$REPO/src" ] && [ -r "$REPO/src" ] || { echo "no readable src/ to compare dist/ with"; exit 64; }
  # No pipe: under pipefail, find killed by grep -q's early exit would make a stale dist/ pass (review round 5).
  if [ -n "$(find "$REPO/src" -name '*.ts' -newer "$REPO/dist/agents/index.js" -print -quit)" ]; then
    echo "dist/ is older than src/: npm run build"; exit 64
  fi
}

image() { # the run image with Codex, as a campaign builds it (AGENT_NAME=codex)
    docker image inspect "$IMAGE" >/dev/null 2>&1 || nice -n 19 docker build -q --build-arg AGENT_NAME=codex \
    --build-arg AGENT_VERSION="$VERSION" -t "$IMAGE" "$REPO/docker/run-image" >/dev/null
}

login() { # dl-019 bound 3: the approver logs in by hand; this prints the commands and runs nothing
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

session() { # one real Codex session: S3@1.0 step 1, baseline arm, outside the runner, no resume
  local key="$1" model; model="$(model_of "$key")"
  local dir="$OUT/$key" c="bench-spike-task-102-$key${FAKE:+-fake}"
  [ -n "$FAKE" ] || [ "${BENCH_SPIKE_CONFIRM:-}" = 1 ] || { echo "$key runs a real Codex session: BENCH_SPIKE_CONFIRM=1"; exit 64; }
  # A session is never repeated without new consent: its output exists from the first redirect on.
  [ ! -e "$dir/session.jsonl" ] || { echo "$key already ran ($dir): not repeated"; exit 2; }
  fresh_dist
  image
  # A fake credential made at run time, so that no value of it is written in this script (the scan reads the script).
  local fake="at-fake-original-$(od -An -N8 -tx8 /dev/urandom | tr -d ' ')"
  if [ -n "$FAKE" ]; then printf '{"tokens":{"access_token":"%s"}}' "$fake" > "$AUTH_FILE"; chmod 600 "$AUTH_FILE"; fi
  [ -f "$AUTH_FILE" ] || { echo "no credential file at $AUTH_FILE: the approver logs in first (LOGIN)"; exit 64; }
  if [ -z "$FAKE" ]; then # dl-019 bounds 2 and 7 (restated by dl-024), as the runner's preflight checks them (the built dist/)
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
  local flags=(--json --model "$model" -c "model_reasoning_effort=\"$EFFORT\"" --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check --strict-config)
  printf '%q ' codex exec "${flags[@]}" -- '<prompts/01.md>' > "$dir/command.txt"; echo >> "$dir/command.txt"
  local started; started=$(date +%s%3N)
  docker exec "$c" timeout 1800 codex exec "${flags[@]}" -- "$(cat "$REPO/scenarios/S3/1.0/prompts/01.md")" \
    > "$dir/session.jsonl" 2> "$dir/stderr.txt" || echo "exit $?" > "$dir/exit.txt"
  echo "$(( $(date +%s%3N) - started ))" > "$dir/duration-ms.txt"
  docker exec "$c" sh -c 'ls -la "$CODEX_HOME"' > "$dir/codex-home.txt" 2>&1 || true
  git -C "$dir/workspace" status --short > "$dir/workspace-status.txt"
  echo "$key ($model): $(wc -l < "$dir/session.jsonl") events, exit $(cat "$dir/exit.txt" 2>/dev/null || echo 0)"
  read_one "$key" "$model"
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
    LOGIN) login ;;
    SOL | TERRA | LUNA) session "$stage" ;;
    SCAN) scan ;;
    *) echo "unknown stage: $stage"; exit 64 ;;
  esac
done
