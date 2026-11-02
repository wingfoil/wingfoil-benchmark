---
id: task-128-content-checks-v2-and-the-maintainer-s-rubric-bug-026
type: task
title: "Content checks v2 and the maintainer's rubric (bug-026)"
status: pending
release: v0.3
wave: W16
features: [F4.7]
acceptance:
  - "scoring.feature#A v2 content check reads whole words in the agent's own text"
  - "scoring.feature#The maintainer's judgement is shown beside a content check's verdict"
requirements: [REQ-SCO-06]
fixes: [bug-026-the-oracle-s-content-checks-match-substrings-and-template-text-not-the-agent-s-own-words]
tags: ["v0.3","scoring","w16"]
---

## Context

[bug-026](../bug/bug-026-the-oracle-s-content-checks-match-substrings-and-template-text-not-the-agent-s-own-words.md):
the content checks match substrings over every added line, template text included, so S3's D3 passed on "unchanged"
and on WingFoil's template comment, and S2's duplicate missed one recognised in other words. The first W16 task of
[plan-005](../../plans/plan-005-release-v0-3.md) after
[task-126](task-126-w16-s-requirements-and-acceptance-the-method-corrected-bug-025-bug-026-bug-028-to-bug-032.md),
which amended REQ-SCO-06 in requirements 1.49 (content checks v2) and drafted this task's two @F4.7 scenarios. The
approver asked for it in chat (2026-11-02) and chose, on the proposal of the same day: (A) a qualitative erratum
here, its figures added by W16's re-scoring task; (B) S2 1.1 and S3 1.1, with their v2 checks and rubrics, written
with S1 1.1 (bug-025's task), this task proving the mechanism on fixtures; (C) `judgements.json` written by hand by
the maintainer and validated at the site's build, no new command. No real-agent session, no spending.

## Acceptance criteria

1. **Red-first, `match: words`:** a check file's `match` is `words` (v2) or absent (v1, substrings); any other value
   is refused, naming the field. Every 1.0 check stays v1 and scores as before (the existing tests unchanged).
2. **Red-first, whole words:** under v2 a pattern matches as whole words — case folded, whitespace folded within a
   line and never across two, a boundary being any character that is not a Unicode letter, digit or `_` — so
   "unrevised" does not satisfy "revised" and a stem no longer matches; every group still matches in one candidate.
3. **Red-first, the agent's own text** (the drafted scenario "A v2 content check reads whole words in the agent's own
   text"): the candidates are the lines the step added, by file, seed files included, less every non-blank line equal,
   after trimming, to a line `setup/diff.patch` added in any file; and each commit message of the step, less those
   whose sha is in the ledger's `carried_out.commits` under a scenario with a separate approver. A front-matter line
   counts unless it equals a setup line. A `commits.json` whose `messages` and `commits` differ in length is refused
   at scoring, naming the file.
4. **Red-first, the validator:** the refusal of a check its step's prompt satisfies uses the check's own matching; a
   v2 check with no `oracle/rubric.md`, or no `## <id>` section in it, is refused, naming the check. The rubric is in
   the version's hash (REQ-FMT-09 already covers every file).
5. **Red-first, `score.json`:** each content check records its `match` (`substring` or `words`), beside `where`.
6. **Red-first, the judgement** (the drafted scenario "The maintainer's judgement is shown beside a content check's
   verdict"): `results/<campaign>/<n>/judgements.json` holds judgements keyed by the run's path, the check's id and
   the step, each `pass` or `fail` with an optional note; the site's build refuses a key that names no run, no v2
   check or no scored step, and a file beside an execution of 1.0 versions; the run's page shows the judgement beside
   the automatic verdict, and each execution counts the disagreements.
7. **The erratum for 1.0 (approver's choice A):** the method page states v1's rule and its known misses (a substring
   such as "changed" in "unchanged", template text such as WingFoil's scaffold comment, a duplicate recognised in
   other words); the catalogue notes of the published executions that score a 1.0 content check (S2, S3, S10) point
   to it. The verdicts v2 would change are counted by W16's re-scoring task and added to the same erratum.
8. **The method page:** `site-content/method.md` describes content checks v1 and v2, the rubric and the judgement.
9. Checks: prettier on every changed file, `tsc`, eslint, `scripts/pre-review.sh main`; an independent review
   (dl-020); the full suites on the approver's go.

## Design

- **The check's type and loader:** `ContentCheck` gains `match: 'substring' | 'words'` (`src/core/scenario.ts`);
  `src/scenario/load.ts` reads `match`, refuses another value, requires `oracle/rubric.md` with a `## <id>` heading for
  each v2 check, and runs `promptIssues` with the check's matching.
- **Matching** (`src/core/check-text.ts`): `satisfies` (v1) unchanged; a v2 `satisfiesWords(lines, patterns)` folds
  each line on its own and tests each pattern with a boundary of `[^\p{L}\p{N}_]` or the line's ends, the pattern's
  own inner whitespace folded to one space. Inflections are the check author's patterns.
- **The agent's own text** (`src/scoring/checks.ts`): `addedText` returns lines by file (v1 joins them as today); a v2
  `contentStep` drops the trimmed setup lines (a set built once per run from `setup/diff.patch`, every file), then
  tries each file's remaining lines, then each commit message not made by the verdict hook. The hook's commits come
  from `verdicts.json` and `commits.json`, through readers shared with `src/scoring/governance.ts`; `messages` and
  `commits` are written by the same `git log --reverse` range, so they align by index. A run of a scenario with no
  approver needs no ledger.
- **`score.json`:** `CheckScore` gains `match` for content checks; the site's model reads it.
- **Judgements:** a reader in `src/results/` (zod schema `{ judgements: [{ run, check, step, verdict, note? }] }`),
  checked against the execution's runs and their `score.json`; `src/site/model.ts` and the run's page show it beside
  the verdict; the execution's page counts agreements and disagreements. No CLI (approver's choice C).
- **Fixtures:** a run whose `setup/diff.patch` adds a template holding "Mark it revised"; its step adds "unrevised" to
  a source file, the same template line to a new document, `title: D3 revised` in front matter and "D3 revised" to
  the seed's README; an S10-like variant with a ledger listing a hook commit saying "revised" and an agent commit with
  `Reason: D3 revised`.
- **Tests that change:** none expected; v1 stays the default. New: the two @F4.7 scenarios in `scoring.feature` with
  their tests in `test/acceptance/scoring.test.ts`, red first; unit tests for the matcher, the loader's refusals, the
  setup-line exclusion, the hook's commits and the judgements reader.
- **Not here:** S2 1.1 and S3 1.1 (bug-025's task, approver's choice B); the re-scoring of v0.2's campaigns and the
  erratum's figures (W16's last task).

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
