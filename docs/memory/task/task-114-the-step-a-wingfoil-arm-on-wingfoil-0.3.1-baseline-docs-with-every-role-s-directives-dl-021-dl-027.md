---
id: task-114-the-step-a-wingfoil-arm-on-wingfoil-0.3.1-baseline-docs-with-every-role-s-directives-dl-021-dl-027
type: task
title: "The step-A wingfoil arm on WingFoil 0.3.1, baseline-docs with every role's directives (dl-021, dl-027)"
status: draft
release: v0.3
wave: W15
features: [F2.5, F2.6, F2.7]
acceptance: [runner.feature]
requirements: [REQ-FMT-05, REQ-FMT-13, REQ-RUN-03, REQ-RUN-11, REQ-RUN-12, REQ-RUN-14, REQ-RUN-15, REQ-RUN-17]
fixes: []
tags: ["v0.3","wingfoil","codex"]
---

## Context

[dl-021](../decision-log/dl-021-the-wingfoil-arm-follows-wingfoil-s-workflow-model-in-three-steps-each-on-the-wingfoil-release-that-enables-it.md)
step A: on WingFoil ≥ 0.3.1 the session agent drives WingFoil's workflow cycle (status, next, the step's role, stop
at the workflow's gates, finalize), with no driver written by the benchmark; baseline-docs carries every role's
directives, labelled; the arm's agent-specific files are explicit; each step is a new arm version.
[dl-027](../decision-log/dl-027-step-a-brought-ahead-with-a-codex-campaign-of-the-step-a-arm-before-2026-11-13.md)
item 3 makes this arm a task of W15's order, after the spike
([task-107](task-107-step-a-spike-on-wingfoil-0-3-1-under-claude-code-and-codex-dl-021-dl-027.md), done) and before
campaign-007 on Codex. WingFoil v0.3.1 is admitted for step A (`eligibility/register.yaml`).

