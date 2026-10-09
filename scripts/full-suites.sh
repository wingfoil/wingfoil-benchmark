#!/usr/bin/env bash
# The benchmark's full suites (dl-016, task-075): lint, `npm test` with coverage, test:bin and test:docker, on the main
# checkout and every task/* worktree — or only on the branches named as arguments — one at a time, at the lowest CPU
# and I/O priority, vitest with 2 workers. Run on demand, when the machine is free (the approver's choice of
# 2026-10-09: never from a cron on a machine that sleeps). Each branch's log goes to $WFB_OUT/<date>/<branch>.txt, and
# a line per branch to summary.txt; a run holds a lock, and a second one runs nothing. No agent, no credential.
# Usage: scripts/full-suites.sh [branch…]
set -uo pipefail
MAIN="${WFB_MAIN:-$(git -C "$(dirname "$0")" worktree list --porcelain | sed -n '1s/^worktree //p')}"
OUT="${WFB_OUT:-$MAIN/.cache/full-suites}"
export BENCH_SPECKIT_REPO="${BENCH_SPECKIT_REPO:-$HOME/.cache/wfb/spec-kit}"
export BENCH_WINGFOIL_REPO="${BENCH_WINGFOIL_REPO:-$(dirname "$MAIN")/WingFoil2}"
DAY_DIR="$OUT/$(date +%F)"; mkdir -p "$DAY_DIR"
exec 9> "$OUT/.lock"
flock -n 9 || { echo "$(date -Is) another full-suites run is in progress" >> "$DAY_DIR/summary.txt"; exit 0; }

low() { nice -n 19 ionice -c3 "$@"; }

run() { # $1 = worktree, $2 = branch
  local dir="$1" branch="$2" log; log="$DAY_DIR/$(echo "$branch" | tr '/' '_').txt"
  cd "$dir" || return
  {
    echo "== $branch $(git rev-parse --short HEAD) $(date -Is)"
    low npm run lint; echo "LINT $?"
    low npm test -- --maxWorkers=2; echo "TEST $?"
    low npm run build > /dev/null 2>&1
    low npm run test:bin -- --maxWorkers=2; echo "BIN $?"
    low npm run test:docker; echo "DOCKER $?"
    echo "== end $(date -Is)"
  } > "$log" 2>&1
  echo "$branch $(git rev-parse --short HEAD): $(grep -E '^(LINT|TEST|BIN|DOCKER) ' "$log" | tr '\n' ' ')" >> "$DAY_DIR/summary.txt"
}

wanted() { # the branch is named on the command line, or none is and it is main or a task's
  local branch="$1"; shift
  if [ "$#" -eq 0 ]; then case "$branch" in main | task/*) return 0 ;; *) return 1 ;; esac; fi
  local name; for name in "$@"; do [ "$name" = "$branch" ] && return 0; done; return 1
}

while read -r dir ref; do
  branch="${ref#refs/heads/}"
  wanted "$branch" "$@" && run "$dir" "$branch"
done < <(git -C "$MAIN" worktree list --porcelain | awk '/^worktree /{w=$2} /^branch /{print w, $2}')
echo "$(date -Is) done" >> "$DAY_DIR/summary.txt"
