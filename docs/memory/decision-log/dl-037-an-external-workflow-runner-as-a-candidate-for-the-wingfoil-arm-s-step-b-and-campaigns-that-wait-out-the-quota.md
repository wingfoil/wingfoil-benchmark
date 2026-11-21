---
id: dl-037-an-external-workflow-runner-as-a-candidate-for-the-wingfoil-arm-s-step-b-and-campaigns-that-wait-out-the-quota
type: decision-log
title: "An external workflow runner as a candidate for the wingfoil arm's step B, and campaigns that wait out the quota"
status: draft
tags: ["v0.4","wingfoil","runner"]
---

## Context

The approver asked on 2026-11-20 for a comparison between the Benchmark and a workflow runner written for another of
the maintainer's WingFoil projects, in anticipation of WingFoil's workflow engine. The approver also asked whether
campaigns could use that runner. Like dl-036, this is recorded **as a candidate for v0.4's release-planning, not a
decision**. It changes nothing in v0.3's remaining work.

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

## Options

- **A. The external runner as the campaign runner.** Rejected. It drives only WingFoil workflows, so `baseline`, Spec
  Kit, OpenSpec and the docs controls have no frontier to read. It has none of what makes a run comparable: a pinned
  image, a container per run, a frozen arm setup, the scripted approver, hidden tests, a hold-out. It picks the model
  by role, against "harness, not model". Its trust features (a home aligned with `origin/main`, the signed ledger, the
  timers) are obstacles in a container.
- **B. The external runner as a provisional engine for the wingfoil arm's step B.** It runs inside the run's container
  until WingFoil's own headless launch is admitted, and the arm is labelled with both versions. Proposed, as a
  candidate.
- **C. Wait for WingFoil 0.4's headless launch** (dl-021 step B as it stands). It stays the target. B only reads
  earlier what C will read.
- **D. Campaigns wait out the quota and send notices.** This takes the external runner's ideas, not its code. It is
  independent of B and C. Proposed.

## Proposal

**D, and B as a candidate to be confirmed at v0.4's release-planning. C stays dl-021's step B.**

**D. The quota wait and the notices:**

1. **The wait.** At `quota exhausted`, a campaign with `quota_wait: true` waits until the subscription's reset instead
   of stopping. The reset time is read from the agent's limit message, or else taken from the campaign file. The
   campaign then reruns that run as `--resume` does today, keeping the earlier attempt under `attempts/<k>/`. The wait
   is bounded (`quota_wait_max_hours`), and past it the campaign stops as today. A wait is recorded in the campaign's
   log with its start and end, so the agent's time is unchanged and the wall time shows it.
2. **The notices.** A desktop notice (`notify-send`, when present) is sent when a campaign stops (the quota past its
   wait, the ceiling, `fail_fast`, an interrupt), when a run fails, and when the campaign ends.
3. **A task implements 1–2.** Its tests use the fake agent's replayed limits, red first. It needs no real-agent session,
   so it costs 0 €.

**B. A step-B arm on the external runner** (provisionally `wingfoil-runner`), if its conditions hold at v0.4's
planning:

| Condition | Why |
|---|---|
| The runner is **published** by its owner at a version the arm pins, its manifest's digest being part of the arm's digest | T12: a setup is public and can be contested; the runner changes almost daily |
| **One model for every tier and role**, the campaign's, and the reviewer the same agent in another session | "harness, not model"; T14 |
| The runner runs **inside the run's container**, one Benchmark step at a time, until no step an agent can do is left | the same isolation and the same steps as every arm |
| **The approver policy answers the gates** through the runner's ruling command, its signed ledger stubbed | the fixed approver of every arm |
| The timers, the push, the notices, the budget and the trust checks are **off** | they belong to a machine, not to a run |
| Each launch's **stream, usage and transcript reach the Benchmark**, through the runner's adapter arguments or a wrapper adapter | cost and transcripts are measured as in every other arm (dl-021 step B's own condition) |

- **It is reported apart.** Its result is the result of WingFoil driven by that runner, not WingFoil's own. It is
  never the wingfoil arm's headline and never replaces step A or step B. It ends when WingFoil's headless launch is
  admitted, and its last campaign is then read against step B, as a bridge.
- **The conflict of interest.** The runner and WingFoil come from the same maintainer as the Benchmark (T1). The arm's
  hypothesis is therefore written before its first run. It reads "per-role launches with a distinct reviewer catch
  more of the scenario's checks than step A's single session, at a cost not above step A's by more than the variance",
  and a failure is published as a finding.
- **A spike comes first** (a task, at most one dry run, with the approver's spending consent). It shows whether the
  runner runs headless in the container with the conditions above, and how many of its lines must change. If more than
  a thin wrapper is needed, B is dropped and C is awaited.

## Consequences

- **Now:** a task for D, after v0.3's release. Nothing is spent.
- **At v0.4's planning:** B enters as a candidate with its spike. dl-021's table gains a row "B′, the external runner,
  until 0.4's launch is admitted", only if B is confirmed.
- **For WingFoil:** what the external runner covers for WingFoil's missing engine is already listed as that project's
  pack deviations. Those that bear on the Benchmark (a headless launch, its stream and usage, gates answered by a
  policy) join F-041 as evidence in the feedback inbox (dl-163); no new note is filed before the spike.
- **Not in this decision:** using the external runner's records as Benchmark results; any change to the campaign
  runner beyond the quota wait and the notices.
