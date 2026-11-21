---
id: dl-037-an-external-workflow-runner-as-a-candidate-for-the-wingfoil-arm-s-step-b-and-campaigns-that-wait-out-the-quota
type: decision-log
title: "An external workflow runner as a candidate for the wingfoil arm's step B, and campaigns that wait out the quota"
status: pending
tags: ["v0.4","wingfoil","runner"]
---

## Context

The approver asked on 2026-11-20 for a comparison between the Benchmark and a workflow runner written for another of
the maintainer's WingFoil projects, in anticipation of WingFoil's workflow engine. The approver also asked whether
campaigns could use that runner. On 2026-11-21 the approver added two points: the changes the Benchmark needs are asked
of the runner's maintainers, keeping the private projects unnamed; and, if step B depends on WingFoil 0.4 in any case,
the runner is adopted only once it has been updated to WingFoil 0.4. For step B this is recorded **as a candidate for
v0.4's release-planning, not a decision**. It changes nothing in v0.3's remaining work.

**What the external runner does** (version 1.1.18; its configuration, its directive and its step records were read
on 2026-11-20):

- **One step per launch.** A systemd timer per line starts it every 10 minutes. It reads WingFoil's `workflow status`
  frontier and takes the first step an agent can do. A line is a checkout with its own agents.
- **Role → tier → adapter.** The step's role selects a tier (high, intermediate), and the line maps each tier to an
  adapter, one per model, for example Opus for the architect and Sonnet for the developer. The agent's CLI is launched
  headless, in the task's worktree or in the line's checkout.
- **A distinct reviewer.** `distinct_from` makes the reviewer another session, and on the trunk another agent: Codex
  reviews Claude's work.
- **Checks.** Each step has `pre` and `post` checks, live checks and a dry run of the WIP limit.
- **Gates stay with a human.** The approver rules them from a terminal through `gate.mjs`, into a signed ledger, and a
  `notify-send` notice tells the approver what waits.
- **Limits.** Each line has a weekly budget of weighted tokens. A usage limit is waited out (30 minutes, then retried).
  The runner also has a load ceiling (0.8), a step timeout (45 minutes), and a halt after 3 errors in a row that only
  `--resume` closes.
- **Security.** Most of its eighteen versions in three days harden the runner: a trusted home, a git configuration
  allowlist, agents without credentials.
- **Its own replacement.** Its directive says that WingFoil's own headless launch replaces it when a release provides
  one, expected from WingFoil 1.0. Each stand-in for the engine is recorded in that project's pack deviations, so the
  runner stays a thin patch.

**Its results so far.** Its three lines recorded about 560 steps, each with its role. 64% completed, 20% blocked,
11% rejected in review, and the rest are errors or failed checks. One task of size took about 9 minutes, start to
done, with a Sonnet developer and a Codex reviewer. These steps are real-sized work through every phase of a
workflow, which the Benchmark's scenarios lack: their steps are small (the v0.3 release notes, Known limits). They
are not comparable to the Benchmark's results, though. Nothing runs the same work without WingFoil, no oracle scores
it, and the models differ by role. Most of its Codex steps record no model.

**What the Benchmark has:**

- **dl-021 step B** waits for WingFoil 0.4. Its runner would call `wingfoil agent execute --next`, and the gates stay
  with the fixed approver. Its entry condition is WingFoil's headless launch (WingFoil dl-181) **and** the agent's
  stream, usage and exit status reaching the launcher (F-041).
- **dl-021 rejected a driver script written by the Benchmark** (its option A). Such a script measures the Benchmark's
  script rather than WingFoil, and gives one arm a driver the others lack (T1, T12).
- **Rate limits and the quota.** The campaign runner waits out a rate limit, four waits of about 52 minutes in all
  (`RATE_LIMIT_WAITS_S`). At the subscription's quota, though, the run ends `quota exhausted` and the campaign stops
  (REQ-RUN-13). The approver then resumes it by hand with `--resume`, after the reset, and nothing tells the approver
  that it stopped.
- **WingFoil 0.4's first wave has built step B's entry condition** (WingFoil's repository, read on 2026-11-21; 0.4
  is not released, the last tag being v0.3.2). In its `w0`, done: a headless work run, `--next` on a waiting step and a
  `--timeout` (WingFoil task-335); a launched agent's output forwarded to the caller (task-336); token counts and the
  agent's version in a Claude Code run record (task-337). The external runner, built on 0.3.x, launches the agents
  itself, which is what that launch replaces.
- **The Benchmark's v0.4 does not depend on WingFoil 0.4 by its scope.** The sequencer gives it new scenarios (S4–S7)
  and the blind judge. Its wingfoil arm, though, is pinned to the WingFoil release admitted when its campaigns run
  (dl-034), and step B is defined on 0.4 (dl-021). Step B therefore needs WingFoil 0.4 whatever drives it.

## Options

- **A. The external runner as the campaign runner.** Rejected. It drives only WingFoil workflows, so `baseline`, Spec
  Kit, OpenSpec and the docs controls have no frontier to read. It has none of what makes a run comparable: a pinned
  image, a container per run, a frozen arm setup, the scripted approver, hidden tests, a hold-out. It picks the model
  by role, against "harness, not model". Its trust features (a home aligned with `origin/main`, the signed ledger, the
  timers) are obstacles in a container.
