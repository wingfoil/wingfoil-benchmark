---
id: task-127-adopt-methodology-kanban-1.0.0-with-base-2-and-software-1-keeping-the-benchmark-s-delivery-rules-bug-046
type: task
title: "Adopt methodology/kanban 1.0.0 with base@^2 and software@^1, keeping the benchmark's delivery rules (bug-046)"
status: in-progress
release: v0.4
wave: W20
features: []          # e.g. [F1.1, F3.1]
acceptance: []        # e.g. [campaign.feature, scenarios.feature]
requirements: [REQ-NFR-02]
fixes: [bug-046-the-repository-s-process-runs-init-s-kanban-scaffold-and-a-hand-written-delivery-loop-not-the-published-methodology-kanban-1.0.0]
tags: ["process","wingfoil","v0.4"]
---

## Context

[bug-046](../bug/bug-046-the-repository-s-process-runs-init-s-kanban-scaffold-and-a-hand-written-delivery-loop-not-the-published-methodology-kanban-1.0.0.md): the repository's process is `init`'s Kanban scaffold of the 0.2 era with a hand-written
`kanban-delivery` (version 6), not the published `methodology/kanban` 1.0.0. The approver asked for its task in chat
(2026-11-02). **Placed after v0.3's release** (release v0.4, its first wave W20): adopting changes the states, the
workflows and the limits every open element moves through, so it is done when no v0.3 task is open, at v0.4's
release-planning, not in the middle of W16–W19. No real-agent session; the benchmark's arms are not touched (their
WingFoil is the one under test, pinned per campaign).

## Acceptance criteria

1. The README's eight steps at the tag, each recorded in the Execution notes: the comparison of `kanban-delivery`
   (version 6) with `kanban`'s `delivery`/`release-flow`/`work-item`; the composition of `methodology/kanban` 1.0.0
   with `base@^2` and `software@^1` by wingfoil-templates' reference composer, with `base`'s required parameters, the
   current path and id parameters (no file moves) and `wip_in_progress: 1`, `wip_in_review: 1`; the composed files
   copied, the project's own entries re-added (the `custom/` workflows it wrote: `release-cycle`, `campaign-cycle`,
   `scenario-authoring`, `benchmark-inception`, `benchmark-specification`, `kanban-delivery` kept beside `work-item`),
   the ones `init` scaffolded removed by bug-007's list.
2. The benchmark's own delivery rules kept as the project's additions: the independent review with severities and
   re-review (dl-020), `scripts/pre-review.sh`, the full suites at the approval gate (dl-016), `fixes`/`fixed_by`
   (task-058), the approver's gates.
3. Every state within its limit before adopting; every open element's state mapped (old → new key mapping recorded);
   every open task given a `release`.
4. The adopted version recorded in the project's Memory (a decision-log or the release's element).
5. `wingfoil` commands run before and after (`workflow status`, `memory search` by type and state), declared against
   observed behaviour in the notes; frictions as `docs/wingfoil-feedback/` notes.
6. Checks: `pre-review.sh main`, the docs and traceability tests, the full suites on the approver's go; an
   independent review (dl-020).

## Design

Written on 2026-11-23, from the README at the tag `methodology/kanban@1.0.0`, `base`'s at 2.0.1 and `software`'s at
1.0.0, the reference composer's output and a trial of the composed configuration on WingFoil 0.3.2 in a throwaway
copy (the frontier showed this task and the fifteen of W20 and W21; a second start was refused at the WIP limit).
The approver ruled the choices below in chat on 2026-11-23.

**Composition.** wingfoil-templates' reference composer, from `main` (the packs at `main` are byte-identical to the
tag's for the three versions, and `main`'s catalogue gives the range `>=0.3.0 <=0.3.2` that covers this repository's
pin), with `base`'s required parameters (the project, the approver, the agent) and the current paths and ids, so that
no file moves: `decision_log_path`, `task_path`, `adr_path`, `bug_path`, `tech_spec_path`, `release_path`
(`docs/memory/release/{id}.md`), `release_line_path`, `plan_path` (`docs/plans/{id}.md`), `plan_id`
(`plan-{n}-{slug}`), `release_id` (`rel-{slug}`, which gives `rel-v0.4`), `release_line_id` (`rl-{n}`),
`inception_path` (`docs/01_vision/01_product-brief.md`), `retrospective_path` (`docs/retrospective-inputs/`), and
`wip_in_progress: 1`, `wip_in_review: 1`. The command and its output's digest are recorded in the Execution notes.

