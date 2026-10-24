#!/usr/bin/env bash
# The checks before a review round (dl-020 option C, task-098): Prettier on every file the branch changed, Markdown
# included; tsc; the touched test files with the traceability test; test:bin when the CLI or the site changed. At the
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

mapfile -t changed < <(git diff --name-only --diff-filter=d "$base"...HEAD | LC_ALL=C sort)
if [ "${#changed[@]}" -eq 0 ]; then echo "pre-review: nothing changed over $base"; exit 0; fi

check prettier npx prettier --check --ignore-unknown "${changed[@]}"
check tsc npx tsc --noEmit -p .
mapfile -t tests < <(printf '%s\n' "${changed[@]}" | grep -E '^test/.*\.test\.ts$' || true)
check tests npx vitest run --maxWorkers=2 "${tests[@]}" test/acceptance/traceability.test.ts
if printf '%s\n' "${changed[@]}" | grep -qE '^src/(cli|site)/'; then
  check test:bin npm run test:bin -- --maxWorkers=2
fi
echo "pre-review: green"
