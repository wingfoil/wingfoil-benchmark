---
id: bug-036-a-codex-resume-runs-on-codex-s-default-model-not-the-step-s
type: bug
title: "A Codex resume runs on Codex's default model, not the step's"
status: approved
# fixed_by: task-…   # set by hand, with the fixing task's id, just before `approved → fixed`
tags: ["v0.3","codex"]
---

## Context

Found by task-107's review (2026-10-27), reading the step-A spike's Codex transcript (`dry-runs/87`). The Codex
adapter (`src/agents/codex.ts`, `resume`, task-094) answers a waiting session with `codex exec resume --json
<effort> <bypass> -- <thread> <reply>`: it names the effort but not the model. Claude Code's resume names no model
either, but task-004's spike measured that a resumed Claude Code session keeps its model; nobody measured it for
Codex.

## Expected

A resumed Codex invocation runs on the step's model, the one the campaign pins, as the first invocation did; its
tokens are priced at that model's row.

## Actual

Codex resumes the thread on its configured default model and says so in the stream: "This session was recorded with
model `gpt-5.6-terra` but is resuming with `gpt-6.1-sol`." The runner records the invocation, and prices its tokens,
as the step's model.

Every resumed Codex invocation so far, by an intervention (no other resume happened):

- **campaign-006** (`13fda3099afa/1`, published 2026-10-27): 12 of the wingfoil arm's 27 steps (S1 r1 steps 1, 2,
  5; S1 r2 step 3; S1 r3 step 4; S2 step 2; S3 steps 1–4; S8 steps 1, 2), each with work done after the resume (1 to
  6 files changed); the baseline and baseline-docs arms had no intervention, so none of their steps resumed;
- campaign-005 (`c4c49685911c/1`, deprecated): S2 step 2;
- dry runs 83 (task-105's) and 87 (task-107's): one step each;
- campaign-004 (`4682bcc65d6b/1`): none (the baseline arm had no intervention).

## Impact

In campaign-006 the wingfoil arm worked partly on a stronger model than its controls, so its comparison with
baseline-docs and the baseline within Codex and Terra is not clean, and leans towards the arm; its resumed tokens are
priced at Terra's row, not Sol's. The same would bias campaign-007, whose step-A arm stops at gates.

## Resolution

The resume names the thread's model (`-m <model>`), with a test that pins the command line, before any further Codex
session. campaign-006 gets an erratum on the site now, and its wingfoil arm is rerun beside the baseline once fixed
(the approver's decision in chat, 2026-10-27: erratum and rerun).
