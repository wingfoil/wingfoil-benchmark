# Shared bits of the task-011 probes. Sourced, never run on its own.
# The WingFoil clone is only read: `git archive` and `rev-parse`, nothing else (task-011 Design).
set -euo pipefail

SPIKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SPIKE_DIR/../.." && pwd)"
OUT="$SPIKE_DIR/out"
WINGFOIL_REPO="${BENCH_WINGFOIL_REPO:-$REPO_DIR/../WingFoil2}"
PIN="3df305e"
# The run image's base, by the digest docker/run-image/Dockerfile pins.
NODE_IMAGE="$(sed -n 's/^FROM \(node:[^ ]*\).*/\1/p' "$REPO_DIR/docker/run-image/Dockerfile")"
IMAGE_FAKE="bench-spike-task-011-fake"
IMAGE_AGENT="bench-spike-task-011-agent"

mkdir -p "$OUT"

# Seconds since the epoch, with milliseconds, for timings.
now() { date +%s.%N | cut -c1-14; }
elapsed() { node -e "process.stdout.write((Number(process.argv[2])-Number(process.argv[1])).toFixed(1))" "$1" "$2"; }

# The clone's state, to prove it was not touched.
clone_state() {
  echo "HEAD $(git -C "$WINGFOIL_REPO" rev-parse HEAD)"
  echo "status:"
  git -C "$WINGFOIL_REPO" status --porcelain=v1 | sha256sum
}

# A clean archive of the pinned commit in $1.
archive_pin() {
  rm -rf "$1"; mkdir -p "$1"
  git -C "$WINGFOIL_REPO" archive "$PIN" | tar -x -C "$1"
}
