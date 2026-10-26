---
id: task-107-step-a-spike-on-wingfoil-0-3-1-under-claude-code-and-codex-dl-021-dl-027
type: task
title: "Step A spike on WingFoil 0.3.1 under Claude Code and Codex (dl-021, dl-027)"
status: draft
release: v0.3
wave: W15
features: [F2.6, F2.7]
acceptance: []
requirements: [REQ-RUN-12, REQ-RUN-14, REQ-RUN-15]
fixes: []
tags: ["v0.3","wingfoil","codex","spike"]
---

## Context

[dl-021](../decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)
step A: the session agent drives WingFoil's workflow cycle (status, next, the step's role, stop at gates, finalize),
one workflow instance per scenario, its context from the MCP session Resource
(`wingfoil://session/{role}/{element}/{state}`). Its entry condition is WingFoil 0.3.1 released and admitted and **a
spike** confirming that one instance carries several requests, what `next` prints in a later session, and that the
agent reads the session Resource.
[dl-027](../decision-log/dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13.md)
(approved 2026-10-26) brings step A ahead into W15 under **both agents**, so that a Codex campaign of the step-A arm
(campaign-007) can run before the ChatGPT Plus subscription ends on 2026-11-13. This task is that spike; the step-A
arm is the next task, which it informs.

**It starts only when WingFoil 0.3.1 is tagged** (on 2026-10-26 only `v0.3.0` is; 0.3.1's dev-loop closed that day,
its publishing pending). **dl-027's first cut:** 0.3.1 not tagged and admitted by 2026-11-02 → no Codex step-A
campaign; this task then runs under Claude Code only, in W17's place.

**The pending → backlog approval of this task is the consent for its real sessions:** two dry runs of S1@1.0 (five
steps each, ten sessions) of the spike arm, from the main checkout — one under Claude Code (`claude-sonnet-5-5` at
`medium`, the maintainer's subscription), one under Codex (`gpt-5.6-terra` at `medium`, ChatGPT Plus under dl-024 as
dl-027 widens it). `run_cost_eur` 5 € API-equivalent each; **0 € billed**; two lines of the v0.3 ledger.

**Done** means: 0.3.1 admitted; both dry runs run to their end; each of dl-021's three questions answered per agent
from the transcripts; dl-027's second cut decided (whether a `codex exec` session reads the session Resource and
drives the cycle); the step-A arm task's Design inputs written; what WingFoil lacks filed as notes of the feedback
inbox.

## Acceptance criteria

1. **WingFoil 0.3.1 admitted:** its row in `eligibility/register.yaml`, the harness pin at the `v0.3.1` tag's commit,
   and its `init` scaffold read (roles, actions and evidence declared on its phases, WingFoil's bug-400).
   **Characterization.**
2. **The spike arm** (`arms/wingfoil-step-a-spike/`, on the task branch only, never a campaign's arm): a draft of
   step A's manual and setup — `wingfoil init`, one instance per scenario (`wingfoil workflow start`), a manual that
   has the agent run `workflow status` and `workflow next`, take the step's role, read its context from the session
   Resource, complete the step's work, stop at the workflow's gate, and `workflow finalize` at the end; under Codex
   as `AGENTS.md`, its MCP server in `config.toml` (task-105). **Spike.**
3. **The Codex scope** (`src/cli/codex-scope.ts`): the spike's dry-run profile and arm accepted on `gpt-5.6-terra`,
   anything else still refused (dl-027 bound 5). **Red-first.**
4. **Under Claude Code:** the S1@1.0 dry run of the spike arm; from its transcripts, per step: whether one instance
   carries all five requests, what `workflow next` printed, whether the session Resource was read (an MCP resource
   read in the stream) and whole, where the session stopped (a gate, an intervention, the step's end). **Spike.**
5. **Under Codex:** the same on `gpt-5.6-terra`, the Resource read through `read_mcp_resource`, plus its size against
   Codex's per-tool output limit (`tools.<tool>.output_token_limit`, WingFoil's bug-374, planned for WingFoil v0.4):
   whether Codex got it whole or truncated. **Spike.**
6. **The findings:** dl-021's three questions answered per agent; dl-027's second cut decided and recorded in dl-027;
   the step-A arm's Design inputs (the manual's wording, the set-up, the approver policy's fit with the workflow's
   gates); each gap in WingFoil a note of `docs/wingfoil-feedback/` (next free F-number). **Characterization**
   (documents).

## Design

- **Through the runner, not a probe:** the spike runs as `bench scenario dry-run S1@1.0 --arm wingfoil-step-a-spike
  --model <model> --profile <spike profile>` from the main checkout with the worktree's `dist/` and the spike profile
  copied in untracked for the run (as task-105 did), so that the credentials, the secret scans, the costs and the
  approver policy are the runner's own. task-102's probe runs no arm's setup, which step A needs.
- **Approver policy v2** (dl-026) in the spike profile: an approval request at a workflow gate is answered with
  "Approved. Proceed.", as every arm's; whether that fits the workflow's own gates (who approves, with which verb) is
  one of the spike's readings.
- **WingFoil 0.3.1** from the local clone (`BENCH_WINGFOIL_REPO`), the arm's harness pin `v0.3.1`; the managing
  WingFoil CLI (`0.2-pre-3df305e`) unchanged — its bump is the first `wingfoil-sync`'s task.
- **The secret scan** of each dry run's results and workspace, plain files and every git object, as campaign-005's.
- **What is read, by a script over the transcripts** (never hand-counted): the `wingfoil workflow …` and
  `wingfoil memory …` commands, the MCP resource reads and their sizes, each session's last message and the
  classifier's reading of it.
- **Not in this task:** the step-A arm itself, baseline-docs' every-role directives, campaign-007's files: the next
  task's, from this one's findings.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
