#!/usr/bin/env bash
# The checks before a review round (dl-020 option C, task-098, bug-053): changed Markdown checked for width and a final
# newline; Prettier on every file the branch changed; eslint on changed sources; tsc; the touched test files with the
# traceability and evaluation-page tests; the tests that import a changed source, directly or through another module
# (vitest related, which uses the default config: tests under test/bin/ and test/docker/ are not selected, so test:bin
# covers the first). Every file-list check runs in batches of 200 files or 60000 bytes (counted in bytes, not
# characters), and every skipped stage prints 'pre-review: <stage> skipped: <why>'. test:bin when the CLI, the site or
# a bin test changed. At the lowest priority, vitest with 2 workers (dl-016); it stops at the first red check and names
# it. No agent, no credential, nothing written. The full suites stay scripts/full-suites.sh's.
# Usage: scripts/pre-review.sh <base>   (the branch the task's branch forks from, usually main)
set -uo pipefail
base="${1:?usage: scripts/pre-review.sh <base>}"
low() { nice -n 19 ionice -c3 "$@" < /dev/null; }
batch_size=200 # files per command: one argument list holds only so many (bug-053)
batch_bytes=60000 # bytes of file names per command, well under the 131072 one argument may hold (bug-053)
byte_length() { # $1 = a string; REPLY = its length in bytes (the C locale counts bytes; only here, never in the checks)
  local LC_ALL=C
  REPLY=${#1}
}
batched() { # $1 = the check's name, $2.. = the command; the files on stdin, one per line, passed in batches
  local name="$1"; shift
  local -a files=() chunk=()
  local file size=0
  mapfile -t files
  for file in "${files[@]}"; do
    byte_length "$file"
    # Close the batch before it passes either bound: a count of files and a count of bytes.
    if [ "${#chunk[@]}" -gt 0 ] && { [ "${#chunk[@]}" -ge "$batch_size" ] \
      || [ $((size + REPLY + 1)) -gt "$batch_bytes" ]; }; then
      check "$name" "$@" "${chunk[@]}"; chunk=(); size=0
    fi
    chunk+=("$file"); size=$((size + REPLY + 1))
  done
  if [ "${#chunk[@]}" -gt 0 ]; then check "$name" "$@" "${chunk[@]}"; fi
}
stage_if() { # $1 = the stage's name, $2 = why it may be skipped, $3 = a function (true: run), $4.. = the stage
  local name="$1" reason="$2" condition="$3"; shift 3
  if "$condition"; then "$@"; else echo "pre-review: $name skipped: $reason"; fi
}
check() { # $1 = the check's name, then its command
  local name="$1"; shift
  echo "pre-review: $name"
  if ! low "$@"; then echo "pre-review: $name is red" >&2; exit 1; fi
}

git rev-parse --is-inside-work-tree > /dev/null 2>&1 || { echo "pre-review: not in a git repository" >&2; exit 2; }
git rev-parse --verify --quiet "$base^{commit}" > /dev/null \
  || { echo "pre-review: no commit named '$base'" >&2; exit 2; }
diff_out="$(git -c core.quotePath=false diff --name-only --diff-filter=d "$base"...HEAD)" \
  || { echo "pre-review: git diff over $base failed" >&2; exit 2; }
mapfile -t changed < <(printf '%s\n' "$diff_out" | grep -v '^$' | LC_ALL=C sort)
if [ "${#changed[@]}" -eq 0 ]; then echo "pre-review: nothing changed over $base"; exit 0; fi

# Markdown, which .prettierignore leaves out (Prettier would rewrite the front matter WingFoil writes): every line the
# branch added within 120 characters, tables, code blocks, the front matter and lines holding a link or a URL apart,
# and a final newline.
# The byte-pinned paths stay out: scenario versions, WingFoil's captured output, a run's records (results/, bug-040),
# and the finding notes `bench finding` generates (findings/, task-133), their hand-written lines kept short by hand.
mapfile -t markdown < <(printf '%s\n' "${changed[@]}" | grep -E '\.md$' \
  | grep -vE '^(scenarios/[^/]+/[^/]+/|test/fixtures/wingfoil-config/|results/|findings/)' || true)
markdown_stage() {
  echo "pre-review: markdown"
  red=0
  for file in "${markdown[@]}"; do
    # The lines the branch added to the file (their numbers in its new version): a long line the file already had is
    # not this task's.
    added="$(git -c core.quotePath=false diff -U0 "$base"...HEAD -- "$file" | awk '
      /^@@/ { split($3, a, ","); n = substr(a[1], 2) + 0; inhunk = 1; next }
      inhunk && /^\+/ { printf "%d ", n; n++ }')"
    # The committed text (git show), whose numbers the diff gives; gawk counts characters in a UTF-8 locale.
    awk -v added=" $added" -v name="$file" '
      FNR == 1 && /^---$/ { front = 1; next }
      front && /^---$/ { front = 0; next }
      front { next }
      /^[[:space:]]*(```|~~~)/ { fence = !fence; next }
      fence || /^[[:space:]]*\|/ || /\]\(/ || /:\/\// { next }
      index(added, " " FNR " ") && length($0) > 120 {
        printf "%s:%d: %d characters, over 120\n", name, FNR, length($0) > "/dev/stderr"; bad = 1 }
      END { exit bad }' <(git show "HEAD:$file") || red=1
    last="$(git show "HEAD:$file" | tail -c 1 | od -An -c | tr -d ' ')"
    if [ -n "$last" ] && [ "$last" != '\n' ]; then
      echo "$file: no newline at the end" >&2; red=1
    fi
  done
  if [ "$red" -ne 0 ]; then echo "pre-review: markdown is red" >&2; exit 1; fi
}
has_markdown() { [ "${#markdown[@]}" -gt 0 ]; }
stage_if markdown "no changed Markdown to check" has_markdown markdown_stage
batched prettier npx prettier --check --ignore-unknown < <(printf '%s\n' "${changed[@]}")
mapfile -t sources < <(printf '%s\n' "${changed[@]}" | grep -E '\.(ts|mts|js|mjs)$' || true)
has_sources() { [ "${#sources[@]}" -gt 0 ]; }
eslint_stage() { batched eslint npx eslint < <(printf '%s\n' "${sources[@]}"); }
stage_if eslint "no changed source (.ts, .mts, .js, .mjs)" has_sources eslint_stage
check tsc npx tsc --noEmit -p .
# The changed test files go in batches too; the two fixed tests run once, outside them.
mapfile -t tests < <(printf '%s\n' "${changed[@]}" | grep -E '^test/.*\.test\.ts$' || true)
tests_stage() {
  if [ "${#tests[@]}" -gt 0 ]; then batched tests npx vitest run --maxWorkers=2 < <(printf '%s\n' "${tests[@]}"); fi
  check tests npx vitest run --maxWorkers=2 test/acceptance/traceability.test.ts test/unit/docs/evaluate-page.test.ts
}
tests_stage
# Every test that imports a changed file, directly or through another module (bug-053): vitest follows the import graph.
# Every changed source that is not a test file, wherever it sits: no folder list to drift from the layout. vitest
# related passes when no test imports a file.
mapfile -t related < <(printf '%s\n' "${sources[@]}" | grep -vE '^$|\.test\.ts$' || true)
has_related() { [ "${#related[@]}" -gt 0 ]; }
related_stage() { batched tests-related npx vitest related --run --maxWorkers=2 < <(printf '%s\n' "${related[@]}"); }
stage_if tests-related "no changed source besides test files" has_related related_stage
has_bin() { printf '%s\n' "${changed[@]}" | grep -qE '^(src/(cli|site)|test/bin)/'; }
bin_stage() { check test:bin npm run test:bin -- --maxWorkers=2; }
stage_if test:bin "no change under src/cli, src/site or test/bin" has_bin bin_stage
echo "pre-review: green"
