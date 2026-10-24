---
id: task-100-the-v0-2-retrospective-s-wingfoil-feedback-notes
type: task
title: "The v0.2 retrospective's WingFoil feedback notes"
status: draft
release: v0.2
wave: retrospective
features: []
acceptance: []
requirements: [REQ-NFR-02]
fixes: []
tags: ["wingfoil-feedback","retrospective"]
---

## Context

[rel-v0-2](../release/rel-v0-2.md)'s Retrospective, "WingFoil feedback inbox": the friction about WingFoil found by
the retrospective becomes notes of `docs/wingfoil-feedback/`, which WingFoil reads at its own retrospective (WingFoil
dl-163). The inbox's rules have a note written by a task (`New note (task-<n>).`), so this task writes them.

**Done** means: the notes below are in the inbox with their ledger rows, the inbox's test green.

## Acceptance criteria

<!-- Inbox notes: no code. -->

1. **F-040** (request): review rounds across four WingFoil-governed projects (this repository, WingFoil, WingFoil
   UI, WingFoil Templates; no private project named), and a re-review rule with a severity threshold, for WingFoil's
   guide and templates.
2. **F-041** (request): what a benchmark needs to drive `agent execute` from outside (step B of
   [dl-021](../decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)):
   the agent's stream and usage reaching the launcher, its exit status, a `--dry-run` that works without a terminal.
3. **F-042** (gap): `directive create` writes no body and takes no title (task-078's observation).
4. **F-032** and **F-033** keep their text and gain a dated evidence paragraph from 0.3.0 (no MCP call in 69 steps;
   the context reached only through the CLI; the guide leaving the lookup's status to the agent).
5. Each note has the six fields, `## Observed` and `## Expected` only, a ledger row; `test/unit/docs/wingfoil-feedback.test.ts`
   green. **Characterization.**

## Design

- Notes written from the evidence already recorded: calibration v0.2 §7, the review-rounds analysis, task-078's
  notes, WingFoil 0.3.0's source read with `git show v0.3.0:…`. Commands and outputs quoted, as the inbox's rules ask.
- F-040's evidence is observational (review records), not a WingFoil command: its Observed says so.

## Execution notes

- `npx wingfoil memory add --type task --title "The v0.2 retrospective's WingFoil feedback notes" --tags
  "wingfoil-feedback,retrospective"`, on main. Declared: the element from the template in `draft`, one commit.
  Observed: `status: draft`. Matches.
