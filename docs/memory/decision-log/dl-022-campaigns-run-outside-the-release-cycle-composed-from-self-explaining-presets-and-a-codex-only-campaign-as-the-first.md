---
id: dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first
type: decision-log
title: "Campaigns run outside the release cycle, composed from self-explaining presets, and a Codex-only campaign as the first"
status: draft
tags: ["campaign","codex","presets"]
---

## Context

**Campaigns are tied to releases today.** A campaign runs as `release-cycle` › `campaign` (plan-003 and plan-004
step 5), through `campaign-cycle`, from a campaign file written by hand for that release
(`campaigns/v0-2-reference.yaml`, REQ-FMT-01). `campaign-cycle` is already a main workflow that can start on its own,
but in practice a measurement waits for a release, and every new question (another agent, another model, a subset of
arms) means a new campaign file written from scratch.

**A Codex campaign is wanted now** (the maintainer, 2026-10-21): the Codex agent (Codex CLI 0.162.1, task-094) on the
maintainer's ChatGPT Plus subscription, which ends on **2026-11-13** and will not be renewed.

- **Arm A, now:** the baseline arm only, on S1, S2, S3 and S8 at 1.0 and the baseline's digest (`964b1354526c`), so
  that its results compare with Claude Code's baseline in campaign-002 (M-R across agents, experiment design 1.4
  §4.5); Codex's three models (Sol, Terra, Luna) at one reasoning effort, as the Claude models are.
- **Arm B, later:** a WingFoil arm rendered for Codex (`AGENTS.md`, Codex's MCP configuration), measuring whether
  WingFoil helps Codex, inside a Codex-only campaign. It needs the arm to know its agent; feasible before 2026-11-13
  only if prioritised over v0.3.
- **What is known:** only `gpt-6.1-sol` is verified under Codex 0.162.1 (task-094), and only it is in the price table
  (`src/agents/openai-prices.ts`); Terra's and Luna's ids and prices are to be verified. The Plus quota is per 5-hour
  window and per week, and differs by model. About 44 sessions per model (27 campaign steps, 17 dry-run steps), about
  132 for three. The credential decision
  [dl-019](dl-019-the-codex-spike-s-subscription-credential-mounted-read-write-from-a-dedicated-directory-outside-the-repository.md)
  is closed, its credential deleted.

## Options

- **A. Keep campaigns inside releases**, each one a hand-written file. The Codex campaign waits for v0.3 and probably
  misses the subscription's end.
- **B. Campaigns outside the release cycle, from presets.** Running a campaign becomes an operation the approver
  starts whenever they want, through `campaign-cycle` alone; a release only *uses* campaigns (its reference campaign
  and bridge). A campaign file is **composed** from a named, self-explaining **preset** plus explicit choices
  (scenarios, agent, models, arms, repetitions), and committed before its run, so that its identity and pins stay
  REQ-FMT-01's and REQ-FMT-02's.
- **C. B without the file:** `campaign run` takes the choices as flags. Rejected: the campaign's identity is its
  committed file (REQ-FMT-02); flags would make a run unreproducible from the repository.

## Proposal

**B**, and the Codex campaign's arm A as the first campaign run that way.

- **Presets** in `campaigns/presets/<name>.yaml`, each a partial campaign file with a one-line `description:` that
  says what it measures, for example:
  - `reference`: every arm, every registered scenario, the release's default model and slices;
  - `baseline-across-agents`: the baseline arm only, every scenario, one agent and its models;
  - `harness-vs-docs`: one harness arm with its docs control and the baseline;
  - `smoke`: one cheap scenario (S3) in every arm, one repetition.
- **`bench campaign new <file> --preset <name> [--scenarios …] [--agent …] [--models …] [--arms …] [--repetitions
  …]`** writes a complete campaign file from the preset and the choices, with the pins of the current tree (harness
  versions, arm digests, the dry-run profile's agent, effort, caps, rate); `bench campaign presets` lists the presets
  and their descriptions. The written file is reviewed and committed like any campaign file; `validate`, `estimate`
  and `run` are unchanged.
- **The run is the approver's, when they choose,** through `campaign-cycle` (its gates: spend, results, publishing), a
  line of the spending ledger per run. Its results are published only when a release or the approver says so.
- **The Codex campaign, arm A:** composed from `baseline-across-agents` for `codex`, S1–S8 at 1.0. Before any run: (1)
  a decision-log for the Codex credential on
  [dl-019](dl-019-the-codex-spike-s-subscription-credential-mounted-read-write-from-a-dedicated-directory-outside-the-repository.md)'s
  model (a dedicated directory outside the repository, read by name only, deleted at the end); (2) a spike, consented,
  of one session per model, to verify Terra's and Luna's ids, their effort levels and the quota indicator; (3) their
  list prices added to the price table. Dry runs, then the campaign, within the Plus quota; if not everything fits by
  2026-11-12, the order is S3's dry runs on every model, then Sol's whole campaign, then Luna, then Terra.
- **Arm B** waits for the wingfoil arm's step A
  ([dl-021](dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)),
  which makes the arm's agent-specific files explicit; with no Codex subscription after 2026-11-13 it waits for a new
  one.

## Consequences

- `release-cycle` keeps a `campaign` phase that runs the release's own campaigns; other campaigns no longer need a
  release. The requirements gain the presets, `campaign new` and `campaign presets` (REQ-CLI), and REQ-FMT-01 states
  that a campaign file may be generated from a preset, the file staying the campaign's identity.
- The Codex work competes with v0.3's: a task for the presets and `campaign new`, a credential decision-log, a spike
  and the price rows come before any Codex run, within the WIP. If they cannot be done in time, arm A runs from a
  hand-written campaign file, as task-094's did, and the presets follow in v0.3.
- Cross-agent results are published as their own comparison, never mixed with the Claude headline (T14).
