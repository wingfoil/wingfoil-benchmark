---
id: bug-024-the-dry-run-s-expected-cost-line-quotes-a-dry-run-of-another-arm-digest-or-harness-pin
type: bug
title: "The dry run's expected-cost line quotes a dry run of another arm digest or harness pin"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["dry-run","estimate","cli"]
---

## Context

Found by [task-096](../task/task-096-calibration-of-v0-2-dry-runs-in-every-arm-and-the-bridge-measured-costs-and-the-revised-budget.md)'s
calibration stage 4 on 2026-10-21, the bridge's dry runs (`--profile campaigns/v0-2-bridge.dry-run.yaml`, WingFoil
v0.2.2, `arm_digests: { wingfoil: 680b19f27c9f }`). No money was spent because of it.

## Expected

Before it spends, `bench scenario dry-run` prints what it expects to spend (REQ-NFR-06): the cost of the latest dry
run that measures the same thing, or "no dry run yet". The same thing is the estimate's key (requirements 1.33,
task-095): scenario hash, arm, model, effort, and the arm digest and harness pin the profile pins. A dry run of
another arm digest or harness pin is another measure, and is not quoted.

## Actual

`src/cli/dry-run.ts` calls `latestDryRun` with a key of scenario, version, hash, arm, model and effort only: no
`armDigest`, no `harness`. Every bridge dry run printed the reference's latest dry run of the same scenario, arm and
model as its expected cost, for S3 wingfoil "the latest dry run cost 0.5751 USD … (results/dry-runs/24)", which
ran WingFoil v0.3.0's arm (`45a5cce3de19`), not v0.2.2's.

## Impact

The pre-spending line misinforms the operator who consents to a run: it quotes a measure of another arm, which may
cost more or less. The estimate (`bench campaign estimate`) builds its key with the digest and the pin and is not
affected; the runs ran the pinned arm (their `run.json` record it). Low severity, but it is the line a consent is read
against.

## Resolution

<!-- set when fixed -->
