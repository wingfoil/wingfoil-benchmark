#!/usr/bin/env bash
# The benchmark's full suites (dl-016, task-075): lint, `npm test` with coverage, the build, test:bin and test:docker,
# on the main checkout and every task/* worktree — or only on the branches named as arguments — one at a time, niced
# and at idle I/O priority (the containers test:docker starts are dockerd's, and keep their own), vitest with 2 workers.
# Run on demand, when the machine is free (the approver's choice of 2026-10-09: never from a cron on a machine that
# sleeps). Each branch's log is $WFB_OUT/<date>/<branch>-<commit>-<hhmmss>.txt, never overwritten; summary.txt gets a
# line per branch: the commit the run started on, DIRTY when the worktree had changes not committed, each stage's exit
# code and the log's name. A run holds a lock, and a second one runs nothing. No agent, no credential.
# Usage: scripts/full-suites.sh [branch…]
set -uo pipefail
MAIN="${WFB_MAIN:-$(git -C "$(dirname "$0")" worktree list --porcelain | sed -n '1s/^worktree //p')}"
[ -n "$MAIN" ] || { echo "full-suites: not in a git repository, and WFB_MAIN is not set" >&2; exit 2; }
MAIN="$(cd "$MAIN" && pwd)"
OUT="${WFB_OUT:-$MAIN/.cache/full-suites}"; mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
export BENCH_SPECKIT_REPO="${BENCH_SPECKIT_REPO:-$HOME/.cache/wfb/spec-kit}"
export BENCH_WINGFOIL_REPO="${BENCH_WINGFOIL_REPO:-$(dirname "$MAIN")/WingFoil2}"
DAY_DIR="$OUT/$(date +%F)"; mkdir -p "$DAY_DIR"; SUMMARY="$DAY_DIR/summary.txt"
exec 9> "$OUT/.lock"
flock -n 9 || { echo "$(date -Is) another full-suites run is in progress" | tee -a "$SUMMARY"; exit 0; }

# Lowest priority; no stdin (the worktree list is the loop's) and no lock descriptor (a lingering child would hold it).
low() { nice -n 19 ionice -c3 "$@" < /dev/null 9>&-; }

run() { # $1 = worktree, $2 = branch
  local dir="$1" branch="$2"
  if ! cd "$dir" 2> /dev/null; then echo "SKIPPED $branch: cannot enter $dir" | tee -a "$SUMMARY"; return; fi
  local sha dirty='' log
  sha="$(git rev-parse --short HEAD)"
  [ -z "$(git status --porcelain)" ] || dirty=' DIRTY'
  log="$DAY_DIR/$(echo "$branch" | tr '/' '_')-$sha-$(date +%H%M%S).txt"
  {
    echo "== $branch $sha$dirty $(date -Is)"
    low npm run lint; echo "LINT $?"
    low npm test -- --maxWorkers=2; echo "TEST $?"
    low npm run build; echo "BUILD $?"
    low npm run test:bin -- --maxWorkers=2; echo "BIN $?"
    low npm run test:docker; echo "DOCKER $?"
    echo "== end $(date -Is)"
  } > "$log" 2>&1
  local codes; codes="$(grep -E '^(LINT|TEST|BUILD|BIN|DOCKER) ' "$log" | tr '\n' ' ')"
  echo "$branch $sha$dirty: $codes(log $(basename "$log"))" | tee -a "$SUMMARY"
}

wanted() { # the branch is named on the command line, or none is and it is main or a task's
  local branch="$1"; shift
  if [ "$#" -eq 0 ]; then case "$branch" in main | task/*) return 0 ;; *) return 1 ;; esac; fi
  local name; for name in "$@"; do [ "$name" = "$branch" ] && return 0; done; return 1
}

# The worktrees, by path and branch: a path is the rest of its line, spaces included; a detached one has no branch.
declare -a dirs=() branches=()
dir=''
while IFS= read -r line; do
  case "$line" in
    'worktree '*) dir="${line#worktree }" ;;
    'branch refs/heads/'*) dirs+=("$dir"); branches+=("${line#branch refs/heads/}") ;;
  esac
done < <(git -C "$MAIN" worktree list --porcelain)

for i in "${!dirs[@]}"; do wanted "${branches[$i]}" "$@" && run "${dirs[$i]}" "${branches[$i]}"; done
for name in "$@"; do
  found=''; for branch in "${branches[@]}"; do [ "$branch" = "$name" ] && found=1; done
  [ -n "$found" ] || echo "NOT FOUND $name: no worktree has it" | tee -a "$SUMMARY"
done
echo "$(date -Is) done" | tee -a "$SUMMARY"