**Deviations from the packs**, each recorded in `docs/pack-deviations.md` with its reason (the approver's choices
1–7):

1. **The Memory machines of `bug`, `decision-log` and `adr` stay this repository's** (`bug`: draft, pending, approved,
   fixed; the others the default machine), not `base`'s and `software`'s. No element changes state, the traceability
   test and `fixes`/`fixed_by` stay as they are, and the pilot's rollback stays a revert. Their migration is weighed
   when the pilot ends. `task` takes `kanban`'s machine (the same states, plus `returns` and the two limits);
   `campaign` stays a project type.
2. **The release keeps its two gates** (planning and releasing, the approver's); it gains the `release-line` field the
   composed type requires, filled for `rel-v0.4` by a first release line, `rl-1`.
3. **`work-item` is a custom copy with `kanban`'s steps** (`start`, `build`, `review`, `approve`, `done`), carrying
   `kanban-delivery` version 6's rules: `review` is the independent review with severities and re-review (dl-020),
   `scripts/pre-review.sh main` before every round and the full suites before in-review; `approve` stays the
   approver's gate; `done` is the `--no-ff` merge, the bugs it fixes moved to `fixed` and the wave's "Ends with"
   recorded. The real-agent check becomes a manual step of the copy. A task's pending → backlog gate stays outside
   the flow, as in the pack. `kanban-delivery` is removed (the approver's choice 3), its record kept in git.
4. **The slots are filled by this repository's workflows:** `custom/inception.yaml` (from `benchmark-inception`),
   `custom/specification.yaml` (from `benchmark-specification`; `software`'s default asks for a tech-spec, which this
   repository does not write), and `custom/release.yaml` with calibration, validation and the campaign before the
   release's submit and publishing. `campaign-cycle` and `scenario-authoring` stay custom mains. `release-cycle`
   retires: plan-006 is re-pointed to `sw-life-cycle`, its phases mapped in the key mapping.
5. **`retrospective` and `governance-evolution` are custom copies without `produces`**, so that WingFoil 0.3's
   reading of a completed step's evidence from the whole repository (F-043, WingFoil bug-488) does not close them at
   once for every release.
6. **`init`'s built-in directives stay**, with their assignments in `roles.yaml` beside the packs'; this repository's
   own directives that are `init`'s stubs (`traceability`, `doc-versioning`, `security-secrets`, `determinism`) give
   way to the packs'; `code-review`, `multi-session` and `wingfoil-cli` stay.
7. **The custom workflows whose names collide with the packs'** (`sw-life-cycle`, `bug-ingest`,
   `decision-log-ingest`, `adr-ingest`) are removed, since a duplicate name fails every `workflow` command; what the
   project's versions added that the packs lack is carried into the slot fillers above or recorded as lost.

**The key mapping** (old → new) is a table in the Execution notes: `kanban-delivery` → `work-item` (its `plan` →
outside the flow, `design` → `start`, `build` → `build`, `review` → `review`, the approval → `approve`, `deliver` →
`done`, `real-agent-check` → the copy's manual step); `release-cycle`'s phases → `delivery`'s `plan-release` and
`release-flow`'s `work`, `release` and `retrospective`. No element's state is renamed (deviation 1).

**The runner as governance** (the approver's rulings of 2026-11-22 and 2026-11-23), version `runner-1.2.0`, on
WingFoil 0.3.2:

- **`config/runner.yaml`:** one `trunk` line, its checkout and worktrees outside the main checkout;
  `launch.allow: [work-item]`; `launch.manual` naming the copy's real-agent check, and never `campaign-cycle`, the
  custom `release` or any step that spends (the paid launch and the spending consent stay the approver's);
  `phases.integrate: [work-item.done]`; `integration.task_branch: task/{id}`, `merge: no-ff`; `paths.runs:
  [docs/runs/]` (the root `/runs/` is the campaign runner's, git-ignored); the weekly budget set after the pilot's
  first task. The runner's adapters copied into `.wingfoil/agents/custom/`; `docs/notices.md` with its markers. The
  systemd timer is written disabled; the approver alone enables it.
- **The runner's identity.** The runner stands in for the human executor until WingFoil's workflow engine runs the
  steps, so it gets an identity of its own in `team.members`, "WingFoil Benchmark Runner"
  (`runner@wingfoil-benchmark.invalid`, a reserved domain, so no real address is published), with the executor's
  roles (developer, reviewer, facilitator, product-owner) and **never `approver`**: the gates stay the approver's,
  ruled from the approver's terminal through `gate.mjs`. The agents it launches are credited by `Co-Authored-By`
  (their entries in `team.agents`). This supersedes "Agent identity: not adopted now" in the input below.
- **What stays by session:** campaign launches, every real-agent run, and the work before the pilot starts.

**The pilot** runs on W20, after this task is done. Its criteria are read when W20's last task is done and recorded
in [rel-v0.4](../release/rel-v0.4.md):

| | Exit: kept | Rollback |
|---|---|---|
| The methodology | every W20 task flowed through `work-item`; no state outside the machine; WIP never exceeded; every gate the approver's; no hand workaround beyond the recorded deviations; the suites green | revert of this task's merge; no element changes state (deviation 1) |
| The runner | at least three W20 tasks carried by the runner from `start` to `done`; no write to the main checkout outside its home; nothing spent; gates only by the approver through `gate.mjs` | the timer off and the steps run by a session again; the methodology stays |

**Tests.** Red first: the docs test that `.wingfoil/workflows.yaml` includes no workflow whose name a pack declares
twice, and that every custom workflow's steps exist; the traceability test unchanged (characterization); a test that
`config/runner.yaml` never allows a paid launch (`campaign-cycle`, `release`) and names no `approver` among the
runner's roles.

## Input: the engine way of working (2026-11-16)

Relayed by the WingFoil coordination session (WFCoord) on 2026-11-16 as the approver's decision on this repository's
answer about adopting WingFoil 0.3.x's workflow engine; confirmed by the approver in chat the same day.

1. task-152 stays a pure pin change (0.3.1 → 0.3.2); the way of working does not change with it.
2. The way of working is adopted at v0.4's release-planning through this task, when no v0.3 task is open, after every
   open element's state is mapped (bug-046), with a pilot on one wave whose exit and rollback criteria are written
   before it starts.
3. Points to settle here:
   - **Branches:** Memory verbs are committed on main and only `task/` branches exist, so main is the integration
     branch and the engine's instance records go there.
   - **Checker:** the independent read-only reviewer, `scripts/pre-review.sh` and the full suites before every
     in-review → approved are the checker; with tasks in parallel, a checkpoint check at each task's close
     (`git merge-tree` across the open lanes, the plan's timed duties).
   - **Agent identity:** not adopted now; the approver stays the author and the agent is credited by Co-Authored-By
     (the agent's email added to `dna.yaml`); the author-versus-trailer question waits for WingFoil's v0.4 ruling.
   - **Standing approvals:** one only, the kanban review's in-review → approved (green full suites at a named commit and
     a clean independent review), run by the approver. Spending stays a human choice: campaign approve-spend,
     real-agent checks, validation and dry-run consent never get a standing rule.
   - **Campaigns:** campaign-cycle may stay hand-run in the pilot; whether it becomes an engine instance is decided
     here.
   - **`paths.runs`:** a directory other than the runner's git-ignored `/runs/`, chosen before it is declared.
   - **Engine limits to plan around:** kanban-delivery runs once per instance (F-044, WingFoil bug-489); a new instance
     reads step evidence from the whole repository (F-043, WingFoil bug-488).
   - **From WingFoil's first wave on the engine:** measures from scripts reading git and transcripts, never hand
     registers (orchestration tokens beside the campaigns' costs); `workflow status` needs a filter or a known-noise
     list; on WingFoil 0.4 approvals refuse in an agent shell and verbs write the attribution trailers, so gated
     commands run from a human terminal and trailers are never amended by hand.

## Execution notes

<!-- What happened while building: deviations, blockers, follow-ups (filed as elements, never left
     here). For every `wingfoil` command: declared vs observed behaviour. -->
