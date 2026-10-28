---
id: task-115-campaign-007-s-codex-scope-on-gpt-6-luna-instead-of-gpt-6.1-terra-dl-031
type: task
title: "campaign-007's Codex scope on gpt-6-luna instead of gpt-6.1-terra (dl-031)"
status: draft
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
