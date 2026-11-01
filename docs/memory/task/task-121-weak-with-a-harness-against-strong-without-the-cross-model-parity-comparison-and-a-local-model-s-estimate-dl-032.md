---
id: task-121-weak-with-a-harness-against-strong-without-the-cross-model-parity-comparison-and-a-local-model-s-estimate-dl-032
type: task
title: "Weak with a harness against strong without: the cross-model parity comparison and a local model's estimate (dl-032)"
status: in-progress
release: v0.3
wave: W17
features: [F4.3, F5.5, F5.8]
acceptance: [scoring.feature, results.feature]
requirements: [REQ-SCO-15, REQ-RES-12, REQ-SCO-14, REQ-RES-02, REQ-NFR-06]
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

- **Module:** `src/results/parity.ts`, called by `aggregateExecution`; the aggregate gains an optional `parity` (absent
  in an aggregate written before it, and in an execution with one model or no pair). `AGGREGATE_VERSION` stays 1: the
  field is optional, as `controls` was (task-068).
- **The pairs:** the campaign's default model against each slice's model (slices against each other are left out).
  For each scenario version and each harness arm (an arm whose runs record a harness commit) that both models ran, with
  both baselines: the **weak** model is the one whose baselines cost less (mean M-K1) over the scenarios the pair
  shares; a tie pairs nothing. No price table and no campaign file is read or changed, so every stored execution
  qualifies (dl-032 asks the cheaper model's question; the measured cost is what makes it cheaper).
- **The matched sample:** `k` = the lower of the weak harness cell's and the strong baseline cell's `n`; each cell's
  first `k` runs by name (r1, r2, …), the reference cells (weak baseline, weak docs control — the group whose runs'
  `docs_of` names the harness —, strong harness) likewise, each with its own `k` when shorter. A scenario where a cell
  of the pair is missing is listed under `unmatched` with why.
- **The cells' figures** (means over the sample, money to a millionth): M-Q1 final share; hold-out final share (when
  every run of both cells has it); checks share (each run's passed check-steps over its scored ones, when both cells
  have checks); cost in EUR; agent time (`wall_time_ms`); tokens fresh (input + cache creation), cached (cache read)
  and output; and the local model time per profile.
- **The verdicts** (weak harness against strong baseline): each quality metric by `compare` and `certaintyOf`, as the
  docs-control comparison reads them (REQ-SCO-14); **worse** only when worse beyond the variance, else **not worse**;
  cost, time and the three token counts as ratios (weak ÷ strong). **H-W holds** when every quality metric is not worse
  and both the cost and the time ratios are below 1, **fails** otherwise; `preliminary` when `k` < 3 (dl-012).
- **The local estimate:** profiles `slow` (prefill 300, decode 15 tokens a second), `mid` (1 500, 40) and `fast`
  (5 000, 100), labelled assumptions in the aggregate (`parity.local_profiles`, with a sentence saying so). Per run,
  without a prefix cache `(input + cache creation + cache read) / prefill + output / decode`, with one
  `(input + cache creation) / prefill + output / decode`, in seconds; tool time excluded. **Break-even:** for each
  cache mode, the slowest profile at which the weak harness cell's local model time is not above the strong
  baseline's measured agent time, or `none`.
- **The summary:** per pair and harness, how many scenarios hold, fail and are unmatched.
- **The site:** `parity.html` in the execution's directory, built only when the aggregate has `parity`, linked from
  the landing page in its own section, "Weak model with the harness against the strong model without it (across
  models)", after the comparisons; one table per pair and harness, a row per scenario, the reference cells beside; the
  local estimate below, under the assumptions' sentence. The method page states H-W, the weak model's rule, the
  matched sample, the verdicts and the profiles as assumptions.
- **Requirements 1.47:** REQ-SCO-15 (the comparison and the estimate) and REQ-RES-12 (its page), traced to F4.3 and
  F5.5/F5.8.

## Execution notes

- Red first: the aggregate's six parity cases failed before `parity.ts` (two more, the section absent and the same
  bytes, characterize); the parity page's and the landing link's failed with `src/site` set aside; the build's passed
  with the page in place.
- **Re-scored, 0 €** (criterion 6): campaigns 002 (`81ebb2691f9c/1`), 007 (`697e79b75e41/1`) and 008
  (`33b54dd89e8b/1`) re-aggregated from their stored `score.json` by a script calling `aggregateExecution` (no
  container, no session): every field but `parity` is the same bytes as before. The sections:
  - 002: Haiku (weak) with wingfoil against Sonnet's baseline fails on S1 and S3 (time 4.3× and 3.3×; n = 1); Sonnet
    (weak) with each harness against Opus's baseline holds on S1 (n = 1); 19 scenario-harness keys unmatched (no
    Haiku or Opus run of that arm).
  - 007: Luna with wingfoil against Terra's baseline holds on S1 (n = 3: cost 0.07×, time 0.44×) and fails on S2, S3
    and S8 (n = 1, time 1.05–1.28×).
  - 008: Haiku with wingfoil against Sonnet's baseline fails on all five (n = 3): quality not worse anywhere (S3's
    and S8's checks better beyond the variance), cost 0.27–0.44×, time 3.8–6.3×; no local profile keeps up.
- **Against dl-032's script figures:** the samples are the same (007: S1 × 3, S2, S3, S8 × 1; 002: S1, S3 × 1), and
  the cells' totals reproduce every figure of dl-032's two tables: cost (USD at 0.8917), agent time, tokens processed
  and output, for the four cells of each campaign. No difference to explain.
- The site's wording: a quality metric not worse is shown by its outcome (better, same, or "lower, not beyond the
  variance"), so that S3's checks read better beyond the variance rather than "not worse, beyond variance".
