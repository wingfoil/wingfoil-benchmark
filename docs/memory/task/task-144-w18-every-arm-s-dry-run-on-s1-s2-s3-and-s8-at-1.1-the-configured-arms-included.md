---
id: task-144-w18-every-arm-s-dry-run-on-s1-s2-s3-and-s8-at-1.1-the-configured-arms-included
type: task
title: "W18: every arm's dry run on S1, S2, S3 and S8 at 1.1, the configured arms included"
status: in-review
release: v0.3
wave: W18
features: [F7.5]
acceptance: []
requirements: [REQ-CLI-05, REQ-FMT-04, REQ-RUN-11]
fixes: [bug-048-the-openspec-docs-generator-drops-a-configured-context-that-has-no-level-two-heading-so-openspec-docs-configured-runs-with-no-rules]
tags: ["v0.3","configured","spending","calibration"]
---

## Context

W18 (configured variants, F7.5) has its code (task-140 to task-142) and its twelve configurations
([task-143](task-143-w18-the-twelve-configurations-of-s1-s2-s3-and-s8-at-1.1.md)). Its "Ends with" in
[rel-v0-3](../release/rel-v0-3.md) is every arm, the configured ones included, in a dry run. This task runs them: the
four 1.1 versions (S1, S2, S3, S8) in the thirteen arms, the seven of v0.2 and the six configured ones
(`wingfoil-configured`, `speckit-configured`, `openspec-configured` and their docs controls `baseline-docs-configured`,
`speckit-docs-configured`, `openspec-docs-configured`), 52 dry runs on `claude-sonnet-5-5`. They are also the first
item of [calibration v0.3](../../calibration/v0.3.md) §5 (plan-005 step 3): the measured costs per run on 1.1, from
which the reference campaign's estimate and the revised budget are drawn. The model slices (Opus 5.5, Haiku 5.5) are
not in this task; the calibration asks for them once the reference campaign's models are chosen.

The first dry run of a 1.1 version records its hash, and from then on nothing is written to its configurations
(REQ-FMT-04 as amended in 1.50): the twelve configurations of task-143 become fixed with it.

The ledger [v0.3-ledger.md](../../calibration/v0.3-ledger.md) lacks task-143's twelve configuring sessions (real-agent
sessions, 0.7237 EUR, consent in chat on 2026-11-08); this task adds them, generated from their records.

