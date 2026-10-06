#!/usr/bin/env bash
# task-065: Spec Kit v1.1.0 in the run container. B1 builds its wheel bundle, B2 installs it and runs `specify init`
# with no network, R1 is one real Sonnet 5 session on S3 step 1 (ceiling 3.00 USD, under the 3 EUR consented at
# task-065's gate, 490018c). Usage: probe.sh B1 | B2 | R1 (R1 needs BENCH_SPIKE_CONFIRM=1).
set -euo pipefail
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"
MAIN="$(git -C "$SPIKE_DIR" worktree list --porcelain | sed -n '1s/^worktree //p')"
OUT="${BENCH_SPIKE_OUT:-$MAIN/spikes/task-065/out}"; mkdir -p "$OUT"
IMAGE="bench-spike-task-065"; TAG="v1.1.0"; SPECKIT="${SPECKIT_CLONE:?set SPECKIT_CLONE to a clone of github/spec-kit}"
TOKEN_FILE="${BENCH_AGENT_TOKEN_FILE:-$HOME/.claude/bench-token}"; CEILING_USD="3.00"; MODEL="claude-sonnet-5"

image() {
  docker image inspect "$IMAGE" >/dev/null 2>&1 && return
  docker build -q --build-arg AGENT_NAME=claude-code --build-arg AGENT_VERSION=2.1.280 -t "$IMAGE" \
    "$MAIN/docker/run-image" >/dev/null
}

b1() { # the wheel bundle: the tag's wheel and its dependencies, fetched once
  image; rm -rf "$OUT/b1"; mkdir -p "$OUT/b1/in" "$OUT/b1/bundle"
  git -C "$SPECKIT" archive --format=tar -o "$OUT/b1/in/src.tar" "$TAG"
  docker run --rm -v "$OUT/b1/in:/in:ro" -v "$OUT/b1/bundle:/bundle" "$IMAGE" bash -c '
    set -e; mkdir -p /tmp/src && tar -xf /in/src.tar -C /tmp/src && cd /tmp/src
    uv build --wheel --out-dir /bundle
    uv run --no-project --with pip python -m pip download -q -d /bundle /bundle/specify_cli-*.whl' \
    > "$OUT/b1/log.txt" 2>&1
  (cd "$OUT/b1/bundle" && sha256sum * > ../bundle.sha256)
  echo "B1: $(ls "$OUT/b1/bundle" | wc -l) files in the bundle"; cat "$OUT/b1/bundle.sha256"
}

b2() { # install offline and init with no network, in a copy of S3@1.0's seed
  image; rm -rf "$OUT/b2"; mkdir -p "$OUT/b2"; cp -r "$MAIN/scenarios/S3/1.0/seed" "$OUT/b2/ws"
  git -C "$OUT/b2/ws" init -q -b main && git -C "$OUT/b2/ws" add -A && git -C "$OUT/b2/ws" -c user.name=seed -c user.email=seed@x commit -q -m seed
  set +e
  docker run --rm --network none -v "$OUT/b1/bundle:/bundle:ro" -v "$OUT/b2/ws:/workspace" "$IMAGE" bash -c '
    set -e
    uv tool install --offline --no-index --find-links /bundle specify-cli
    specify version || true
    specify init --here --force --integration claude --script sh --ignore-agent-tools' > "$OUT/b2/log.txt" 2>&1
  echo "B2: exit $?"; set -e
  git -C "$OUT/b2/ws" status --porcelain --untracked-files=all > "$OUT/b2/status.txt"
  echo "B2: $(wc -l < "$OUT/b2/status.txt") paths added or changed"; tail -5 "$OUT/b2/log.txt"
}

spent() { { cat "$OUT"/r1/session.jsonl 2>/dev/null || true; } | node -e 'let s=0;for(const l of require("fs").readFileSync(0,"utf8").split("\n")){try{const e=JSON.parse(l);if(e.type==="result")s+=e.total_cost_usd??0}catch{}}process.stdout.write(s.toFixed(4))'; }

r1() { # one real session on B2's workspace
  : "${BENCH_SPIKE_CONFIRM:?refusing to run: set BENCH_SPIKE_CONFIRM=1 to spend on the real agent}"
  node -e "process.exit(Number('$(spent)')>=Number('$CEILING_USD')?1:0)" || { echo "ceiling reached"; exit 2; }
  image; rm -rf "$OUT/r1"; mkdir -p "$OUT/r1"; cp -r "$OUT/b2/ws" "$OUT/r1/ws"
  local prompt; prompt="$(cat "$MAIN/scenarios/S3/1.0/prompts/01.md")

This project follows GitHub Spec Kit's process (its skills are installed under .claude/skills). Use them for this
work: specify, then plan, tasks and implement."
  local C="bench-spike-task-065-r1"; docker rm -f "$C" >/dev/null 2>&1 || true
  docker create --name "$C" -v "$OUT/b1/bundle:/bundle:ro" -v "$OUT/r1/ws:/workspace" "$IMAGE" sleep infinity >/dev/null
  docker start "$C" >/dev/null
  docker exec "$C" bash -c 'uv tool install --offline --no-index --find-links /bundle specify-cli' > "$OUT/r1/install.txt" 2>&1
  ANTHROPIC_AUTH_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")" docker exec -i -e ANTHROPIC_AUTH_TOKEN \
    -e CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 "$C" timeout 1800 claude -p "$prompt" --output-format stream-json --verbose \
    --model "$MODEL" --session-id "$(cat /proc/sys/kernel/random/uuid)" --permission-mode bypassPermissions \
    --setting-sources project --max-budget-usd 2.50 < /dev/null > "$OUT/r1/session.jsonl" 2> "$OUT/r1/stderr.txt" \
    || echo "exit $?" > "$OUT/r1/exit.txt"
  docker rm -f "$C" >/dev/null
  git -C "$OUT/r1/ws" status --porcelain --untracked-files=all > "$OUT/r1/status.txt"
  echo "R1: spent $(spent) USD"
  [ -s "$TOKEN_FILE" ] || { echo "secret scan failed: no token"; exit 3; }
  set +e; HITS="$(grep -rlFf <(tr -d '[:space:]' < "$TOKEN_FILE") -- "$OUT" 2>/dev/null)"; RC=$?; set -e
  [ "$RC" -le 1 ] || { echo "secret scan failed: grep exited $RC"; exit 3; }
  echo "files containing the token: $(printf '%s' "$HITS" | grep -c . || true)"
}

case "${1:-}" in B1) b1 ;; B2) b2 ;; R1) r1 ;; *) echo "usage: probe.sh B1|B2|R1"; exit 64 ;; esac
