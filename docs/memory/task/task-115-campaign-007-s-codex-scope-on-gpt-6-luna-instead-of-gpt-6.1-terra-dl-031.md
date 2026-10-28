---
id: task-115-campaign-007-s-codex-scope-on-gpt-6-luna-instead-of-gpt-6.1-terra-dl-031
type: task
title: "campaign-007's Codex scope on gpt-6-luna instead of gpt-6.1-terra (dl-031)"
status: in-progress
release: v0.3
wave: W15
features: []
acceptance: []
requirements: [REQ-RUN-15]
fixes: []
tags: ["v0.3","codex"]
---

## Context

[dl-031](../decision-log/dl-031-gpt-6-luna-replaces-gpt-6.1-terra-as-campaign-007-s-model-slice-the-weak-model-on-codex-before-2026-11-13.md)
(the approver's choice in chat, 2026-10-28) makes `gpt-6-luna` campaign-007's model slice, every scenario × 3, in
place of dl-028's `gpt-6.1-terra`. The Codex credential's scope (`src/cli/codex-scope.ts`, task-114's entry for
campaign-007's file and dry-run profile) accepts `gpt-5.6-terra` and `gpt-6.1-terra` there: it must accept
`gpt-6-luna` and no longer `gpt-6.1-terra`, before any Luna session. W15, ahead of campaign-007 (dl-027's third cut is
past: task-114 approved on 2026-10-28). **It starts only once dl-031 is approved.**

**No real-agent session. Spending: 0 €.** Luna's dry runs are campaign-007's, consented there.

**Done** means: `campaign run` and `scenario dry-run` accept campaign-007's file and profile on `gpt-5.6-terra` and
`gpt-6-luna` and refuse `gpt-6.1-terra` there; REQ-RUN-15 says so.

## Acceptance criteria

1. **The scope:** campaign-007's entry runs the three arms on `gpt-5.6-terra` and `gpt-6-luna`; `gpt-6.1-terra` refused
   for its file and its profile, naming dl-027 and dl-031; every other entry unchanged. **Red-first.**
2. **The profile:** `campaigns/codex-terra-step-a.dry-run.yaml` pins `gpt-6-luna` at `medium` beside `gpt-5.6-terra`
   (no `gpt-6.1-terra`); its characterization test reads it. **Red-first.**
3. **REQ-RUN-15 as amended in 1.42** (requirements 1.42): campaign-007's models `gpt-5.6-terra` and `gpt-6-luna`.
   **Characterization** (document).

## Design

- `src/cli/codex-scope.ts`: campaign-007's entry's `models` and `decision` (`dl-027, dl-031`); the refusal messages
  follow from them. Tests in `test/unit/cli/codex-scope.test.ts` and `test/unit/campaign/codex-terra.test.ts`.
- `campaigns/codex-terra-step-a.dry-run.yaml`: the effort map. No arm changes, so no digest moves.
- Under the review rule dl-020; `scripts/pre-review.sh main` before the round; the full suites on demand.
- **Not in this task:** campaign-007's element, its campaign file and its estimate (campaign-cycle), Luna's dry runs.

## Execution notes

- **2026-10-28, in-progress.** Branch `task/task-115-…` in the worktree `../WingFoil2-Benchmark-wt/task-115`, `npm ci`.
- **Red first** (`155cdfab`): `test/unit/cli/codex-scope.test.ts` and `test/unit/campaign/codex-terra.test.ts` moved to
  `gpt-6-luna` and dl-031, with a new case refusing `gpt-6.1-terra` for campaign-007's file and its profile (each arm),
  and a new one pinning the profile's effort map to exactly `gpt-5.6-terra` and `gpt-6-luna` at `medium`; 11 of 23
  failed against `main`.
- **Code** (`src/cli/codex-scope.ts`): the step-A entry's `models` are `gpt-5.6-terra, gpt-6-luna`, its `decision`
  `dl-027, dl-031`; the refusals of a preset and of a profile name `dl-024, dl-025, dl-027, dl-031`, derived from the
  entries. No other entry changed. `campaigns/codex-terra-step-a.dry-run.yaml`: the effort map and the header comment;
  no arm changes, so no digest moves. Requirements 1.42: REQ-RUN-15's amendment and `### Amendment 1.42`.
- `src/agents/openai-prices.ts` keeps `gpt-6.1-terra`'s price: it is a catalogue, not the scope.
- **Checks:** prettier, `tsc --noEmit`, eslint clean; `scripts/pre-review.sh main` green.

### Review

- **Round 1 (2026-10-28, dl-020):** a fresh read-only agent, briefed to write nothing in either checkout (scratch in a
  `mktemp -d` under `/tmp/claude-1000/` only); both checkouts' HEAD and reflog the same after as before (main
  `7ecd6743`, the branch `404983e6`). It ran the two test files (23/23). **No blocker, no should-fix; three nits:**
  1. Amendment 1.42's dl-031 link line is over 120 characters: one unbreakable link, as 1.41's. Kept.
  2. The dl-025 profile probe in "keeps gpt-6-luna to campaign-007's file and profile…" still used `gpt-6.1-terra`,
     out of step with the test's name. **Fixed:** it probes `gpt-6-luna`.
  3. 1.42's "their refusals name dl-027 and dl-031" leaves the date's refusal (dl-024) to 1.41's sentence. Kept.
  A nit-only round closes the review.
