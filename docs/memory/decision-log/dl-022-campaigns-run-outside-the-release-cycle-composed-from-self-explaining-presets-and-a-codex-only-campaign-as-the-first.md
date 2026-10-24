---
id: dl-022-campaigns-run-outside-the-release-cycle-composed-from-self-explaining-presets-and-a-codex-only-campaign-as-the-first
type: decision-log
title: "Campaigns run outside the release cycle, composed from self-explaining presets, and a Codex-only campaign as the first"
status: draft
tags: ["campaign","codex","presets"]
rejection_reason: "Sent back by the approver: the proposal is reframed around what exists (campaign-cycle is already a standalone main, bench campaign run already reads a versioned file); presets become a campaign file's extends: instead of a generator, with the resolved file digested and recorded."
---

## Context

**What exists.** A campaign is already a command and a file of its own: `bench campaign validate|estimate|run <file>`
(`run` with `--resume` and `--allow-spending`), then `score`, `compare`, `site build` and `transcripts pack`. The file
is versioned and is the campaign's identity: its id is the first 12 hex of the SHA-256 of its canonical JSON
(`campaignId`, `src/campaign/load.ts`; REQ-FMT-01, REQ-FMT-02), and it pins everything a run depends on (harness
versions, arm digests, the agent and its effort, caps, budget, rate). `campaign-cycle` is a `kind: main` workflow that
starts on its own; `release-cycle` › `campaign` launches it against the release's campaign element rather than
including it.

**What is missing.**

- **No rule says a campaign may run without a release.** In practice every campaign so far was born inside one
  (plan-003 and plan-004 step 5), and a measurement waited for the next release.
- **Every campaign file is written whole, by hand.** Each new question (another agent, another model, a subset of
  arms or scenarios) repeats every pin of the previous file; the pins are many and easy to get wrong, which is what
  makes a custom campaign costly.

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
  132 for three. The credential decision [dl-019](dl-019-the-codex-spike-s-subscription-credential-mounted-read-write-from-a-dedicated-directory-outside-the-repository.md) is closed, its credential deleted.

## Options

- **A. Keep campaigns inside releases**, each one a whole hand-written file. The Codex campaign waits for v0.3 and
  probably misses the subscription's end.
- **B. Campaigns run whenever the approver wants, from short files that extend a preset.** `campaign-cycle` becomes
  the stated way to run any campaign; a release only requests its own. A campaign file may declare
  `extends: presets/<name>.yaml` and write only what differs; the campaign's identity is the resolved file.
- **C. B with a generator** (`bench campaign new <file> --preset … --agent …`) that writes the whole file from a
  preset. Rejected: the committed file would again repeat every pin, the preset's later corrections would not reach
  it, and the question the campaign asks would be buried in the pins.
- **D. Choices as flags of `campaign run`, no file.** Rejected: a run would not be reproducible from the repository
  (REQ-FMT-02).

## Proposal

**B**, and the Codex campaign's arm A as the first campaign run that way.

- **A campaign runs as an isolated operation**, started by the approver whenever they choose, through `campaign-cycle`
  and its gates (spend, results, publish), each run a line of the spending ledger. `release-cycle` › `campaign`
  requests the release's own campaigns (its reference campaign and its bridge) in the same way; any other campaign
  needs no release. Its results are published only when a release or the approver says so.
- **Presets** in `campaigns/presets/<name>.yaml`: a partial campaign file with a required one-line `description:`
  saying what it measures, for example:
  - `reference`: every arm, every registered scenario, the release's default model and slices;
  - `baseline-across-agents`: the baseline arm only, every scenario, one agent and its models;
  - `harness-vs-docs`: one harness arm with its docs control and the baseline;
  - `smoke`: one cheap scenario (S3) in every arm, one repetition.
- **`extends:`** in a campaign file names one preset; the file's own keys override the preset's (maps merged by key,
  lists replaced whole, no chains: a preset does not extend). The loader resolves the file before validating it,
  and **the id is the digest of the resolved campaign**, so that the same question asked with the same pins keeps
  one id, and a change to a preset gives every campaign that extends it a new id. The resolved file is written into
  each execution's results, next to `run.json`. Files without `extends:` resolve to themselves and keep their ids
  (campaign-002's `81ebb2691f9c`, campaign-003's `bf3a1ac7dff5`).
- **`bench campaign presets`** lists the presets with their descriptions; **`bench campaign validate <file>`** prints
  the resolved campaign, so that what will run is seen before any spend. `estimate` and `run` read the resolved file
  and are otherwise unchanged.
- **The Codex campaign, arm A:** `campaigns/codex-baseline.yaml`, extending `baseline-across-agents` with `agent:
  codex`, its three models and S1–S8 at 1.0. Before any run: (1) a decision-log for the Codex credential on [dl-019](dl-019-the-codex-spike-s-subscription-credential-mounted-read-write-from-a-dedicated-directory-outside-the-repository.md)'s
  model (a dedicated directory outside the repository, read by name only, deleted at the end); (2) a spike, consented,
  of one session per model, to verify Terra's and Luna's ids, their effort levels and the quota indicator; (3) their
  list prices added to the price table. Dry runs, then the campaign, within the Plus quota; if not everything fits by
  2026-11-12, the order is S3's dry runs on every model, then Sol's whole campaign, then Luna, then Terra.
- **Arm B** waits for the wingfoil arm's step A ([dl-021](dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)), which makes the arm's agent-specific files explicit; with no
  Codex subscription after 2026-11-13 it waits for a new one.

## Consequences

- `campaign-cycle`'s header and `release-cycle` › `campaign` say that a campaign runs on its own and a release
  requests its campaigns; a configuration change, so through a task.
- The requirements gain the presets, `extends:` and its resolution, the id over the resolved file, the resolved file
  in the results (REQ-FMT-01, REQ-FMT-02 amended) and `campaign presets` and `validate`'s printed resolution
  (REQ-CLI). The existing campaign files and their results are untouched.
- The Codex work competes with v0.3's: a task for presets and `extends:`, a credential decision-log, a spike and the
  price rows come before any Codex run, within the WIP. If they cannot be done in time, arm A runs from a whole
  hand-written campaign file, as task-094's did, and the presets follow in v0.3.
- Cross-agent results are published as their own comparison, never mixed with the Claude headline (T14).
