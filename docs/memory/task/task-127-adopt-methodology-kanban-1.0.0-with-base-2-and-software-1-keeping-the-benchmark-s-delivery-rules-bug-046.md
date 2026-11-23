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
   composed type requires, filled for `rel-v0.4` by a first release line, `rl-1`. `delivery` is a custom copy whose
   `plan-release` moves the release draft → planning with a submit and planning → in-development with the approver's
   approval, instead of the pack's two submits, which a gated planning refuses.
3. **`work-item` is a custom copy with `kanban`'s steps** (`start`, `build`, `review`, `approve`, `done`), carrying
   `kanban-delivery` version 6's rules: `review` is the independent review with severities and re-review (dl-020),
   `scripts/pre-review.sh main` before every round; `approve` stays the approver's gate, on the full suites run at the
   commit offered for approval (dl-016; "the full suites before in-review" written here first was corrected in review
   round 2, since it is task-167's question, not v6's rule); `done` is the `--no-ff` merge, the bugs it fixes moved
   to `fixed` and the wave's "Ends with" recorded. The real-agent check becomes a manual step of the copy. A task's
   pending → backlog gate stays outside the flow, as in the pack. `kanban-delivery` is removed (the approver's
   choice 3), its record kept in git.
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

**The runner as governance** moves to a task of its own in W20 (the approver, 2026-11-23), started when the
external runner ships a version whose common files name no private project: at `runner-1.2.0`, a test file in its
manifest does, so it can be neither copied into this public repository nor packed in a campaign's harnesses (asked
of the runner's maintainers on 2026-11-23). That task holds what this Design first planned here:

- `config/runner.yaml`: one `trunk` line, its checkout and worktrees outside the main checkout (in a git-ignored
  `config/runner.local.yaml`); `launch.allow: [work-item]`; `launch.manual` naming `work-item.real-agent-check`, and
  never `campaign-cycle`, the release slot or any step that spends; `phases.integrate: [work-item.done]`;
  `integration.task_branch: task/{id}`, `merge: no-ff`; Claude as the reviewer too, in another session (the Codex
  subscription has ended); `paths.runs: [docs/runs/]`; the adapters, `docs/notices.md`, the runner's home and the
  line's clone; `--doctor` and `--dry-run` clean; the timer written disabled, enabled by the approver alone.
- **The runner's identity** (the approver's choice of 2026-11-23): an identity of its own, standing in for the human
  executor until WingFoil's workflow engine runs the steps. `runner-1.2.0` signs as the line's `agent`, its email read
  from `team.agents`, so the identity is a `team.agents` entry, "WingFoil Benchmark Runner"
  (`runner@wingfoil-benchmark.invalid`, a reserved domain), with `approval_authority: false` and named as the trunk
  line's agent: WingFoil refuses it every approval, and the gates stay the approver's, ruled from the approver's
  terminal through `gate.mjs`. The launched model is credited by `Co-Authored-By`. This supersedes "Agent identity:
  not adopted now" in the input below.

**The pilot** runs on W20, after this task is done. Its criteria are read when W20's last task is done and recorded
in [rel-v0.4](../release/rel-v0.4.md):

| | Exit: kept | Rollback |
|---|---|---|
| The methodology | every W20 task flowed through `work-item`; no state outside the machine; WIP never exceeded; every gate the approver's; no hand workaround beyond the recorded deviations; the suites green | revert of this task's merge; no element changes state (deviation 1) |
| The runner | at least three W20 tasks after its adoption task carried by the runner from `start` to `done`; no write to the main checkout outside its home; nothing spent; gates only by the approver through `gate.mjs` | the timer off and the steps run by a session again; the methodology stays |

**Tests.** Red first: a docs test that `.wingfoil/workflows.yaml` includes no two workflows of one name, that every
included file exists, and that no workflow names a state its element's machine lacks; the traceability test
unchanged (characterization).

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

**The composition** (wingfoil-templates at `549d787d`, in a scratchpad clone, after `npm ci && npm run build`):

