---
id: dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13
type: decision-log
title: "Step A brought ahead, with a Codex campaign of the step-A arm before 2026-11-13"
status: approved
tags: ["v0.3","wingfoil","codex"]
---

## Context

Every wingfoil arm measured so far, under Claude Code and under Codex, is v0.2's manual: the manual imposes the
process (a task per request, decision-logs, approvals) and WingFoil's workflow engine never starts, so the arm
measures WingFoil as a register of documents, not as its work model uses it (the WingFoil maintainer's input to the
v0.3 retrospective, 2026-10-24; campaign-001's M-K1 finding).
[dl-021](dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)
fixes the way out in three steps; **step A** (WingFoil ≥ 0.3.1: the session agent drives the cycle — status, next,
the step's role, gates, finalize — one workflow instance per scenario, the context from the MCP session Resource)
is [plan-005](../../plans/plan-005-release-v0-3.md)'s W17, after W15's rest and W16, and plan-005 keeps a Codex
step-A arm out of v0.3 ("waits for step A and a new subscription").

What has changed since plan-005 was written (2026-10-24):

- **WingFoil 0.3.1 is close.** Its dev-loop closed on `release/0.3` on 2026-10-26 (14 tasks, the e2e smoke 82/82);
  only the pre-release checks, the approval and the publishing remain. Its scope includes the `init` scaffold that
  declares roles, actions and evidence (WingFoil's bug-400), which step A's set-up needs.
- **Codex can read MCP Resources.** Codex CLI 0.162.1's binary carries the built-in `list_mcp_resources` and
  `read_mcp_resource` tools and the `resources/list` and `resources/read` calls (read from the bench image, no session
  run), and the wingfoil arm's MCP server already reaches Codex through `config.toml` (task-105). Whether a
  `codex exec` session reads the session Resource and drives the cycle is unverified: dl-021's spike must say so.
- **The Codex credential ends on 2026-11-13** (dl-024, dl-025), and dl-022's arm B on the v0.2 manual is being rerun
  on approver policy v2 (campaign-006).
- **The quota has room:** campaign-005's last 12 runs took about 14 % of the weekly quota; the week resets about
  2026-11-02 and again about 2026-11-09.

## Options

- **A. Bring step A ahead** of task-103, the managing pin bump and W16, as soon as 0.3.1 is tagged, with its spike
  under both agents, and run a Codex campaign of the step-A arm on Terra before 2026-11-13; dl-024's scope widened to
  it.
- **B. Keep plan-005's order:** step A in W17 under Claude Code only; no Codex step-A campaign in v0.3.
- **C. B, then renew a ChatGPT subscription after 2026-11-13** for a Codex step-A campaign later (the approver's
  spending, a new credential decision).

## Proposal

**A**, with a cut order, and B as the fallback when a cut falls.

1. **The trigger:** WingFoil 0.3.1 tagged. Its admission (the eligibility register, the harness pin `v0.3.1` for the
   arm) at once; plan-005's delivery order then puts step A first in W15's remainder, WIP 1 as ever.
2. **Task: the step-A spike** (dl-021's entry condition), under **both agents**: one workflow instance carrying several
   requests, what `next` prints in a later session, and that the session reads the session Resource — Claude Code in
   `-p`, Codex in `exec` through `read_mcp_resource`. Its sessions consented at its pending → backlog: a few S1@1.0
   sessions per agent (Claude Code on Sonnet 5.5, Codex on `gpt-5.6-terra` at `medium`); 0 € billed.
3. **Task: the step-A arm**, the wingfoil arm's new version (a new digest) and baseline-docs with every role's
   directives, labelled (dl-021), the agent-specific files explicit (`CLAUDE.md`, `AGENTS.md`), and
   `src/cli/codex-scope.ts` widened as below. Red-first, the review under dl-020, the approver's gates.
4. **campaign-007:** `presets/harness-vs-docs.yaml` with `agent: codex`, `gpt-5.6-terra` at `medium`, approver policy
   v2, the arms baseline, baseline-docs and wingfoil at their step-A digests, S1 × 3, S2, S3 and S8 × 1 (18 runs);
   its dry runs for the two changed arms (8; the baseline's are reused); `campaign-cycle`'s gates. Read within Codex
   and Terra, arm against arm, and against campaign-006 as a bridge (the same pins but the arm version and the
   harness release); not across agents with a v1 execution.
5. **dl-024's scope (bound 1) gains** the spike's Codex sessions, campaign-007's file, its dry-run profile and its dry
   runs; its other bounds unchanged; the same end, 2026-11-13.

**The cut order**, each recorded when it falls:

- 0.3.1 not tagged and admitted by **2026-11-02** → no Codex step-A campaign; step A goes on under Claude Code as
  plan-005 has it (B).
- The spike shows a `codex exec` session cannot read the session Resource or drive the cycle → the same, the finding
  filed in WingFoil's feedback inbox.
- The step-A arm task not approved by **2026-11-08** → the same.
- Not all 18 runs fit by 2026-11-12 → S3, then S1 × 3, then S2, then S8, as dl-022's cut order.

**The quota:** the spike's Codex sessions, 8 dry runs and 18 runs are about 30 runs, a heavier arm than v0.2's (the
engine's reads): about 35–45 % of a week at campaign-005's rate, inside the week from about 2026-11-02, with the week
from about 2026-11-09 as the margin. **Spending: 0 € billed** (ChatGPT Plus; Claude Code's spike sessions on the
maintainer's subscription), API-equivalent recorded in the v0.3 ledger.

## Consequences

- task-103 (vision and experiment design), the managing pin bump with the first `wingfoil-sync`, and W16 move back by
  step A's length (about a week); W16's bugs wait, its v0.2 site correction (the M-K1 annotation) included.
- Step A lands in v0.3 under both agents, and the method page's {#wingfoil-manual-process} and {#other-agents} change
  when its first execution is published.
- A third Codex execution on Terra: campaign-005 (v0.2's manual, v1, deprecated), campaign-006 (v0.2's manual, v2),
  campaign-007 (step A, v2) — the arm's change read on one agent and one model.
- If a cut falls, nothing of step A is lost: its tasks are W17's, done earlier.

## The cuts, as they fell

- **First cut (0.3.1 by 2026-11-02): not taken.** WingFoil `v0.3.1` tagged on 2026-10-27 (`870bd440`), admitted for
  step A by task-107.
- **Second cut (a `codex exec` session cannot read the session Resource or drive the cycle): not taken**
  ([task-107](../task/task-107-step-a-spike-on-wingfoil-0-3-1-under-claude-code-and-codex-dl-021-dl-027.md)'s spike,
  2026-10-27). Codex drove the cycle, skipping the gate in later instances as Claude Code did (F-043); it read no
  Resource, nor did Claude Code, both reading the same context through the CLI, which WingFoil's guide states as the
  equivalent. The spike found WingFoil's F-043 (a later instance's gate can be skipped); the step-A arm corrects for it
  (the approver's decisions recorded in task-107).

