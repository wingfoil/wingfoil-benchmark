---
id: task-111-a-codex-resume-on-the-step-s-model-bug-036
type: task
title: "A Codex resume on the step's model (bug-036)"
status: done
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

- Drafted, approved and submitted (backlog → in-progress) on main, 2026-10-27; worktree
  `../WingFoil2-Benchmark-wt/task-111`.
- **`codex exec resume --help` on Codex 0.162.1**, read in the bench image with no network and no credential: `-m,
  --model <MODEL>`.
- **Red-first:** `267e6fe4` (the resume's command line, pinned without `--model` until now, now with `--model
  <thread's model>` after `--json`, where the first invocation carries it; a stream with Codex's "is resuming with
  `<model>`" warning for another model fails) before the fix.
- **The fix:** the resume passes `--model thread.model`; `readCodexSession` reads an `item.completed` of type `error`
  whose message says Codex resumed on another model than the step's, and ends the invocation `failed` with that
  message. The warning's form, read from `dry-runs/87`: "This session was recorded with model `gpt-5.6-terra` but is
  resuming with `gpt-6.1-sol`. …".
- **Not verified with a real session:** the fix is first at work in campaign-006's rerun, whose resumed steps must show
  no such warning (a step with one now fails visibly).
- **Checks:** `scripts/pre-review.sh main` green; `test/unit/agents` and `test/unit/runner` green (362).

### Review

Under dl-020; `scripts/pre-review.sh main` green before each round.

- **Round 1** (an independent read-only agent, from a `mktemp` directory; reflogs unchanged): `--model` accepted by
  0.162.1 and placed right; `thread.model` always the step's; the guard matching the real warning and not misfiring on
  agent messages or first invocations; red-first clean.
  - **should-fix, fixed:** a switched invocation was still priced at the step's model and recorded under it; now its
    tokens are attributed to no model, its cost 0, and the step marked `costUnknown`, counted at its bound
    (`switchedTo` names the model Codex ran).
  - **nits, fixed:** a quota or rate limit now wins over the switch, so an execution's quota stop is not lost; the
    warning is read as a top-level `error` event too; a negative case (the warning naming the step's own model).
  - **nit, recorded:** `claude-code.ts`'s `resumeLine` comment says the resume names no session id, though it passes
    `--resume <id>`; out of this task's scope.
- **Round 2** (the same agent, the fix only): the switched invocation's `costUnknown` and no attribution right, the
  limit-first order equivalent in every other case. **should-fix, fixed** (`d1f2755a`): the top-level warning's
  test was never written (a replacement missed after prettier changed its neighbour's quotes) and the adapter's
  `costUnknown` and zero cost had no test; both added, each checked by removing its code (a mutation) and seeing it
  fail. **nits, recorded:** a resume that both switched and hit the quota keeps the switch only in its transcript and
  `switchedTo`; a switched invocation that is also rate limited is pushed by `waitOut` without `costUnknown` — both
  matter only if the switch recurs after the `--model` fix.
- **Round 3** (the same agent, round 2's fix only): both tests pin their behaviour, nothing else changed; no finding.
  The review closes.

### Approval

- in-review → approved by the approver (`203aba03`), 2026-10-27; no full suites (one file of `src/agents/` and its
  tests; `test/unit/agents` and `test/unit/runner` green). Merged into main (`1b258c08`); `dist/` rebuilt.

