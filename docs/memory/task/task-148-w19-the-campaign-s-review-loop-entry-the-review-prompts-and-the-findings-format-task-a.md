---
id: task-148-w19-the-campaign-s-review-loop-entry-the-review-prompts-and-the-findings-format-task-a
type: task
title: "W19: the campaign's review_loop entry, the review prompts and the findings' format (task A)"
status: pending
release: v0.3
wave: W19
features: [F4.9]
acceptance:
  - "campaign.feature#A campaign without a review loop is unchanged"
  - "campaign.feature#A campaign pins its review loop"
  - "campaign.feature#A review prompt that names a harness is refused"
requirements: [REQ-FMT-01, REQ-FMT-08, REQ-CLI-05, REQ-RUN-21]
fixes: []
tags: ["v0.3","review-loop","w19"]
---

## Context

W19's task A, after
[task-147](task-147-w19-s-requirements-and-acceptance-the-review-loop-f4.9.md)
(requirements 1.58, the approver's choices of 2026-11-13). It
builds what every later W19 task reads and runs nothing: the campaign's and the dry-run profile's `review_loop` entry
(REQ-FMT-01, REQ-CLI-05), the two prompts `review/prompt.md` and `review/fixer-prompt.md` with their scan (REQ-FMT-08
as amended in 1.58), and the format of the reviewer's findings (REQ-RUN-21, REQ-FMT-06). Task B runs the loop, task C
reads its metrics and publishes them, task D runs the dry runs on consent.

State read on 2026-11-13 (main `9254bbaa`): no `review_loop` key exists in `campaignSchema` (`src/core/campaign.ts`) or
`dryRunProfileSchema` (`src/core/dry-run.ts`), both strict objects, so today a campaign holding one is refused; no
`review/` directory. Code and tests only; nothing spent.

## Acceptance criteria

<!-- Each red first unless marked: a failing test before the code; `acceptance` lists the scenarios as written. -->

1. **The entry** (red first, `campaign.feature` "A campaign pins its review loop"): `review_loop` in a campaign file
   and in a dry-run profile, a strict object: `agent` (`name`, `version`), `model`, `effort`, `prompt` and
   `fixer_prompt` (each `{ file, sha256 }`, the files under `review/`), `max_rounds` (an integer from 1 to 10) and
   `caps` (`session_time_s`, `session_tokens`, `session_cost_eur`, `fixer_interventions`, each positive). An
   unknown key, a missing field or a value out of range is refused, naming its path.
2. **The pins checked** (red first, the same scenario): `bench campaign validate` and the dry run's check refuse a
   prompt file that is missing or whose SHA-256 differs from the pin, naming the file; the reviewer's agent is one of
   the agents a campaign may name (`AGENT_NAMES`, `claude-code` for v0.3, `fake` for the tests) and its effort one that
   agent takes (`effortLevelsOf`), as the campaign's own agent is checked.
3. **The prompts scanned** (red first, "A review prompt that names a harness is refused"): both prompts are scanned as
   the configuring prompt is (`scanConfiguringPrompt` generalized, REQ-FMT-08): no harness name, and no oracle literal
   of any scenario version the campaign or the dry run names, the hold-out's too when one is set; a finding names the
   prompt file and the source, never the literal.
4. **Unchanged without it** (characterization, "A campaign without a review loop is unchanged"): every campaign file
   and dry-run profile in the repository validates as before, with identical output; `review_loop` absent means no
   loop, and nothing else of a campaign's meaning changes.
5. **The findings' format** (red first, unit): `src/core/review.ts` exports the zod schema of the reviewer's final
   result, `{ findings: [{ severity: 'blocker' | 'should-fix' | 'nit', file, line: integer ≥ 1 | null, title, why }] }`,
   strict, `file` a relative path inside the copy (no `..`, not absolute), and a parse function that reads it from a
   session's final message (the JSON alone, or one fenced `json` block), returning an issue for anything else. Task B
   uses it; nothing calls it yet.
6. **The prompts themselves** (`review/prompt.md`, `review/fixer-prompt.md`), written in this task and reviewed at the
   gate: the reviewer's names the severities and their meaning (dl-020's: a blocker breaks a stated requirement or the
   build; a should-fix is a defect a user would meet; a nit is style or wording), asks for findings on the code only,
   read without installing, building or running anything, and the output's JSON shape; round 1 reviews the diff
   between the copy's two commits, a later round the whole copy pointed at the latest commit's diff, which the
   runner states in a short preamble it adds (the prompt file is the same for every round). The fixer's asks the agent
   to fix exactly the findings given, each where it is, and nothing else, and to commit its fix. Neither names a
   harness, a scenario or the benchmark.
7. Checks: prettier, tsc, eslint, `scripts/pre-review.sh main`, the campaign and dry-run tests; an independent review
   (dl-020); the full suites on the approver's go.

## Design

- `src/core/campaign.ts`: `reviewLoopSchema` beside `harness`; `campaignSchema` and, through its `pick`,
  `dryRunProfileSchema` gain `review_loop` optional; the agent and effort checks reuse the campaign agent's.
- `src/runner/campaign.ts` (`checkCampaign`) and `src/scenario/dry-run.ts`: the file and SHA-256 checks, then the
  scan; `src/scenario/configuring.ts`'s `scanConfiguringPrompt` becomes `scanPrompt(path, text, scenarios, …)` with
  the configuring prompt as one caller (its messages unchanged).
- `src/core/review.ts` (new): `findingSchema`, `findingsSchema`, `parseFindings(message)`.
- No runner change, no site change; no campaign file in `campaigns/` gains the entry in this task (task D's profile
  will).

## Execution notes

## Review
