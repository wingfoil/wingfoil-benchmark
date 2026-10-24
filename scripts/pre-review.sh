#!/usr/bin/env bash
# The checks before a review round (dl-020 option C, task-098): changed Markdown checked for width and a final newline,
# Prettier on every file the branch changed; eslint on changed sources; tsc; the touched test files with the traceability test; test:bin when the CLI,
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

# Markdown, which .prettierignore leaves out (Prettier would rewrite the front matter WingFoil writes): every line the
# branch added within 120 characters, tables, code blocks, the front matter and lines holding a link or a URL apart, and a final newline.
# The byte-pinned paths stay out (scenario versions, WingFoil's captured output).
mapfile -t markdown < <(printf '%s\n' "${changed[@]}" | grep -E '\.md$' \
  | grep -vE '^(scenarios/[^/]+/[^/]+/|test/fixtures/wingfoil-config/)' || true)
if [ "${#markdown[@]}" -gt 0 ]; then
  echo "pre-review: markdown"
  red=0
  for file in "${markdown[@]}"; do
    # The lines the branch added to the file (their numbers in its new version): a long line the file already had is
    # not this task's.
    added="$(git -c core.quotePath=false diff -U0 "$base"...HEAD -- "$file" | awk '
      /^@@/ { split($3, a, ","); n = substr(a[1], 2) + 0; next }
      /^\+\+\+/ { next }
      /^\+/ { printf "%d ", n; n++ }')"
    awk -v added=" $added" '
      FNR == 1 && /^---$/ { front = 1; next }
      front && /^---$/ { front = 0; next }
      front { next }
      /^[[:space:]]*(```|~~~)/ { fence = !fence; next }
      fence || /^[[:space:]]*\|/ || /\]\(/ || /:\/\// { next }
      index(added, " " FNR " ") && length($0) > 120 {
        printf "%s:%d: %d characters, over 120\n", FILENAME, FNR, length($0) > "/dev/stderr"; bad = 1 }
      END { exit bad }' "$file" || red=1
    if [ -s "$file" ] && [ "$(tail -c 1 "$file" | od -An -c | tr -d ' ')" != '\n' ]; then
      echo "$file: no newline at the end" >&2; red=1
    fi
  done
  if [ "$red" -ne 0 ]; then echo "pre-review: markdown is red" >&2; exit 1; fi
fi
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