```sh
npm run -s compose -- --tree . --out "$S/composed" \
  --param project_name="WingFoil Benchmark" --param approver_name="Roberto Pompermaier" \
  --param approver_email="robypomper@gmail.com" --param agent_name="Claude Code" \
  --param decision_log_path='docs/memory/decision-log/{id}.md' --param task_path='docs/memory/task/{id}.md' \
  --param plan_path='docs/plans/{id}.md' --param plan_id='plan-{n}-{slug}' \
  --param retrospective_path='docs/retrospective-inputs/' --param adr_path='docs/memory/adr/{id}.md' \
  --param bug_path='docs/memory/bug/{id}.md' --param tech_spec_path='docs/memory/tech-spec/{id}.md' \
  --param release_path='docs/memory/release/{id}.md' --param release_id='rel-{slug}' \
  --param release_line_path='docs/memory/release-line/{id}.md' --param release_line_id='rl-{n}' \
  --param inception_path='docs/01_vision/01_product-brief.md' --param wip_in_progress=1 --param wip_in_review=1 \
  software@1.0.0 methodology/kanban@1.0.0 base@2.0.1
```

Its output, 36 files, digest `fa7d1cfd8b86a6aa9e4bee41af878067fffce03cf6ba8ae7881496c03730b781`, from
`find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum` in the output directory. The six files under
`.wingfoil/workflows/built-in/` and the seven pack directives under `.wingfoil/directives/built-in/` are byte-identical
to it (`cmp`); every other difference is a deviation in [docs/pack-deviations.md](../../pack-deviations.md) (D1–D7).

