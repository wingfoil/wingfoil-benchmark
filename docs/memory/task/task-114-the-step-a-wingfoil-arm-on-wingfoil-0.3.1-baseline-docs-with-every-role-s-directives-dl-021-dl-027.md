---
id: task-114-the-step-a-wingfoil-arm-on-wingfoil-0.3.1-baseline-docs-with-every-role-s-directives-dl-021-dl-027
type: task
title: "The step-A wingfoil arm on WingFoil 0.3.1, baseline-docs with every role's directives (dl-021, dl-027)"
status: in-progress
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

- Approved pending → backlog by the approver (`303891d4`, 2026-10-27), the consent for the four dry runs ("4: due arm ×
  due agenti", the approver in chat, 2026-10-27); backlog → in-progress on main (`b79f576a`); worktree
  `../WingFoil2-Benchmark-wt/task-114`, branch `task/<id>`.
- **Red-first** (`c1d08289`): the manual's and setup's tests, the schema's, the generator's, the snapshot's and the
  Codex scope's, all red before the code; then the scope (`0ae2ad65`), baseline-docs (`0f61a032`), the arm
  (`12ed3a10`), campaign-007's dry-run profile (`6c4719c0`), the specification (`370aa63d`), the docker test
  (`e5550254`).
- **Deviations from the Design:**
  - baseline-docs' **manual is unchanged**: speckit-docs and openspec-docs borrow it (REQ-RUN-11), so a sentence on
    roles there would be false for them and move their digests. The generated `PROJECT_RULES.md` says it instead,
    under its Rules heading. The Design's "sorted by role then id" became one entry per directive, by id, labelled
    `For: <roles>.` (or `For: every role.`): a directive bound to several roles is rendered once.
  - The choice is `docs_directives: every-role` in `arm.yaml` (REQ-FMT-05 1.41), refused on an arm that is not a
    docs control; absent, the generator renders as before, so campaign-006's pinned baseline-docs renders as it ran.
  - **Decision 3 widened:** WingFoil 0.3.1 has no `memory rekey` verb (its `memory --help`: add, amend, approve,
    deprecate, history, park, reject, search, submit), and has `memory deprecate`, which retires a document from any
    state. The approver chose in chat (2026-10-27, "amend, reject, rekey, deprecate"): the manual forbids all four.
    `12ed3a10`'s message dates that choice 2026-10-28; it was 2026-10-27.
  - The manual's numbered rules became **bullets** (`6c4719c0`): the site's Markdown renderer has no ordered list and
    loops on a numbered item holding a nested list; the site's unit tests ran out of heap on the first version.
    Filed as **bug-037** (`d81c5431`, the approver's request in chat, 2026-10-28), pending.
  - **Context through the CLI** (decision 2) keeps the approved decisions' search the v0.2 manual had, so that the
    wingfoil agent can read what baseline-docs carries (T3).
- **What else changed:** v0.2's reference campaign now reads its wingfoil arm from history, as its bridge does (its
  test updated); the docker tests and the W3 fixture campaign build WingFoil `v0.3.1`.
- **Checked offline** on WingFoil 0.3.1 (`870bd440`, `init --template Kanban` in a scratch repository): `init` writes
  no `CLAUDE.md` or `AGENTS.md`; the instance the setup opens is a `plan` element (`docs/memory/plan/…`), which the
  generator does not read; `workflow start --title` exists; the Kanban scaffold binds directives to six roles
  (developer, reviewer, qa, architect, product-owner, tech-lead) and four global ones.
- **The arms with the fake agent in the run container** (criterion 7): the docker W3 test, `BENCH_WINGFOIL_REPO` at
  v0.3.1: the setup opens the instance (four commits), `workflow next` prints `kanban-delivery.plan`, baseline-docs
  gets every role's directives labelled; green. The other docker tests run with the full suites. **A deviation from
  criterion 7:** the W3 test runs the fixture scenario T2 with the fake agent, not a fake-agent dry run of S1@1.0 in
  each changed arm; it holds no credential, so no secret scan applies to it.
- **The first build's digests:** wingfoil `d8e7f0ee3779`, baseline-docs `64e37c838830`, baseline `964b1354526c`
  (unchanged); wingfoil's final digest is below.
- **The dry runs ran from the worktree** (the approver's choice in chat, 2026-10-28, "1, dal worktree"), not the main
  checkout: main's history does not hold the step-A digests. **For the Codex ones this departs from dl-024's bound 1**
  ("from the main checkout"), which dl-025, dl-027 and dl-028 keep; recorded here and in their ledger lines, with no
  amendment of dl-024 (the approver in chat, 2026-10-28, "1 ok"): campaign-007 runs from main after the merge. Each
  execution's directory was then copied into the main checkout and committed there with its ledger line; its
  transcripts, git-ignored (`.gitignore:13`), and its workspace under `runs/` were copied beside it, not committed.
- **The four dry runs** (S1@1.0, 2026-10-28; committed on main, `b275f1cb`; four ledger lines; read by a script over
  the transcripts, never by hand):

  | Arm | Agent | Dry run | Final, hold-out | Interventions | Cost |
  |---|---|---|---|---|---|
  | wingfoil `d8e7f0ee3779` | Claude Code | `dry-runs/88` | 164/165, 45/48 | 2 | 0.5821 USD |
  | baseline-docs `64e37c838830` | Claude Code | `dry-runs/89` | 164/165, 45/48 | 0 | 0.5028 USD |
  | wingfoil `d8e7f0ee3779` | Codex | `dry-runs/90` | 165/165, 48/48 | 5 | 1.5148 USD |
  | baseline-docs `64e37c838830` | Codex | `dry-runs/91` | 164/165, 45/48 | 0 | 0.9680 USD |

  All four completed; 0 € billed; no MCP call in any session (decision 2); no forbidden verb (decision 3); no Codex
  resume on another model (bug-036 fixed). Secret scan: the runner's scrub, then a pattern scan (Anthropic and OpenAI
  token shapes, JWTs, `access_token`/`refresh_token` values) of the results, the workspaces and every git object of
  their histories: clean.
- **Codex (`dry-runs/90`) follows the cycle as designed:** each of the five requests opens its own instance (step 1
  the setup's), adds and submits its task (decision 1), stops at the review gate asking for the approval, gets
  "Approved. Proceed.", approves its task and finalizes the delivery.
- **Claude Code (`dry-runs/88`) stops at the gate without asking:** at steps 1–3 `workflow next` printed `human
  needed: approve or reject <tasks>`, and the session ended on a statement ("needs approval of task-001 … from the
  approver", "waiting on approval of task-001, task-002 and task-003. I'm stopping here for that"), which approver
  policy v2 does not read as a request (dl-026: a request needs a requester); no reply came, the instance stayed at its
  review, and steps 2 and 3 added their tasks to it (decision 1 held: each request has its task). At step 4 the
  session asked; one reply, and it approved the four tasks one by one and finalized one delivery. Step 5 opened a new
  instance and passed its gate. Every request had its task, and every task was approved, but three gates were
  answered late, in one batch.
- **The manual corrected twice** (the approver's choice in chat, 2026-10-28, "2 correggi il manuale", consenting to
  the two wingfoil dry runs again; then "sì, correggi e lancia i 2 dry run" for two more):
  - `13f44241` asked, at a gate, for "Do you approve <id>?" (digest `9af52370f697`). **Wrong:** approver policy v2
    reads it as a question. `dry-runs/92` (Claude Code, 164/165, 45/48, 12 interventions, 0.7782 USD) got the
    question's reply at every step; at steps 1, 2 and 5 its next message ("If the reply is "Approved. Proceed.", I'll
    run …") read as a request, got "Approved. Proceed." and it approved (task-001, task-002, then 003–005); at steps 3
    and 4 it refused to approve on the question's reply and reached the cap; `dry-runs/93` (Codex, 165/165, 48/48,
    5 interventions, 1.6682 USD) **approved its own task at every step on the question's reply** ("Make the most
    reasonable choice, record it, and proceed"), at steps 3 and 5 with `--reason "Approved. Proceed."`, a reason the
    reply did not give. The phrase had not been run through the classifier before the dry runs.
  - `8c2dae54` (digest `dd43760095bd`; corrected again by review round 1, below): the gate's request is "Please approve <id>." for each document `next`
    lists, which a test runs through `classifyV2` (`approval`); and any reply but "Approved. Proceed." is no approval:
    the agent says so and stops.
  - `dry-runs/94` (Claude Code: 165/165, hold-out 48/48, 5 interventions, 0.7636 USD) and `dry-runs/95` (Codex:
    164/165, hold-out 45/48, 5 interventions, 1.4366 USD): under both agents each of the five requests runs in its own
    instance (the setup's, then four opened), adds and submits its task, gets "Approved. Proceed." at its review gate,
    approves in the turn after the reply (never before) and records its delivery; no MCP call, no forbidden verb.
    Committed on main (`08fbeb76`); secret scan clean.
- **What campaign-007 reads:** wingfoil `dd43760095bd` (`dry-runs/95`), baseline-docs `64e37c838830` (`dry-runs/91`),
  in `campaigns/codex-terra-step-a.dry-run.yaml`. `dry-runs/88`, 90, 92 and 93 ran earlier digests: evidence of the
  corrections, not campaign-007's dry runs. Eight real dry runs in all: 8.2143 USD API-equivalent (the ledger's
  eight lines summed), 0 € billed, under the consent's 20 €.
- **criterion 4's scenario:** a new `runner.feature` scenario, "A docs control that declares every role gets every
  role's rules, labelled", beside the existing one, which stays as it was (the docs control without the choice).

### Review

Under dl-020; `scripts/pre-review.sh main` green before each round.

- **Round 1** (an independent read-only agent, its scripts in a `mktemp` directory; both checkouts' HEAD and reflog
  unchanged): the code, the manual against the three decisions and WingFoil 0.3.1's commands, the gate phrase through
  `classifyV2` (16 variants), parity, every dry run's figures by its own scripts, the digests, the cited commits.
  No blocker.
  - **should-fix, fixed:** dry-runs/92's interventions were 12, not 10 (here and the ledger, `b414a460`); the
    manual's "run the commands `next` prints" against "never approve on your own initiative" at the review gate
    (an explicit `memory approve` exception, `b246c8b4`); the Codex dry runs' departure from dl-024's bound 1
    recorded (above, and the ledger); criterion 7's substitution recorded; baseline-docs' Rules sentence assumed a
    role and a step the docs control's agent does not have: now "Follow those that fit the work you are doing, and
    always those for every role." (the approver's wording in chat, 2026-10-28).
  - **nits, fixed:** the digests line marked as the first build's; "transcripts included" corrected; dry-runs/93's
    false `--reason`; "each document you asked about"; the setup's instance described as the first request's; the
    setup's comment names v0.3.1; `docs_directives` refused on a docs control not generated from wingfoil; REQ-RUN-15
    1.41 says how a campaign file is named and which refusals name which decisions; the Codex scope's comment and
    two messages, `arm.ts` and `runner.feature`'s header within 120 columns; criterion 4's new scenario recorded.
  - **nit, recorded:** `rekey` is not a 0.3.1 verb; the manual forbids it as the approver chose.
  - The manual's fixes move wingfoil's digest to `cf70ad7ed9aa`; baseline-docs' sentence is generator code, its
    digest unchanged. The approver chose (chat, 2026-10-28, "2 rifai solo Codex, 3 frase ok e rifai baseline-docs")
    to run again Codex's two dry runs, campaign-007's.