- **B. The external runner on WingFoil 0.3.x, now, as a provisional engine for step B.** Rejected. It would be built
  on the runner's own launch, which WingFoil 0.4 replaces, and step B is defined on 0.4 anyway.
- **C. The external runner, once its maintainers have updated it to WingFoil 0.4, as the loop around WingFoil's
  headless launch in step B.** The Benchmark's needs are asked of its maintainers now, so that the update can include
  them. Proposed, as a candidate.
- **D. WingFoil 0.4's headless launch alone** (dl-021 step B as it stands), the campaign runner calling `agent execute
  --next` step by step. It stays the reference. C is adopted only if it adds what D lacks: the choice of the step from
  the frontier, the distinct reviewer, the checks around each step.
- **E. A minimal step-B runner written in this repository.** Kept as the fallback: dl-021 rejected a driver written by
  the Benchmark (T1, T12). It is used only if the external runner cannot take the Benchmark's needs, and its deviation
  from dl-021 is then stated on the method page.
- **F. Campaigns wait out the quota and send notices.** This takes the external runner's ideas, not its code. It is
  independent of the others. Proposed.

## Proposal

**F now; C as a candidate, adopted only after WingFoil 0.4 is admitted and the external runner is updated to it; D
stays dl-021's step B; E only as the fallback.**

**F. The quota wait and the notices:**

1. **The wait.** At `quota exhausted`, a campaign with `quota_wait: true` waits until the subscription's reset instead
   of stopping. The reset time is read from the agent's limit message, or else taken from the campaign file. The
   campaign then reruns that run as `--resume` does today, keeping the earlier attempt under `attempts/<k>/`. The wait
   is bounded (`quota_wait_max_hours`), and past it the campaign stops as today. A wait is recorded in the campaign's
   log with its start and end, so the agent's time is unchanged and the wall time shows it.
2. **The notices.** A desktop notice (`notify-send`, when present) is sent when a campaign stops (the quota past its
   wait, the ceiling, `fail_fast`, an interrupt), when a run fails, and when the campaign ends.
3. **A task implements 1–2.** Its tests use the fake agent's replayed limits, red first. It needs no real-agent session,
   so it costs 0 €.

**C. The request to the external runner's maintainers,** relayed by the approver without naming any private project,
for the runner's WingFoil 0.4 version:

| # | Need | Why |
|---|---|---|
| R1 | **A run mode for one project in a container:** steps until no agent step is left, then exit, with the timers, the push, the notices, the budget and the trust checks (a home aligned with `origin/main`, the git configuration allowlist) off | the same isolation and the same steps as every arm; those features belong to a machine, not to a run |
| R2 | **Gates answered by a caller's policy:** the runner stops at a gate and hands its packet to a command the caller names, or exits so that the caller rules it with the runner's ruling command, the ledger's signature replaceable | the fixed approver of every arm |
| R3 | **One adapter for every tier and role**, and `distinct_from` satisfied by another session of the same agent | "harness, not model"; T14 |
| R4 | **Each launch measured:** through WingFoil 0.4's headless launch, or its own, each launch's stream, usage, model and exit status written where the caller names; the model reported by every adapter (most Codex steps record none today) | cost, the observed model and the transcripts are measured as in every other arm (dl-021 step B's own condition) |
| R5 | **A published, versioned release:** a tag and the manifest's digest at a stable public place | T12: the setup is public, pinned in the arm's digest, and can be contested |
| R6 | **A changelog line for every change to the step loop's behaviour** | a new runner version is a new arm version (dl-021) |

Two questions go with it: whether the runner, on 0.4, launches through `agent execute --headless`, and when its 0.4
version is expected.

**If C is adopted**, the arm (provisionally `wingfoil-runner`):

- **is reported apart.** Its result is the result of WingFoil driven by that runner, not WingFoil's own. It is never
  the wingfoil arm's headline and never replaces step A or D.
- **has its hypothesis written before its first run**, because the runner and WingFoil come from the Benchmark's
  maintainer (T1): "per-role launches with a distinct reviewer catch more of the scenario's checks than D's launch
  alone, at a cost not above D's by more than the variance". A failure is published as a finding.
- **starts with a spike** (a task, at most one dry run, with the approver's spending consent). It shows that R1–R6 hold
  in the run's container. If more than a thin wrapper is needed, C is dropped and E is weighed.

## Consequences

- **Now:** a task for F, after v0.3's release; the request R1–R6, sent once this decision is approved. Nothing is
  spent.
- **Step B enters with WingFoil 0.4:** at the first Benchmark release whose planning follows 0.4's admission and the
  external runner's update, v0.4 if both are in time, otherwise the next. dl-021's table gains a row for C only if C is
  confirmed then.
- **For WingFoil:** what the external runner covers for WingFoil's missing engine is listed as that project's pack
  deviations. Those that bear on the Benchmark (R2, R4) join F-041 as evidence in the feedback inbox (dl-163); no new
  note is filed before the spike.
- **Not in this decision:** the external runner's adoption as this repository's own governance, its workflows run by
  the runner's commands instead of a session (planned for when this repository's pin moves to WingFoil 0.4, with
  task-127; the arm of C is a different use of the same runner, and the two are kept apart in versions and pins);
  using the external runner's records as Benchmark results; any change to the campaign runner beyond the quota wait
  and the notices.
