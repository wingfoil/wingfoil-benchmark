#!/usr/bin/env bash
# task-094 (plan-004 step 3-bis, dl-019): the Codex adapter spike. F1 the release, the source of its --json events, its
# auth storage and its limit messages; F2 the binary in the run image. Both free: no credential, no session.
# Usage: probe.sh F1 | F2
set -euo pipefail
SPIKE_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SPIKE_DIR/../.." && pwd)"
# Output in the main checkout's ignored out/ (multi-session directive), whichever checkout runs this.
MAIN="$(git -C "$SPIKE_DIR" worktree list --porcelain | sed -n '1s/^worktree //p')"
OUT="${BENCH_SPIKE_OUT:-$MAIN/spikes/task-094/out}"; mkdir -p "$OUT"
VERSION="${AGENT_VERSION:-$(cat "$OUT/candidate.txt" 2>/dev/null || true)}"
IMAGE="bench-spike-task-094-codex-$VERSION"

# The files of Codex's source that the adapter's reading rests on, at the candidate's tag.
SOURCES=(
  codex-rs/exec/src/exec_events.rs
  codex-rs/exec/src/event_processor_with_jsonl_output.rs
  codex-rs/codex-api/src/sse/responses.rs
  codex-rs/login/src/auth/storage.rs
  codex-rs/protocol/src/error.rs
  codex-rs/models-manager/models.json
  codex-rs/models-manager/src/manager.rs
  codex-rs/core/src/config/mod.rs
)

f1() {
  mkdir -p "$OUT/f1/source"
  npm view @openai/codex dist-tags --json > "$OUT/f1/dist-tags.json"
  npm view @openai/codex time --json > "$OUT/f1/time.json"
  node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).latest)' \
    "$OUT/f1/dist-tags.json" > "$OUT/candidate.txt"
  local v; v="$(cat "$OUT/candidate.txt")"
  npm view "@openai/codex@$v" dist.integrity > "$OUT/f1/integrity.txt"
  : > "$OUT/f1/sources.txt"
  for path in "${SOURCES[@]}"; do
    local url="https://raw.githubusercontent.com/openai/codex/rust-v$v/$path"
    curl -fsSL "$url" -o "$OUT/f1/source/$(echo "$path" | tr / _)"
    echo "$url" >> "$OUT/f1/sources.txt"
  done
  echo "fetched $(date -u +%FT%TZ)" >> "$OUT/f1/sources.txt"
  echo "candidate: $v (latest, $(node -e 'process.stdout.write(require(process.argv[1])[process.argv[2]])' "$OUT/f1/time.json" "$v"))"
}

f2() {
  [ -n "$VERSION" ] || { echo "no candidate: run F1 first"; exit 64; }
  # The run image's base, with Codex on top: the run image itself learns AGENT_NAME=codex through the task's red test.
  local base; base="$(sed -n 's/^FROM //p' "$REPO/docker/run-image/Dockerfile" | head -1)"
  docker image inspect "$IMAGE" >/dev/null 2>&1 || printf 'FROM %s\nRUN npm install --global "@openai/codex@%s"\nUSER node\n' \
    "$base" "$VERSION" | nice -n 19 docker build -q -t "$IMAGE" - >/dev/null
  mkdir -p "$OUT/f2"
  docker run --rm "$IMAGE" codex --version > "$OUT/f2/version.txt" 2>&1
  docker run --rm "$IMAGE" codex exec --help > "$OUT/f2/exec-help.txt" 2>&1
  docker run --rm "$IMAGE" codex exec resume --help > "$OUT/f2/resume-help.txt" 2>&1
  docker run --rm "$IMAGE" codex login --help > "$OUT/f2/login-help.txt" 2>&1
  echo "F2: $(cat "$OUT/f2/version.txt")"
}

for stage in "$@"; do
  case "$stage" in
    F1) f1 ;;
    F2) f2 ;;
    *) echo "unknown stage: $stage"; exit 64 ;;
  esac
done
