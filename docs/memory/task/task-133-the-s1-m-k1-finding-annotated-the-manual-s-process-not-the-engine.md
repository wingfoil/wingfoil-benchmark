---
id: task-133-the-s1-m-k1-finding-annotated-the-manual-s-process-not-the-engine
type: task
title: "The S1 M-K1 finding annotated: the manual's process, not the engine"
status: draft
release: v0.3
wave: W16
features: [F5.4]
acceptance: []
requirements: [REQ-RES-05]
fixes: []
tags: ["v0.3","findings","w16"]
---

## Context

The fifth W16 task of [plan-005](../../plans/plan-005-release-v0-3.md), its triage item 4: the S1 M-K1 finding of
`81ebb2691f9c/1` ([findings/81ebb2691f9c-1-s1-1.0-m-k1-baseline+wingfoil.md](../../../findings/81ebb2691f9c-1-s1-1.0-m-k1-baseline+wingfoil.md),
campaign-002's Findings: the wingfoil arm on WingFoil v0.3.0 at 1.70 times the baseline on S1, n = 3) gets its
one-line annotation — the arm's manual imposed WingFoil's process on every step, and the workflow engine never started
([task-095](task-095-wingfoil-v0-3-0-admitted-to-the-wingfoil-arm-the-bridge-s-arm-read-by-its-pinned-digest.md)) —
and is then filed in WingFoil under [dl-009](../decision-log/dl-009-benchmark-findings-linked-to-wingfoil-both-ways-and-verified-by-the-next-campaign.md)
with the approver's consent. The note was exported before
[task-130](task-130-the-cited-template-and-an-interrupted-step-s-cost-bug-031-bug-032.md), and cites v0.2.2's template
(bug-031). A documentation task: no real-agent session, no spending, nothing written into WingFoil by the agent
(dl-009's Consequences).

## Acceptance criteria

1. **The note re-exported** with `bench finding 81ebb2691f9c/1 --scenario S1@1.0 --metric M-K1 --arms baseline,wingfoil
   --as decision-log`, so that it cites the template of the WingFoil its wingfoil runs ran (task-130); the diff against
   the committed note is that line alone, every figure unchanged.
2. **The annotation**, one hand-written line, said so in the commit (dl-009 point 2's rule for hand-written lines): in
   the note under its title and in its WingFoil block's Context, so that it travels with the filing: "Reading: the
   wingfoil arm's manual had the agent follow WingFoil's process (records, submissions, approval requests) at every
   step, and WingFoil 0.3.0's workflow engine was never started (task-095): the 1.70× is the cost of that process as
   the manual set it, not of the engine." Its figures (1.70×, n = 3) recomputed by a script from the aggregate.
3. **campaign-002's Findings** carry the same reading beside the note.
4. **The filing** (dl-009): the decision-log text to paste, from the note's WingFoil block with the annotation, handed
   to the approver with the `wingfoil memory add` command for the WingFoil repository; filed only with the approver's
   consent, by the approver unless the approver asks the agent in chat; once filed, its id written back under the
   note's title and in campaign-002's Findings (dl-009 point 2).
5. Checks: prettier, `scripts/pre-review.sh main`; an independent review (dl-020).

## Design

- `findings/81ebb2691f9c-1-s1-1.0-m-k1-baseline+wingfoil.md`: re-exported, then the annotation added in its two places.
- `docs/memory/campaign/campaign-002-v0-2-reference-campaign.md`: the reading beside the note in Findings.
- The ratio from `results/81ebb2691f9c/1/aggregate.json` (the S1@1.0 groups' mean M-K1), by an inline Node command
  quoted in the Execution notes.
- No code changes; the full suites only if the approver asks (documentation alone).

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
