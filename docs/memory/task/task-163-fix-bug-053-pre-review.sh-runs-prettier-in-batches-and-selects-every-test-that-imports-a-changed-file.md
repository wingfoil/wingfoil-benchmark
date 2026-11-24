---
id: task-163-fix-bug-053-pre-review.sh-runs-prettier-in-batches-and-selects-every-test-that-imports-a-changed-file
type: task
title: "Fix bug-053: pre-review.sh runs Prettier in batches and selects every test that imports a changed file"
status: in-progress
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-04]
fixes: [bug-053-scripts-pre-review.sh-stops-at-prettier-with-no-message-when-a-branch-changes-more-files-than-one-npx-argument-can-hold]
tags: ["bug","tooling","review","v0.4"]
---

## Context

[bug-053](../bug/bug-053-scripts-pre-review.sh-stops-at-prettier-with-no-message-when-a-branch-changes-more-files-than-one-npx-argument-can-hold.md), and [rel-v0-3](../release/rel-v0-3.md)'s Retrospective ("What to change" 3; the approver's
decision of 2026-11-22): `scripts/pre-review.sh` stops at Prettier with no message when a branch changes more files
than one `npx` argument list can hold, and its targeted tests miss tests that import a changed file, so the full
suites went red after a green pre-review in six v0.3 tasks. Third in W20's order, since every later review runs it.

**Done** means: the script never stops silently, and its selection covers every test that imports a changed file.

## Acceptance criteria

1. Red first: a branch fixture with more changed files than one argument list holds makes the script fail
   today with no message; after the fix Prettier runs in batches and every file is checked.
2. Red first: a changed module imported only indirectly by a test (through another module) selects that test.
3. Any stage that fails prints its name and exits non-zero; no stage is skipped without a line saying so.
4. The script's usage in the `kanban-delivery` workflow and in `CONTRIBUTING` (or wherever it is documented) matches.
5. Checks: `scripts/pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

`batched` in `scripts/pre-review.sh` passes every file-list check (Prettier, eslint, the changed test files, the related
tests) in batches of at most 200 files and 60000 bytes of paths (well under the 131072 bytes one argument may hold),
through `check`, which names a red stage and exits 1 (process substitution, so the exit reaches the script). The bytes
are counted by `byte_length` in the C locale, so a multibyte path counts its bytes, not its characters; the locale is
set only inside that function, never for the checks. The traceability and evaluation-page tests run once, outside the
batches. The changed test files drop `test/bin/`, `test/docker/` and `test/fixtures/`, which `vitest.config.ts`
excludes (a `vitest run` whose filter selects only excluded files exits 1, 'No test files found'), with a
`pre-review: tests skipped for N file(s)` line naming them; the batched call also passes `--passWithNoTests`, so a
config that drifts from the list cannot turn a correct branch red (the fixed-tests call still runs). Related tests:
`npx vitest related --run` on every changed source that is not a test file, which follows the import graph, so a module
imported only through another selects its tests; it uses the default config, so tests under `test/bin/`, `test/docker/`
and `test/fixtures/` are never selected (`test:bin` covers the first). Every skipped stage prints
`pre-review: <stage> skipped: <why>`. Tests in `test/unit/scripts/pre-review.test.ts`; README's Pre-review section
updated.

## Execution notes

Red first not run separately: the new tests were written with the fix. `wingfoil workflow next` behaved as declared.
`scripts/pre-review.sh main` could not be run in the headless session (refused); the targeted tests (pre-review,
traceability, docs: 7 files, 85 tests) are green. The full suites are left to the approver's go.

### Review

Post-fix checklist (work-item review step, dl-020) run before each round: the Design, the notes, the README and the
script header searched for every term the fix changed (200 files, bytes, characters, related, test/docker).

| Round | Fix commit | Reviewer | Findings | Outcome |
| ----- | ---------- | -------- | -------- | ------- |
| 1 | `1d85e7d4` | independent review | batching only by count; skipped stages silent; fixed tests run per batch | fixed: bytes bound, a line per skipped stage, fixed tests once |
| 2 | `1ed5779a` | independent review | `vitest related` fed a folder list that drifted from the layout | fixed: every changed non-test source |
| 3 | `89a16f9d` | claude-opus-5-5 | should-fix: a byte bound measured in characters; should-fix: Design and notes stale; should-fix: claim wider than the selection (`test/bin/`, `test/docker/`); nit: header line of 129 characters | fixed: `byte_length` in the C locale and a 4-byte-path test, Design and notes updated, scope stated in README and header, header rewrapped |

| 4 | `bfbe5517` | runner re-review of `89a16f9d` | blocker (class: a `vitest run` filter that can select no test exits 1): changed tests all under `test/bin/` made the batched call red; the fixture's fake npx could not see it | fixed: excluded folders dropped with a skipped line, `--passWithNoTests` on the batched call, the fake npx fails such a run, a test for both |

Rounds 1 and 2 are recorded from the commit messages; their findings' wording and severities were not kept in the
session, so they are summarised. Class checked in round 4: of the calls taking a file filter, `vitest related` passes
with no test (default `passWithNoTests`), Prettier and eslint count named files as results, and the batched `vitest run`
is the only one that could select nothing. The fix diff of round 4 awaits its re-review.