**The estimate** (for the approver's consent; nothing is spent before it). Every Sonnet 5.5 run of the same scenario
and base arm the stored results hold, on version 1.0 (a scratchpad script reading `results/**/run.json`,
`steps[].usage.costEur` summed per run):

```
S1  baseline       runs 12 mean 0.34 max 0.39
S1  baseline-docs  runs 13 mean 0.45 max 0.49
S1  openspec       runs  5 mean 0.85 max 0.90
S1  openspec-docs  runs  5 mean 0.34 max 0.37
S1  speckit        runs  5 mean 0.51 max 0.54
S1  speckit-docs   runs  5 mean 0.35 max 0.39
S1  wingfoil       runs 18 mean 0.59 max 0.72
S2  baseline       runs  6 mean 0.20 max 0.23
S2  baseline-docs  runs  8 mean 0.23 max 0.25
S2  openspec       runs  2 mean 0.52 max 0.54
S2  openspec-docs  runs  2 mean 0.18 max 0.18
S2  speckit        runs  2 mean 0.26 max 0.27
S2  speckit-docs   runs  2 mean 0.18 max 0.19
S2  wingfoil       runs  8 mean 0.31 max 0.35
S3  baseline       runs  9 mean 0.25 max 0.30
S3  baseline-docs  runs  8 mean 0.38 max 0.43
S3  openspec       runs  3 mean 0.73 max 0.89
S3  openspec-docs  runs  2 mean 0.24 max 0.25
S3  speckit        runs  2 mean 0.65 max 0.78
S3  speckit-docs   runs  2 mean 0.26 max 0.27
S3  wingfoil       runs  8 mean 0.53 max 0.58
S8  baseline       runs  6 mean 0.22 max 0.24
S8  baseline-docs  runs  8 mean 0.28 max 0.32
S8  openspec       runs  2 mean 0.64 max 0.68
S8  openspec-docs  runs  2 mean 0.23 max 0.24
S8  speckit        runs  2 mean 0.30 max 0.31
S8  speckit-docs   runs  2 mean 0.23 max 0.24
S8  wingfoil       runs  8 mean 0.42 max 0.48
```

Taking a configured arm at its base arm's cost, the 52 dry runs sum to about 20 EUR at the means and 22 EUR at the
maxima. A configuration adds files the agent reads; at 1.3 times the maxima they come to about **29 EUR**, the upper
end. The 1.1 versions' steps are those of 1.0 with a corrected oracle, so the step count does not change.

## Acceptance criteria

<!-- A spending task, as task-096 and task-119: no new behaviour, so no red test. A defect found becomes a bug, and a
     fix to code goes through its own red test. -->

1. **The profile:** `campaigns/v0-3-reference.dry-run.yaml`, the dry runs' pins: `harnesses` wingfoil `v0.3.1`,
   speckit `v1.1.0`, openspec `1.14.0`; Claude Code 2.1.300 at effort medium; `models.default: claude-sonnet-5-5`;
   `approver_policy: v5`; caps and the euro rate below. **Characterization** (`campaign validate` of a campaign file
   naming the four 1.1 versions and the thirteen arms against it; the 13 existing validations unchanged).
2. **52 dry runs,** one per 1.1 version and arm, each under `results/dry-runs/<n>/` with `dry_run: true`, the pinned
   agent, model, effort, harness commit and arm digest, and its outcome. A dry run that fails is recorded, not
   repeated without new consent (design 3).
3. **Within the ceiling:** the dry runs' costs, as their `run.json` state them, sum to at most the approver's ceiling.
4. **The ledger:** one line per dry run and one per task-143 configuring session in `v0.3-ledger.md`, generated by a
   script from the stored records (date, element, kind, consent, model, ceiling, cost, source, secret scan).
5. **The reading:** `docs/calibration/v0.3.md` §5 gains the measured costs per version and arm (cost, steps,
   interventions, wall time, outcome), generated by a script from `results/dry-runs/`, each configured arm beside its
   base arm, and the sum against the ceiling; and anything that looks like a defect of an arm, a configuration or the
   runner, filed as a bug.
6. **W18's "Ends with":** rel-v0-3's W18 row gets its Verified cell, naming the dry runs.

## Design

1. **The profile, a file of its own** (as v0.2's bridge profile): `campaigns/v0-3-reference.dry-run.yaml`, run with
   `--profile`, so that `scenarios/dry-run.yaml` and the campaigns that read it are unchanged.
   `caps: { step_time_s: 1800, step_tokens: 10000000, run_cost_eur: 3 }` (three times the dearest measured run);
   `currency.usd_to_eur`: campaign-008's 0.8917, so that 1.0 and 1.1 costs compare.
2. **In stages, cheapest first, from the main checkout** (its git-ignored results and transcripts outlive the branch),
   one dry run at a time, with `BENCH_AGENT_TOKEN_FILE` (a path, never read here), `BENCH_WINGFOIL_REPO`,
   `BENCH_SPECKIT_REPO`:

   | Stage | Dry runs | Expected (the means to the maxima ×1.3, from the table above by a scratchpad script) |
   |---|---|---|
   | 1 | S2 × the six configured arms (6) | about 1.7–2.3 EUR |
   | 2 | S2 × the seven base arms, S8 × the thirteen arms (20) | about 6.3–8.8 EUR |
   | 3 | S3 × the thirteen arms (13) | about 5.8–8.7 EUR |
   | 4 | S1 × the thirteen arms (13) | about 6.5–9.4 EUR |

   Stage 1 is read before stage 2 starts (record, transcript, the configuration in the workspace, the arm's manual
   followed), so that a defect of a configured arm costs six dry runs, not 52. The later stages follow on their own
   unless a stop below fires.
3. **Stops**, in the launching script: before each dry run it stops if the spending so far plus 3 EUR could pass the
   ceiling; a dry run costing more than twice its expected maximum, or two failed dry runs in a stage, stop the stage
   and ask. A dry run that fails because of the environment (a container or network failure) gets one more attempt;
   otherwise its failure is a bug and the approver decides. Dry runs start only when the machine's load is low (the
   suites' load watcher).
4. **After each dry run:** its pins checked against the profile; a secret scan of its stored files against the token
   file (`grep -rlFf`, counts only, the value never printed).
5. **Figures generated:** the ledger lines and §5's table come from scripts in `scripts/`, each with a unit test on a
   temporary root, as `scripts/configuring-reading.mjs`.
6. **Scoring** is not this task's: the dry runs are scored by the calibration with the hold-out, after the method
   page's content checks v2 are read on 1.1.

## Execution notes

1. **The profile** (criterion 1): `campaigns/v0-3-reference.dry-run.yaml`, its arm digests the tree's at `676618cc`.
   The characterization is `test/unit/campaign/v0-3-reference.test.ts`: the pins, the thirteen digests against the
   tree, and `checkDryRun` accepting every arm on the four 1.1 versions; a dry-run profile is checked by the dry run's
   own check, not by `campaign validate`. The existing campaign tests pass unchanged.
2. **The dry runs** (criteria 2 and 3): `dry-runs/155` to `207`, from the main checkout, one at a time behind the load
   watcher, stage 1 read before stages 2–4 started. Every one completed and no stop fired; the figures are §5's,
   generated by `scripts/dry-run-reading.mjs`, which also checks every run's pins against the profile (agent, model,
   effort, policy, arm digest, harness version; a harness arm without its harness breaks them) and prints the harness
   commits each tool ran at, the profile pinning no commit. The per-run stop
   was a fixed 2.4 EUR in the launching script, in place of twice each run's own expected maximum.
3. **Main's `dist`** was stale (built 2026-11-02): rebuilt with `npm run build` before stage 1.
4. **bug-048,** found reading stage 1: `dry-runs/160`, S2's openspec-docs-configured, got "no rules", its configuring
   agent's context having no `## ` line. Approved and fixed here (fix 1, `1c3fc8d5`), then widened at the approver's
   choice ("estendi") to the per-artifact `rules:` and the `operations:` guidance (`ffc9a132`); requirements 1.56,
   REQ-RUN-11 amended; red tests first. The four openspec-docs-configured dry runs then ran from the main checkout with
   this worktree's `dist` (`dry-runs/204` to `207`, after stage 4), main's `dist` not having the fix; `160` stays,
   superseded by `204`. The unconfigured openspec-docs dry runs ran on main's `dist`, whose output for a context-only
   configuration is byte-identical to the fix's.
5. **Interruptions, nothing lost:** Claude Code stopped during stage 1 (2026-11-09; stage 1 relaunched); a reboot
   (2026-11-11) and an unexpected shutdown (2026-11-11, while stage 4 waited on the load watcher) emptied the
   scratchpad, whose scripts were rebuilt from the session's transcript. No dry run was half-run and no container was
   left. Stage 4 waited for hours on other sessions' suites.
6. **The ledger** (criterion 4): `scripts/ledger-lines.mjs`, with its unit test, generated task-143's twelve
   configuring lines and the 53 dry-run lines, every cell from the stored records: a dry run's date is its first
   step's first transcript timestamp (UTC), and a dry run a later one replaced says so. Every secret scan clean.
   The review (round 1) found the first version dated by file times and `160`'s note added by hand: both fixed, the
   lines regenerated. No committed file of a dry run holds its date, and transcripts are git-ignored (round 2): the
   dates come from the main checkout's transcripts, which the release's transcript pack carries; a clone without
   them prints "unknown date".
7. **The results** are committed on this branch, as task-119's; at the merge, the main checkout's untracked copies of
   the committed files and of the profile go, after a byte comparison, and its git-ignored transcripts stay.
8. **No other defect** (criterion 5): every configured harness arm's setup holds each file its configuring agent wrote
   and every configured docs control's `PROJECT_RULES.md` renders its configuration; the interventions outside wingfoil
   are questions and approvals that policy v5 answers.