**The deadline.** dl-027's third cut: **this task not approved by 2026-11-08 → no Codex step-A campaign**, and step A
goes on under Claude Code only (dl-027's option B). campaign-007 must end by 2026-11-13, the Codex credential's last
day (dl-022, dl-024).

**Done** means: the step-A wingfoil arm and baseline-docs at their new digests, checked with the fake agent and by
the dry runs below, the Codex scope accepting campaign-007 and its dry runs, the task approved by **2026-11-08**, so
that campaign-007 can run.

**Spending: 0 € billed** (dl-027). The **pending → backlog approval of this task is the consent for its real-agent
sessions** (the approver's choice in chat, 2026-10-27): four dry runs of S1@1.0, five steps each (20 sessions), from
the main checkout:

| Arm | Claude Code | Codex |
|---|---|---|
| wingfoil (step A) | `claude-sonnet-5-5`, `medium`, the maintainer's subscription | `gpt-5.6-terra`, `medium`, Plus |
| baseline-docs (every role) | the same | the same |

`run_cost_eur` 5 € API-equivalent each, **20 € API-equivalent at most**; four lines of the v0.3 ledger. The two Codex
dry runs read campaign-007's dry-run profile, so they count among campaign-007's eight (dl-027 item 4). Any other
real-agent session (S2, S3, S8 dry runs, campaign-007's runs, `gpt-6.1-terra`) is campaign-007's, consented there.

## Acceptance criteria

1. **The step-A wingfoil arm** (`arms/wingfoil/`, a new digest; the v0.2 manual's arm stays readable from history,
   REQ-FMT-13 as amended in 1.33, for campaign-006's pending rerun): the setup opens one `sw-life-cycle` instance and
   finalizes inception and specification (task-107's option A); `arm.yaml`'s comments name WingFoil v0.3.1 and its
   capabilities re-read on it. Checked in the run container with the fake agent: the setup ends with the instance at
   `kanban-delivery.plan`. **Red-first** (a test of the arm's files and the setup's instance before they change).
2. **The manual** drives the cycle as the spike arm's does, with the approver's three decisions of task-107 written in
   it (Design). A test reads the manual for each decision's rule. **Red-first.**
3. **The agent-specific files explicit:** the manual names the file it is delivered as under each agent (`CLAUDE.md`
   under Claude Code, `AGENTS.md` under Codex, REQ-RUN-12) and where each agent finds WingFoil's MCP server (the run's
   `--mcp-config` file, Codex's `config.toml`); the arm declares nothing agent-specific beyond the runner's profiles.
   **Red-first.**
4. **baseline-docs with every role's directives, labelled** (REQ-RUN-11): `PROJECT_RULES.md` renders the directives
   of every role and the global ones, each under the role(s) it is bound to; deterministic, generated twice
   byte-identical. The old rendering (developer and global only) stays reproducible for the digests that pinned it
   (Design). The `runner.feature` scenario "The baseline-docs environment is generated from the wingfoil arm's
   configuration" and the method page's declaration (`site-content/method.md`) say so. **Red-first.**
5. **The Codex scope** (`src/cli/codex-scope.ts`, dl-027 item 5 and dl-028 item 1): campaign-007's file and its
   dry-run profile accepted, the three arms on `gpt-5.6-terra` and `gpt-6.1-terra`; anything else still refused, the
   end date unchanged. **Red-first.**
6. **campaign-007's dry-run profile** (`campaigns/`, written whole: WingFoil `v0.3.1`, Codex 0.162.1, approver policy
   v2, the three arms' digests) committed with the arm, so that the dry runs below and campaign-007's estimate read
   it. **Characterization.**
7. **The arms checked with the fake agent** in the run container: a fake-agent dry run of S1@1.0 in each changed arm
   completes, the secret scan clean. **Characterization.**
8. **The four real dry runs** (Context's table), each run to its end; per step, from the transcripts by a script:
   whether a task was added and submitted for the request (decision 1), whether the workflow's gate fired, where the
   session stopped, any approver verb other than `approve` (decision 3), the `workflow` commands run; scores, costs,
   interventions; the secret scan of results and workspace (plain files and git objects; for Codex, the credential's
   values). Results committed on main, four ledger lines. **Characterization.**

## Design

- **Start from the spike arm**, in history: `git show 47ba2b3c^:arms/wingfoil-step-a-spike/<file>` (`c58900cd` added
  it). Its `manual.md` and `setup.sh` (step 5, the instance) become `arms/wingfoil/`'s; `mcp.json` is unchanged.
  The arm keeps its name (`wingfoil`): a new version is a new digest (dl-021), and campaigns pin digests.
- **The approver's decisions** (task-107, 2026-10-27, "approvo 1–3"), each a rule of the manual:
  1. **Every request has its task.** When `workflow next` does not ask for one (the plan counted done by an earlier
     task: WingFoil's F-043, a later instance's evidence read from the whole repository), the agent adds the request's
     task without `--workflow` and submits it before building, so that the review finds a pending task and the gate
     fires. A stated departure from dl-021's "the recording follows the step's evidence", written in the manual's
     departures and recorded in this task.
  2. **Context through the CLI.** The manual states the CLI equivalents of the session Resource (`directives list
     --role`, `workflow next`, the element's file), as WingFoil's guide does, instead of requiring the Resource: no
     session read it in the spike under either agent. The difference from dl-021's wording ("the context from the MCP
     session Resource") recorded here and in the experiment design by task-103.
  3. **The approver's verbs other than `approve` forbidden explicitly:** `memory amend`, `memory reject`,
     `memory rekey`, as a precaution (no spike session ran one).
- **One instance per request** (task-107's option A, F-044): differs from the experiment design's "one workflow
  instance per scenario" (1.7); recorded for task-103.
- **The step's work completed before the gate** (experiment design 1.7): the spike manual's rule 5, kept.
- **baseline-docs' generator** (`src/arms/baseline-docs.ts`): every role's directives and the global ones, each
  labelled with its role(s), sorted by role then id. The generator's choice is a field of `arms/baseline-docs/arm.yaml`
  (for instance `directives: every-role`, absent = developer and global), so that the change moves baseline-docs'
  digest and a campaign pinning the old digest (campaign-006's) still renders as it ran. baseline-docs' manual says
  the rules are labelled by role.
- **The Codex scope:** an entry for campaign-007's file (`campaigns/codex-terra-step-a.yaml`) and one for its
  dry-run profile (`campaigns/codex-terra-step-a.dry-run.yaml`), decisions dl-027 and dl-028, models `gpt-5.6-terra` and
  `gpt-6.1-terra` (priced by task-110); the existing entries unchanged.
- **The dry runs** run as task-107's did: `bench scenario dry-run S1@1.0 --arm <arm> --model <model> --profile
  <profile>` from the main checkout, the worktree's `dist/` and any untracked file copied in for the run and removed
  after; Claude Code's profile a scratch copy of campaign-007's with `claude-code` 2.1.300 (not committed).
- **WingFoil under test:** v0.3.1 from the local clone (`BENCH_WINGFOIL_REPO`), as the spike; the managing WingFoil
  (`npm:wingfoil@0.3.1`, task-109) is unrelated.
- **Not in this task:** campaign-007's campaign file and execution, its other dry runs (S2, S3, S8; `gpt-6.1-terra`'s
  12, dl-028), the experiment design's wording (task-103), the method page's {#wingfoil-manual-process} and
  {#other-agents} (when campaign-007 is published, dl-027's Consequences).

## Execution notes
