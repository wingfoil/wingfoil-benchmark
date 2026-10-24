#!/usr/bin/env bash
# The checks before a review round (dl-020 option C, task-098): Prettier on every file the branch changed, Markdown
# included; eslint on changed sources; tsc; the touched test files with the traceability test; test:bin when the CLI,
# the site or a bin test changed (the default vitest config excludes test/bin/ and test/docker/). At the
# lowest priority, vitest with 2 workers (dl-016); it stops at the first red check and names it. No agent, no
# credential, nothing written. The full suites stay scripts/full-suites.sh's.
# Usage: scripts/pre-review.sh <base>   (the branch the task's branch forks from, usually main)
set -uo pipefail
base="${1:?usage: scripts/pre-review.sh <base>}"
low() { nice -n 19 ionice -c3 "$@" < /dev/null; }
check() { # $1 = the check's name, then its command
  local name="$1"; shift
  echo "pre-review: $name"
  if ! low "$@"; then echo "pre-review: $name is red" >&2; exit 1; fi
}

git rev-parse --is-inside-work-tree > /dev/null 2>&1 || { echo "pre-review: not in a git repository" >&2; exit 2; }
git rev-parse --verify --quiet "$base^{commit}" > /dev/null || { echo "pre-review: no commit named '$base'" >&2; exit 2; }
diff_out="$(git -c core.quotePath=false diff --name-only --diff-filter=d "$base"...HEAD)" \
  || { echo "pre-review: git diff over $base failed" >&2; exit 2; }
mapfile -t changed < <(printf '%s\n' "$diff_out" | grep -v '^$' | LC_ALL=C sort)
if [ "${#changed[@]}" -eq 0 ]; then echo "pre-review: nothing changed over $base"; exit 0; fi

check prettier npx prettier --check --ignore-unknown "${changed[@]}"
mapfile -t sources < <(printf '%s\n' "${changed[@]}" | grep -E '\.(ts|mts|js|mjs)$' || true)
if [ "${#sources[@]}" -gt 0 ]; then check eslint npx eslint "${sources[@]}"; fi
check tsc npx tsc --noEmit -p .
mapfile -t tests < <(printf '%s\n' "${changed[@]}" | grep -E '^test/.*\.test\.ts$' || true)
check tests npx vitest run --maxWorkers=2 "${tests[@]}" test/acceptance/traceability.test.ts
if printf '%s\n' "${changed[@]}" | grep -qE '^(src/(cli|site)|test/bin)/'; then
  check test:bin npm run test:bin -- --maxWorkers=2
fi
echo "pre-review: green"
