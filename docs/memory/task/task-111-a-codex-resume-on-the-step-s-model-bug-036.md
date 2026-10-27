---
id: task-111-a-codex-resume-on-the-step-s-model-bug-036
type: task
title: "A Codex resume on the step's model (bug-036)"
status: draft
release: v0.3
wave: W15
features: [F2.4]
acceptance: []
requirements: [REQ-RUN-07, REQ-RUN-09]
fixes: [bug-036-a-codex-resume-runs-on-codex-s-default-model-not-the-step-s]
tags: ["v0.3","codex"]
---

## Context

[bug-036](../bug/bug-036-a-codex-resume-runs-on-codex-s-default-model-not-the-step-s.md): the Codex adapter's resume (`src/agents/codex.ts`) names no model, so Codex 0.162.1 resumes a thread on its
default model (`gpt-6.1-sol`), which the runner prices and records as the step's. It biased campaign-006's wingfoil
arm (12 of 27 steps). W15, before any further Codex session: campaign-006's rerun of the wingfoil arm, the step-A
dry runs and campaign-007 all resume sessions at gates. `codex exec resume --help` on 0.162.1 (read in the bench
image, no session): `-m, --model <MODEL>`.

**No real-agent session. Spending: 0 €.** The fix is first seen at work in campaign-006's rerun.

**Done** means: a resume runs on the thread's model, and a stream that still reports another model is not recorded
as the step's.

## Acceptance criteria

1. The resume's command line carries `-m <the thread's model>`, the first invocation's unchanged. **Red-first**
   (`codex.test.ts`, the command line pinned).
2. A Codex stream that reports resuming on a model other than the step's ("is resuming with `<model>`") is not priced
   or recorded as the step's model: the invocation fails with that message, as a failed step is. **Red-first.**
3. The runner's record of the twelve affected steps is left as it ran; the erratum and the rerun are campaign-006's
   (the approver's decision). **Characterization** (documents).

## Design

- `resume`: `codex exec resume --json -m <thread.model> <effort> <bypass> -- <thread> <reply>`, `thread.model` being
  the model the step's first invocation ran (already kept with the thread).
- `readCodexSession`: an `error` item whose message matches Codex's "recorded with model `A` but is resuming with
  `B`", with `B` not the expected model, ends the invocation as `failed` with that message, so that no cost or model
  is attributed to it silently (REQ-RUN-09).
- Claude Code's resume unchanged: task-004's spike measured that it keeps its model.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
