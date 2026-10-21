---
id: bug-023-the-openspec-arm-ends-every-request-after-openspec-s-propose-and-writes-no-code
type: bug
title: "The openspec arm ends every request after OpenSpec's propose and writes no code"
status: draft
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["openspec","arm","calibration"]
---

## Context

Found by [task-096](../task/task-096-calibration-of-v0-2-dry-runs-in-every-arm-and-the-bridge-measured-costs-and-the-revised-budget.md)'s
calibration stage 1 on 2026-10-21: the dry run of S3@1.0 in the openspec arm (`results/dry-runs/27/`, arm digest
`79f81183dbbe`, OpenSpec 1.14.0, Claude Code 2.1.300, `claude-sonnet-5-5` at `medium`) completed its five steps,
0.5701 USD, and scored 0/37 public tests and 0/17 hold-out. The approver chose, in chat the same day, to treat it as a
bug of the arm (not a measured outcome), to run calibration's stage 2 without the openspec arm, and to repeat its S3
dry run after the fix, with new consent.

## Expected

The openspec arm's manual (`arms/openspec/manual.md`) asks, for each request: propose the change with
`/opsx:propose`, then implement it with `/opsx:apply`, then archive it with `/opsx:archive`. Each request, run as
one headless session (REQ-RUN-08), ends with the change implemented in the project's code, as in every other arm,
so that the scenario's tests measure the arm's work.

## Actual

In every one of the five steps the agent ran the `opsx:propose` skill, wrote the change's `.openspec.yaml`,
`proposal.md`, `design.md`, `specs/` and `tasks.md` under `openspec/changes/<change>/`, validated it, and ended the
session, saying it had not edited the project's code as the propose workflow requires. It never ran `/opsx:apply`;
`src/` was never written. No approval request was raised (no intervention), so the neutral approver had nothing to
answer.

The cause, read in step 1's transcript: the propose skill OpenSpec 1.14.0 installs says "Do NOT implement the change,
start the apply workflow, or edit project code during this workflow. After presenting the artifacts, stop and wait
for a new user request". The skill's instruction overrides the manual's sequence, and its end is a statement, not a
question. In task-070's spike (`--effort high`) the propose phase ended with a question, which the approver answered,
and the agent went on to apply; at `medium` it does not ask. The arm has had no end-to-end dry run before this one.

## Impact

The openspec arm measures nothing on any scenario: every one of its runs would score 0, which reads as OpenSpec's
result while it is the arm's. Every openspec dry run and campaign run spends for no measurement (0.57 USD on S3). The
reference campaign cannot run the arm as it is; calibration's stages leave it out until the fix.

The fix changes the arm, so its digest (REQ-FMT-13) and the reference campaign's `arm_digests.openspec` with it; a
fixing task chooses how (for instance, the manual telling the agent that the request is a new user request for
`/opsx:apply` once propose is done; or the setup amending the installed propose skill's stop, recorded as an arm
adaptation), checked by a fake-agent test of what the arm installs and then by the repeated dry run.

## Resolution

<!-- set when fixed -->