**The key mapping** (no element's state renamed, D1):

| Old | New |
|---|---|
| `kanban-delivery` (v6) `plan` | outside the flow: the task's pending → backlog gate |
| `kanban-delivery` `design` | `work-item.start` |
| `kanban-delivery` `build`, `review` | `work-item.build`, `work-item.review` |
| `kanban-delivery`'s approval | `work-item.approve` |
| `kanban-delivery` `deliver` | `work-item.done` |
| `kanban-delivery` `real-agent-check` | `work-item.real-agent-check` (manual) |
| `release-cycle` `release-planning` | `delivery.plan-release` |
| `release-cycle` `delivery` | `release-flow.work` (each task through `work-item`) |
| `release-cycle` `calibration`, `validation`, `campaign`, `publishing` | `release-flow.release` → the `release` slot's steps |
| `release-cycle` `retrospective` | `release-flow.retrospective` → `retrospective` |
| `sw-life-cycle` `release-cycle`, `sunset` | `sw-life-cycle` `delivery`, `end-of-life` |
| plan-006: `workflow: release-cycle` | `workflow: sw-life-cycle`, `phase: delivery` |

**`wingfoil` commands, declared vs observed** (WingFoil 0.3.2; the configuration read at HEAD, so every check
followed a commit):

- `workflow list`, on the first trial copy with the packs' own machines: declared, the workflows listed; observed,
  exit 0 with 94 `W_MEMORY_INVALID_STATE` warnings (fixed and approved bugs, approved decision-logs and adrs, in
  states the packs' machines lack). That led to D1. On this branch: 11 workflows, no warning.
- `workflow list` with both the packs' and the custom `sw-life-cycle`, `bug-ingest`, `decision-log-ingest` and
  `adr-ingest`: `E_WORKFLOW_DUPLICATE_NAME`, as wingfoil-templates' bug-007 states; hence D7.
- `workflow status`, with plan-006 still naming `release-cycle`: `W_INSTANCE_WORKFLOW_UNKNOWN`; re-pointed to
  `sw-life-cycle` (`6abeaf2e`).
- `workflow adopt plan-006-release-v0.4 --step delivery.plan-release --element release:rel-v0.4 --reason …`: declared,
  rel-v0.4, added before this task, counted as the release the step creates; observed, an empty commit with the
  `WingFoil-Instance`, `WingFoil-Step` and `WingFoil-Adopted` trailers (`f83958f6`). The step still waited, with
  `W_PHASE_EXIT_STATE_UNDETERMINED`: the pack's two submits cannot leave a gated planning. The custom `delivery`
  (D2, `4f8038b2`) closed it.
- `workflow next` and `workflow status`, at `68a45970`: plan-006 on `sw-life-cycle`, phases inception and
  specification complete, delivery current; the frontier `work-item.build@task-127` and a `work-item.start` for each
  of the 16 other v0.4 tasks in backlog, task-177 included. The frontier lists the starts while the in-progress limit
  is full: in the trial copy, a second `memory submit` from backlog was refused at the limit, as the pack declares.
  The frontier itself does not apply the limit; noted for the pilot.

**Test, red first.** `test/unit/docs/workflows-config.test.ts` (`f3cf879c`) was written after the composition's
commit (`61a27b6a`), so its red was shown by mutation: with the composer's `end-of-life.yaml` copied over the custom
one, `names only states of the element machine it selects` failed on `in-discussion`; green with the custom copy. The
two checks added in review round 1 (`set_state`, an include's element) failed on a fallback set to `rework` and on
`release-flow`'s `work` iterated over `bug`, then passed once both were restored. The docs and traceability tests
unchanged and green.

**Acceptance criterion 1** still lists `kanban-delivery` "kept beside `work-item`": the approver's choice 3
(2026-11-23) removed it instead, its rules carried into `work-item` (D3). Criterion 4: the adopted versions are recorded
in [rel-v0.4](../release/rel-v0.4.md)'s Scope. Criterion 5: the frictions are
[F-048](../../wingfoil-feedback/F-048-the-frontier-lists-starts-the-wip-limit-refuses.md) (the frontier lists starts
the WIP limit refuses) and
[F-049](../../wingfoil-feedback/F-049-a-workflow-that-names-a-state-its-element-lacks-loads-with-no-diagnostic.md) (a
state the element lacks loads with no diagnostic), both reproduced in a throwaway clone; the pack's two submits from a
gated planning are this repository's deviation (D2), not a WingFoil defect.

**Slip, recorded.** task-162 to task-177 were submitted with `requirements: []`, and `required-lists.test.ts` went red
on main: the docs tests had run while the tasks were still drafts. Fixed on main in `a20c993d`, pushed with the
approver's consent. The lesson, for the review practice (task-167): rerun the docs tests after every Memory verb that
moves an element out of draft.

**After the merge** (on main, Memory verbs): `memory add --type release-line` for `rl-1` (v0.4's line, `version`
filled), `memory submit` to planning and the approver's `memory approve` to active; then `release-line: rl-1` on
`rel-v0.4`, needed before its submit to releasing, which refuses a missing required field. The pilot starts with the
next W20 task.

### Review

- **Round 1** (an independent read-only subagent, in a temporary clone; the main checkout's reflog unchanged after
  it). No blocker; seven should-fix and five nits, all fixed on the branch:
  - should-fix: `release.yaml`'s calibration `produces` used `{release}`, a field the release element lacks
    (WingFoil's `resolveTokens`), now `{version}`; `memory.yaml` lacked the packs' `not_applicable_allowed:
    [release]` on task, which the `kanban` directive relies on, `waiting: [active]` on plan, which `workflow end`
    needs, `amendable`, and `tech-spec`'s machine, all adopted and listed in D1; v6 rules missing from `work-item`
    (the post-fix checklist, the 1 200-line split, the nit quick check, the full suites' contents, the reviewer's
    tools, the lowest priority, the bug commit format, the real-agent check's record) restored; rules that are the
    practice since v0.3, not v6's, credited to task-167; `release-cycle`'s planning, validation and publishing rules
    restored in `delivery` and `release`, and D7's "nothing lost" corrected; criteria 4 and 5 met (above).
  - nits: the test widened to `set_state` and an include's element; `pack-deviations.md` names `workflows.yaml`,
    `dna.yaml`, the dropped `release-submit` and `release-publishing`, the retrospective's rewritten steps and
    end-of-life's source; stale references in plan-006, the README and `memory.yaml`; a long line in `delivery.yaml`;
    rl-1's gate in the steps above.
- **Round 2** (a second independent read-only subagent, on the fix diff `ea1cda30..8db5bd16`, in a temporary clone;
  the main checkout's reflog unchanged). Round 1's fixes confirmed (`{version}` resolves to `v0.4`; the adopted type
  properties valid, no element broken; `workflow list` with no diagnostic). Four should-fix and four nits, all fixed:
  - should-fix: the `wingfoil-cli` directive's W-07 (amend), W-08 (park) and W-17 (a plan closes by `submit`) were
    untrue once `amendable`, `returns` and plan's `waiting` were adopted, rewritten; F-049 overstated the gap
    (0.3.2 already warns on a `set_state` action and on a fallback's `set_state`), scoped to the `where` filter, and
    the test's header and `pack-deviations.md` say so; the Design's deviation 3 still put the full suites before
    in-review, corrected with a note.
  - nits: the `set_state` check reads a typed action's type (`bug.set_state(fixed)`), shown red on `resolved` and
    green on `fixed` by mutation; the real-agent check names the release's plan; the done step's "green again once
    every bug is fixed" restored; plan-006's completion names `workflow end`.
- **Round 3** (a third independent read-only subagent, on `8db5bd16..243fa012`, in a temporary clone; the main
  checkout's reflog unchanged). Round 2's fixes confirmed (W-07, W-08 and W-17 checked against 0.3.2's help and code).
  One should-fix and two nits, all fixed:
  - should-fix: F-049 still overstated 0.3.2: a typed `<type>.set_state` on a type the step does not bind is never
    checked (reproduced: `bug.set_state(resolved)` in a task step, empty `diagnostics`; `element.set_state(bogus)`,
    `W_PHASE_EXIT_STATE_UNDETERMINED`). F-049 now reports both gaps; the test header and `pack-deviations.md` say so.
  - nits: the `set_state` check reads a quoted state, takes the selection's type in a `where` phase, fails on a
    `set_state` it cannot read, and says it guards future actions (red on `"resolved"` and on two arguments, green on
    `"fixed"`, by mutation); `work-item`'s real-agent-check reflowed.
- **Round 4** (a fourth independent read-only subagent, on `243fa012..d6d6f557`, in a temporary clone; the main
  checkout's reflog unchanged). Round 3's fixes confirmed. One should-fix and three nits, all fixed:
  - should-fix: a third unchecked case, `element.set_state(<state>)` in a `where` phase that iterates nothing
    (reproduced on `end-of-life`'s `approve`: empty `diagnostics`), and a fallback's `set_state` compared only with
    the held gate's reject target: F-049 now states that 0.3.2 checks a `set_state`'s state only for an element the
    step binds or created, and `pack-deviations.md` and the test header say the same.
  - nits: the check resolves an untyped `set_state` as WingFoil does (the element a `memory.add` earlier in the phase
    created first), reads a `where` type given as a list, and no longer presents a bare `set_state(…)` as an action
    (it fails as unreadable). By mutation: red on `bogus` in a selection phase and on `pending` after
    `memory.add(type: release)`; green on `approved` and `planning`; red on `bug.set_state(resolved)`.
- **Round 5** (a fifth independent read-only subagent, on `d6d6f557..60f7c22e`, in a temporary clone; the main
  checkout's reflog unchanged). Two should-fix and two nits, about the same two places, fixed by narrowing them rather
  than by mirroring WingFoil's resolution further:
  - should-fix: F-049's general rule was still too broad (a typed `set_state` on an element created earlier in the
    same step is not checked either): F-049 now lists only the reproduced cases, with no general rule, and asks for
    every state a workflow names to be checked; `pack-deviations.md` and the test header follow.
  - should-fix: the `set_state` check failed valid future actions (a self-creating workflow's element; a
    `memory.add` with more arguments). An untyped `set_state` or a fallback's is now accepted if its state belongs to
    any type in the workflow's reach (its element, the types its `memory.add`s create, the types it selects); a typed
    one is checked against its type.
  - nits: the machines' states read as WingFoil's `machineStates` does (reject and return targets, `deprecated`);
    F-049's last paragraph reflowed.
  - By mutation: green on `element.set_state(approved)` in `decision-log-ingest`, `element.set_state(pending)` after
    `end-of-life`'s `memory.add`, `element.set_state(deprecated)` in `delivery`; red on `bug.set_state(resolved)`,
    `element.set_state(bogus)` in a selection step, `decision-log.set_state(bogus)`.
- **Round 6, the final review** (a sixth independent read-only subagent, on `60f7c22e..63e433cf`, in a temporary
  clone; the main checkout's reflog unchanged). F-049's cases, `states()` against WingFoil's `machineStates` and the
  `set_state` check reproduced and confirmed; no blocker, no should-fix. One nit, fixed in the comments only: the
  workflow's reach leaves out a parent's element through a plain include, where WingFoil itself warns
  `W_PHASE_ACTION_UNTARGETED`, so the check never fails a state WingFoil accepts without a diagnostic. The review
  closes.
- **Full suites** (`scripts/full-suites.sh`, 2026-11-23, at `bcea782c`, worktree clean): LINT 0, TEST 0, BUILD 0,
  BIN 0, DOCKER 0 (log `.cache/full-suites/2026-11-23/task_task-127-…-bcea782c-230441.txt` in the main checkout;
  157 test files, 2560 tests passed and 10 skipped; test:bin 22 passed; test:docker 22 passed and 2 skipped).
