---
id: task-121-weak-with-a-harness-against-strong-without-the-cross-model-parity-comparison-and-a-local-model-s-estimate-dl-032
type: task
title: "Weak with a harness against strong without: the cross-model parity comparison and a local model's estimate (dl-032)"
status: in-progress
release: v0.3
wave: W17
features: [F4.3, F5.5, F5.8]
acceptance: [scoring.feature, results.feature]
requirements: [REQ-SCO-14, REQ-RES-02, REQ-NFR-06]
fixes: []
tags: ["v0.3","scoring","weak-models"]
---

## Context

[dl-032](../decision-log/dl-032-a-weak-model-with-wingfoil-against-a-strong-model-without-it-cost-and-time-at-equal-quality-and-a-local-model-s-estimate.md) (approved): WingFoil's aim that a weak model with a harness delivers a strong
model's quality, read as a measured, per-scenario verdict with its cost, time and tokens, and a local model's time
estimated from those tokens. dl-032 item 7: a task implements items 2–4 in the scorer, `aggregate.json`, the
execution's page and the method page, and re-scores the executions that have both models; until then its figures are
a script's and are not published. The approver asked for it in chat (2026-11-01, "procedi con il task 32"), after
[campaign-008](../campaign/campaign-008-claude-code-step-a-campaign-on-haiku-5.5-and-sonnet-5.5-every-scenario-on-approver-policy-v5.md) gave both Claude Code models n = 3 on every scenario. Placed in v0.3, W17. No
real-agent session, 0 €. Not here: dl-032 item 6 (where the wingfoil arm's extra tokens go, a transcripts reading with
WingFoil feedback notes), a task of its own.

## Acceptance criteria

1. **Red-first:** the aggregation (`src/results/aggregate.ts`) adds a `parity` section to an execution that has two
   models (the default and a slice) sharing a harness arm and the baseline: per scenario and harness, the cells weak
   harness, strong baseline (the pair H-W reads) and, for reference, weak baseline, weak docs control and strong
   harness, each over a **matched sample** (the same scenario version and the repetitions both cells have; a scenario
   with no matched sample is listed as such, not judged). Which model is the weak one is decided as the Design states.
2. **Red-first:** the verdicts (dl-032 item 3): quality (M-Q1 final and hold-out, and the scenario's checks) "not
   worse" unless worse beyond the variance, by REQ-SCO-14's variance rule; cost (M-K1), time (wall and agent time,
   M-K2) and tokens (fresh, cached, output) as ratios to the strong baseline; **H-W holds** for a scenario only when
   quality is not worse and both cost and time are lower; tokens reported, not judged. Over the matched scenarios a
   summary line counts holds, fails and not judged.
3. **Red-first:** the local estimate (dl-032 item 4): each cell's model time at declared profiles (prefill and decode
   tokens a second; slow 300/15, mid 1 500/40, fast 5 000/100 as dl-032 states them) with and without a prefix cache,
   the profiles in one versioned place, labelled assumptions in `aggregate.json`; the break-even speed answered: the
   lowest profile at which the weak harness cell's local time is not above the strong baseline's.
4. **Red-first:** the execution's page gains a separate section, "Weak model with the harness against the strong
   model without it (across models)", after the same-model sections and never mixed with them (T14), only when
   `parity` is present; the method page states H-W, the verdict rule, the matched sample and the local profiles as
   assumptions. Static HTML as REQ-RES-02 (no script, no date, every value escaped).
5. **Requirements amended** (a new REQ-SCO entry for the comparison and the estimate, REQ-RES-02 or a new REQ-RES entry
   for the pages), with the traceability matrix if a feature's row changes.
6. **Re-scored, 0 €:** campaign-002 (`81ebb2691f9c/1`), campaign-007 (`697e79b75e41/1`) and campaign-008
   (`33b54dd89e8b/1`) re-aggregated from their stored scores (no container re-run when the scores are current), the
   `parity` sections compared with dl-032's script figures where the samples are the same, the differences explained;
   the sites rebuilt; publication and push the approver's.
7. Checks: prettier, `tsc`, eslint, `scripts/pre-review.sh main`; the full suites through the load watcher on the
   approver's go; an independent review (dl-020).

## Design

<!-- To be written at the start: the weak model's identification (proposed: the model with the lower output-token list
     price in the agent's pinned price table, so that no campaign file changes and old executions qualify; else a
     declared pair), where the profiles live, the aggregate's schema, the page's layout. -->

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
