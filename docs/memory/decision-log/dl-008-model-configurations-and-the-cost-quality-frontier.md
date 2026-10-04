---
id: dl-008-model-configurations-and-the-cost-quality-frontier
type: decision-log
title: "Model configurations and the cost-quality frontier"
status: pending
---

## Context

Raised by the approver on 2026-10-04, during the v0.1 reference campaign's re-run
([campaign-001](../campaign/campaign-001-v0-1-reference-campaign.md), `c82a5e74885b/2`).

**The production case.** Using the latest frontier model for every task is not worth its cost. Teams mix frontier
models with cheaper or specialised ones, chosen by the kind of work: coding, refactoring, review, testing. A
benchmark of harnesses has to account for this, or it answers a question its readers do not ask.

**What the benchmark measures today:** the harness's effect **on one model** ("harness, not model"). One run has
one model, set by the campaign; slices compare models side by side and are never mixed into the headline (T14).

**What is coming:**

- WingFoil is to let a workflow run its phases on different models, chosen by the phase's kind or complexity
  (*routing*).
- The same mix can be had without a harness: Claude Code's subagents can be set to another model, so a user can
  send review or tests to a cheaper one by hand.

**What exists already:**

- [task-054](../task/task-054-observed-models-recorded-per-invocation.md) records, per step, the models the agent
  actually used, from `modelUsage`. Claude Code already calls Haiku 4.5 for its own work beside the run's model.
- The scenarios' steps are distinct phases: S1 goes through implementing, refactoring, testing and review.
- The model ladder of [dl-007](dl-007-claude-5-5-models-for-the-v0-2-campaign.md) (option E) measures each phase on
  each model, one model per run.

## The two questions

1. **Where is a cheaper model enough?** This is answered by **standalone runs**: the model ladder, one model per
   run, read per step. It needs no new mechanism, and it is the evidence any routing rule needs: without it, which
   phase to send to which model is a guess.
2. **Does a mix beat a single model, and does a harness's routing beat a mix done by hand?** This needs runs
   that mix models, and arms that separate what is being mixed.

## Options

- **A. Standalone runs only.** The ladder (dl-007 E), extended to every scenario over time. The site shows the
  cost-quality frontier of (harness, model) pairs. Routing is never measured.
- **B. Routing as a harness feature only.** A `wingfoil-routed` arm against the existing arms. This mixes two effects
  into one difference: the process, and the model mix. A baseline that never mixes cannot tell them apart.
- **C. Both, in order, with a hand-mixed control.**
  1. The ladder first (dl-007 E), to learn which phases a cheaper model can take.
  2. When WingFoil's routing is designed, three configurations:

     | Configuration | Measures |
     |---|---|
     | `wingfoil`, fixed model | the process, as today |
     | `wingfoil-routed` | the process plus WingFoil's routing |
     | `baseline-mixed`: Claude Code with no harness, subagents on a cheaper model, configured from the ladder's findings | what a user gets from a mix *without* the harness |

     WingFoil's routing is worth `wingfoil-routed` against `baseline-mixed`, not against a single-model baseline.
  3. The site gets a second view beside the same-model headline: **the cost-quality frontier**, which configuration
     reaches a given quality at the least cost.

## Proposal

**C.** The ladder is already proposed in dl-007 for v0.2. The routing part waits for WingFoil's design, and this
decision-log is then completed with it. It must settle:

- **The mechanism.** Does WingFoil choose the model inside the session the runner starts (a subagent, an MCP
  command)? Then the runner only reads the models from `modelUsage` (task-054). Or does WingFoil start the sessions
  itself? Then the runner gives up control of the steps: calibration §10's "arm where the harness launches the
  agent", with new rules for caps and cost.
- **Pins.** The routing configuration becomes a pin of the arm (REQ-NFR-02), as `baseline-mixed`'s subagent
  configuration does. The campaign lists the models allowed.
- **The estimate.** Its key becomes (scenario, arm, model profile) instead of (scenario, arm, model). The dry run
  measures the mixed cost as it is.
- **The metric.** Quality and cost are read together: M-Q against M-K per configuration. The frontier is the set of
  configurations that no other beats on both. "Same quality, less cost" is what routing claims, and what it is
  measured against.
- **bug-012 first.** A step's tokens must count every model the step used before mixed runs are compared on tokens.
  Today they count the run's model only.
- **Specialised models from other providers.** They are out of scope while the agent is Claude Code. The agent
  port (REQ-ARC-04) allows another adapter, if a case arises.

## Consequences

- The experiment design gains a second view, the cost-quality frontier, beside the same-model headline. The
  headline's rule ("harness, not model") is unchanged.
- The ladder's runs (dl-007 E) are designed to feed the frontier: per-step results, per model.
- A `baseline-mixed` arm becomes part of the benchmark when routing is measured, and its configuration is chosen
  from the ladder's findings and published with it.
- Nothing changes in v0.1.
